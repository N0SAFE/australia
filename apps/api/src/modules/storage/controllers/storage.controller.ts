import { Controller, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { StorageService } from "../services/storage.service";
import { FileMetadataService } from "../services/file-metadata.service";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { StorageEventService } from "../events/storage.event";
import { FfmpegService } from "@/core/modules/ffmpeg/services/ffmpeg.service";
import { FileStorageService } from "@/core/modules/file-storage/file-storage.service";
import { storageContract } from "@repo/api-contracts";
import { readFile, stat } from "fs/promises";

@Controller()
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly fileMetadataService: FileMetadataService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly storageEventService: StorageEventService,
        private readonly ffmpegService: FfmpegService,
        private readonly fileStorageService: FileStorageService
    ) {}

    /**
     * Upload image endpoint - implements ORPC contract with file upload
     * File is parsed by FileUploadMiddleware:
     * - input.file: Web API File object (for ORPC validation)
     * - input._multerFiles.file: Multer metadata (for server-generated filename)
     */
    @Implement(storageContract.uploadImage)
    uploadImage() {
        return implement(storageContract.uploadImage).handler(async ({ input, context }) => {
            try {
                console.log("[StorageController] uploadImage handler called");
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                console.log("[StorageController] Raw input keys:", Object.keys(input as any));
                console.log("[StorageController] input.file type:", typeof input.file);
                console.log("[StorageController] input.file constructor:", input.file.constructor.name);
                console.log("[StorageController] input.file instanceof File:", input.file instanceof File);

                // Get Multer file metadata for server-generated filename
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;

                console.log("[StorageController] File info:", {
                    hasInputFile: !!input.file,
                    inputFileName: input.file.name,
                    inputFileSize: input.file.size,
                    hasMulterMetadata: !!multerMetadata,
                    serverFilename: multerMetadata?.filename,
                });

                if (!multerMetadata) {
                    console.error("[StorageController] NO MULTER METADATA!");
                    throw new ORPCError("BAD_REQUEST", {
                        message: "No file metadata found",
                    });
                }

                // Build file paths
                const relativePath = this.fileMetadataService.buildRelativePath(input.file.type, multerMetadata.filename);
                const absoluteFilePath = multerMetadata.path;

                // Insert into database via service (service will extract metadata and use repository)
                const dbResult = await this.fileMetadataService.createImageFile({
                    filePath: relativePath,
                    absoluteFilePath,
                    filename: input.file.name,
                    storedFilename: multerMetadata.filename,
                    mimeType: input.file.type,
                    size: input.file.size,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    uploadedBy: context.user?.id,
                });

                console.log("[StorageController] uploadImage successful:", {
                    originalName: input.file.name,
                    serverFilename: multerMetadata.filename,
                    size: input.file.size,
                    mimeType: input.file.type,
                    dbFileId: dbResult.file.id,
                });

                return {
                    filename: multerMetadata.filename,
                    size: input.file.size,
                    mimeType: input.file.type,
                    fileId: dbResult.file.id,
                };
            } catch (error) {
                console.error("[StorageController] Error in uploadImage:", error);
                throw error;
            }
        });
    }

    /**
     * Upload video endpoint - implements ORPC contract with file upload
     * File is parsed by FileUploadMiddleware:
     * - input.file: Web API File object (for ORPC validation)
     * - input._multerFiles.file: Multer metadata (for server-generated filename)
     */
    @Implement(storageContract.uploadVideo)
    uploadVideo() {
        return implement(storageContract.uploadVideo).handler(async ({ input, context }) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;

            if (!input.file || !multerMetadata) {
                throw new ORPCError("BAD_REQUEST", {
                    message: "No file uploaded",
                });
            }

            // Convert video to H.264 format BEFORE saving to database
            // This ensures all videos are in a consistent format for processing
            const finalFilePath = multerMetadata.path;
            const finalFilename = multerMetadata.filename;
            const finalMimeType = multerMetadata.mimetype;
            const finalSize = multerMetadata.size;

            // Build file paths using the final (possibly converted) filename
            const relativePath = this.fileMetadataService.buildRelativePath(finalMimeType, finalFilename);

            // Insert into database via service (service will extract metadata and use repository)
            const dbResult = await this.fileMetadataService.createVideoFile({
                filePath: relativePath,
                absoluteFilePath: finalFilePath,
                filename: input.file.name,
                storedFilename: finalFilename,
                mimeType: finalMimeType,
                size: finalSize,
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
                uploadedBy: context.user?.id,
            });

            // Start async video processing in background (non-blocking)
            this.storageEventService
                .startProcessing("videoProcessing", { fileId: dbResult.file.id }, ({ abortSignal, emit }) => {
                    return this.videoProcessingService
                        .processVideo(
                            finalFilePath,
                            (progress, message) => {
                                emit({
                                    progress,
                                    message,
                                    timestamp: new Date().toISOString(),
                                });
                            },
                            abortSignal
                        )
                        .then(async (metadata) => {
                            // SUCCESS: Update database to mark as processed
                            // If video was converted, newFilePath will be set and we need to update the file path in DB
                            await this.fileMetadataService.updateVideoProcessingStatus(
                                dbResult.videoMetadata.id,
                                {
                                    isProcessed: true,
                                    processingProgress: 100,
                                    processingError: undefined,
                                },
                                dbResult.file.id,
                                metadata.newFilePath // Update file path if video was converted
                            );

                            // Emit final completion event with metadata
                            emit({
                                progress: 100,
                                message: "Processing complete",
                                metadata: {
                                    duration: metadata.duration,
                                    width: metadata.width,
                                    height: metadata.height,
                                    codec: metadata.codec,
                                },
                                timestamp: new Date().toISOString(),
                            });
                        })
                        .catch(async (error: unknown) => {
                            const err = error instanceof Error ? error : new Error(String(error));

                            // Check if this was an abort
                            if (abortSignal?.aborted || err.message.includes("aborted")) {
                                this.logger.warn(`Video processing aborted for video ${dbResult.videoMetadata.id} with fileId: ${dbResult.file.id}: ${err.message}`);
                                return; // Don't mark as error in DB for aborts
                            }

                            // FAILURE: Update database with error
                            await this.fileMetadataService.updateVideoProcessingStatus(dbResult.videoMetadata.id, {
                                isProcessed: false,
                                processingError: err.message,
                            });

                            this.logger.error(`Video processing failed for video ${dbResult.videoMetadata.id} with fileId: ${dbResult.file.id}: ${err.message}`);

                            // Throw error to propagate to subscriber
                            throw err;
                        });
                })
                .catch((error: unknown) => {
                    const err = error instanceof Error ? error : new Error(String(error));
                    this.logger.error(`Event processing wrapper failed: ${err.message}`);
                });

            console.log("[StorageController] uploadVideo successful:", {
                originalName: input.file.name,
                serverFilename: finalFilename,
                size: finalSize,
                mimeType: finalMimeType,
                dbFileId: dbResult.file.id,
                videoMetadataId: dbResult.videoMetadata.id,
                processingStarted: true,
            });

            return {
                filename: finalFilename,
                size: finalSize,
                mimeType: finalMimeType,
                fileId: dbResult.file.id,
                videoId: dbResult.videoMetadata.id,
                isProcessed: false,
                message: "Video uploaded. Processing started. Subscribe to events for progress updates.",
            };
        });
    }

    /**
     * Upload audio endpoint - implements ORPC contract with file upload
     * File is parsed by FileUploadMiddleware:
     * - input.file: Web API File object (for ORPC validation)
     * - input._multerFiles.file: Multer metadata (for server-generated filename)
     */
    @Implement(storageContract.uploadAudio)
    uploadAudio() {
        return implement(storageContract.uploadAudio).handler(async ({ input, context }) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;

            if (!input.file || !multerMetadata) {
                throw new ORPCError("BAD_REQUEST", {
                    message: "No file uploaded",
                });
            }

            // Build file paths
            const relativePath = this.fileMetadataService.buildRelativePath(input.file.type, multerMetadata.filename);
            const absoluteFilePath = multerMetadata.path;

            // Insert into database via service (service will extract metadata and use repository)
            const dbResult = await this.fileMetadataService.createAudioFile({
                filePath: relativePath,
                absoluteFilePath,
                filename: input.file.name,
                storedFilename: multerMetadata.filename,
                mimeType: input.file.type,
                size: input.file.size,
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
                uploadedBy: context.user?.id as string | undefined,
            });

            console.log("[StorageController] uploadAudio successful:", {
                originalName: input.file.name,
                serverFilename: multerMetadata.filename,
                size: input.file.size,
                mimeType: input.file.type,
                dbFileId: dbResult.file.id,
            });

            return {
                filename: multerMetadata.filename,
                size: input.file.size,
                mimeType: input.file.type,
                fileId: dbResult.file.id,
            };
        });
    }

    /**
     * Get image file by ID
     */
    @Implement(storageContract.getImage)
    getImage() {
        return implement(storageContract.getImage).handler(async ({ input }) => {
            const { fileId } = input;

            // Get image with metadata from database
            const result = await this.fileMetadataService.getImageByFileId(fileId);
            if (!result || !result.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Image not found",
                });
            }

            const image = result.file;

            // Get absolute path and read file
            const imagePath = this.fileStorageService.getAbsolutePath(image.filePath);
            const buffer = await readFile(imagePath);

            // Return as File object
            return new File([buffer], image.filename, {
                type: image.mimeType,
            });
        });
    }

    /**
     * Get audio file by ID
     */
    @Implement(storageContract.getAudio)
    getAudio() {
        return implement(storageContract.getAudio).handler(async ({ input }) => {
            const { fileId } = input;

            // Get audio with metadata from database
            const result = await this.fileMetadataService.getAudioByFileId(fileId);
            if (!result || !result.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Audio not found",
                });
            }

            const audio = result.file;

            // Get absolute path and read file
            const audioPath = this.fileStorageService.getAbsolutePath(audio.filePath);
            const buffer = await readFile(audioPath);

            // Return as File object
            return new File([buffer], audio.filename, {
                type: audio.mimeType,
            });
        });
    }

    /**
     * Get raw file by ID
     */
    @Implement(storageContract.getRawFile)
    getRawFile() {
        return implement(storageContract.getRawFile).handler(async ({ input }) => {
            const { fileId } = input;

            // Get raw file with metadata from database
            const result = await this.fileMetadataService.getRawFileByFileId(fileId);
            if (!result || !result.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File not found",
                });
            }

            const rawFile = result.file;

            // Get absolute path and read file
            const rawFilePath = this.fileStorageService.getAbsolutePath(rawFile.filePath);
            const buffer = await readFile(rawFilePath);

            // Return as File object
            return new File([buffer], rawFile.filename, {
                type: rawFile.mimeType,
            });
        });
    }

    /**
     * Get video file by ID
     */
    @Implement(storageContract.getVideo)
    getVideo() {
        return implement(storageContract.getVideo).handler(async ({ input }) => {
            const { fileId } = input;

            // Get video with metadata from database
            const result = await this.fileMetadataService.getVideoByFileId(fileId);
            if (!result || !result.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            const video = result.file;
            
            console.log('[DEBUG getVideo] Database query result:', {
                fileId,
                filePath: video.filePath,
                storedFilename: video.storedFilename,
                filename: video.filename,
            });

            // Get absolute path and read file
            const videoPath = this.fileStorageService.getAbsolutePath(video.filePath);
            const buffer = await readFile(videoPath);

            // Return as File object
            return new File([buffer], video.filename, {
                type: video.mimeType,
            });
        });
    }

    @Implement(storageContract.getImageData)
    getImageData() {
        return implement(storageContract.getImageData).handler(async ({ input }) => {
            const { fileId } = input;
            
            const result = await this.fileMetadataService.getImageByFileId(fileId)
            
            return {}
        });
    }
    
    @Implement(storageContract.getAudioData)
    getAudioData() {
        return implement(storageContract.getAudioData).handler(async ({ input }) => {
            const { fileId } = input;
            
            const result = await this.fileMetadataService.getImageByFileId(fileId)
            
            return {}
        });
    }
    
    @Implement(storageContract.getRawFileData)
    getRawFileData() {
        return implement(storageContract.getRawFileData).handler(async ({ input }) => {
            const { fileId } = input;
            
            const result = await this.fileMetadataService.getImageByFileId(fileId)
            
            return {}
        });
    }
    
    @Implement(storageContract.getVideoData)
    getVideoData() {
        return implement(storageContract.getVideoData).handler(async ({ input }) => {
            const { fileId } = input;
            
            const result = await this.fileMetadataService.getVideoByFileId(fileId)
            if (!result) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }
            
            return {
                isProcessed: result.videoMetadata?.isProcessed ?? true
            }
        });
    }

    /**
     * Subscribe to video processing events
     *
     * Implements ORPC event iterator for real-time SSE updates
     * Client receives processing progress as events are emitted
     */
    @Implement(storageContract.subscribeVideoProcessing)
    subscribeVideoProcessing() {
        const storageEventService = this.storageEventService;
        const fileMetadataService = this.fileMetadataService;
        return implement(storageContract.subscribeVideoProcessing).handler(async function* ({ input }) {
            const { fileId } = input;

            console.log(fileId);

            // Get current video processing state
            const result = await fileMetadataService.getVideoByFileId(fileId);
            if (!result || !result.file || !result.videoMetadata) {
                console.log("not found");
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            console.log("result", result);

            const videoMetadata = result.videoMetadata;

            // If already failed, throw error immediately
            if (videoMetadata.processingError) {
                console.log("error");
                throw new Error(videoMetadata.processingError);
            }

            // If already processed, just return (no events to stream)
            if (videoMetadata.isProcessed) {
                console.log("completed");
                return;
            }

            // Yield initial state
            yield {
                progress: videoMetadata.processingProgress ?? 0,
                message: "Processing video...",
                timestamp: new Date().toISOString(),
            };

            // Subscribe to video processing events
            const subscription = storageEventService.subscribe("videoProcessing", { fileId });

            // Yield events as they arrive - completion detected by iterator end
            for await (const event of subscription) {
                yield {
                    progress: event.progress,
                    message: event.message || "",
                    metadata: event.metadata,
                    timestamp: event.timestamp,
                };
            }
        });
    }
}
