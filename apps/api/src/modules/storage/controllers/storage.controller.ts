import { Controller, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { StorageService } from "../services/storage.service";
import { FileMetadataService } from "../services/file-metadata.service";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { StorageEventService } from "../events/storage.event";
import { FfmpegService } from "@/core/modules/ffmpeg/services/ffmpeg.service";
import { FileUploadService } from "@/core/modules/file-upload/file-upload.service";
import { storageContract } from "@repo/api-contracts";
import { join } from "path";
import { UPLOADS_DIR } from "@/config/multer.config";
import { readFile } from "fs/promises";

@Controller()
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly fileMetadataService: FileMetadataService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly storageEventService: StorageEventService,
        private readonly ffmpegService: FfmpegService,
        private readonly fileUploadService: FileUploadService
    ) {}

    /**
     * Upload image endpoint - implements ORPC contract with file upload
     * File.name contains the server-generated filename from multer
     */
    @Implement(storageContract.uploadImage)
    uploadImage() {
        return implement(storageContract.uploadImage).handler(async ({ input, context }) => {
            try {
                console.log("[StorageController] uploadImage handler called");
                
                const file: File = input;

                console.log("[StorageController] File info:", {
                    serverFilename: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                });

                // Get full path from FileUploadService using file properties
                const absoluteFilePath = this.fileUploadService.getFilePath(file.name, file.type);
                const relativePath = this.fileUploadService.getRelativePath(file.type, file.name);

                // Insert into database via service
                const dbResult = await this.fileMetadataService.createImageFile({
                    filePath: relativePath,
                    absoluteFilePath,
                    filename: file.name,
                    storedFilename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    uploadedBy: (context as { user?: { id: string } }).user?.id,
                });

                console.log("[StorageController] uploadImage successful:", {
                    serverFilename: file.name,
                    size: file.size,
                    mimeType: file.type,
                    dbFileId: dbResult.file.id,
                });

                return {
                    filename: file.name,
                    path: `/storage/files/${file.name}`,
                    size: file.size,
                    mimeType: file.type,
                };
            } catch (error) {
                console.error("[StorageController] Error in uploadImage:", error);
                throw error;
            }
        });
    }

    /**
     * Upload video endpoint - implements ORPC contract with file upload
     * File.name contains the server-generated filename from multer
     */
    @Implement(storageContract.uploadVideo)
    uploadVideo() {
        return implement(storageContract.uploadVideo).handler(async ({ input, context }) => {
            const file: File = input;

            // File properties from multer
            const finalFilename = file.name;
            const finalMimeType = file.type;
            const finalSize = file.size;

            // Get full path from FileUploadService using file properties
            const finalFilePath = this.fileUploadService.getFilePath(finalFilename, finalMimeType);
            const relativePath = this.fileUploadService.getRelativePath(finalMimeType, finalFilename);

            // Insert into database via service (service will extract metadata and use repository)
            const dbResult = await this.fileMetadataService.createVideoFile({
                filePath: relativePath,
                absoluteFilePath: finalFilePath,
                filename: file.name,
                storedFilename: finalFilename,
                mimeType: finalMimeType,
                size: finalSize,
                uploadedBy: (context as { user?: { id: string } }).user?.id,
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
                            await this.fileMetadataService.updateVideoProcessingStatus(dbResult.videoMetadata.id, {
                                isProcessed: true,
                                processingProgress: 100,
                                processingError: undefined,
                            });

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
                                this.logger.warn(`Video processing aborted for video ${dbResult.videoMetadata.id}: ${err.message}`);
                                return; // Don't mark as error in DB for aborts
                            }

                            // FAILURE: Update database with error
                            await this.fileMetadataService.updateVideoProcessingStatus(dbResult.videoMetadata.id, {
                                isProcessed: false,
                                processingError: err.message,
                            });

                            this.logger.error(`Video processing failed for video ${dbResult.videoMetadata.id}: ${err.message}`);

                            // Throw error to propagate to subscriber
                            throw err;
                        });
                })
                .catch((error: unknown) => {
                    const err = error instanceof Error ? error : new Error(String(error));
                    this.logger.error(`Event processing wrapper failed: ${err.message}`);
                });

            console.log("[StorageController] uploadVideo successful:", {
                serverFilename: finalFilename,
                size: finalSize,
                mimeType: finalMimeType,
                dbFileId: dbResult.file.id,
                videoMetadataId: dbResult.videoMetadata.id,
                processingStarted: true,
            });

            return {
                filename: finalFilename,
                path: `/storage/files/${finalFilename}`,
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
     * File.name contains the server-generated filename from multer
     */
    @Implement(storageContract.uploadAudio)
    uploadAudio() {
        return implement(storageContract.uploadAudio).handler(async ({ input, context }) => {
            const file: File = input;

            // Get full path from FileUploadService using file properties
            const absoluteFilePath = this.fileUploadService.getFilePath(file.name, file.type);
            const relativePath = this.fileUploadService.getRelativePath(file.type, file.name);

            // Insert into database via service
            const dbResult = await this.fileMetadataService.createAudioFile({
                filePath: relativePath,
                absoluteFilePath,
                filename: file.name,
                storedFilename: file.name,
                mimeType: file.type,
                size: file.size,
                uploadedBy: (context as { user?: { id: string } }).user?.id,
            });

            console.log("[StorageController] uploadAudio successful:", {
                serverFilename: file.name,
                size: file.size,
                mimeType: file.type,
                dbFileId: dbResult.file.id,
            });

            return {
                filename: file.name,
                path: `/storage/files/${file.name}`,
                size: file.size,
                mimeType: file.type,
            };
        });
    }

    /**
     * Serve file endpoint - implements ORPC contract
     */
    @Implement(storageContract.getFile)
    getFile() {
        return implement(storageContract.getFile).handler(async ({ input }) => {
            const { filename } = input;

            console.log("[StorageController] getFile called with filename:", filename);

            // Check if file exists
            const exists = await this.storageService.fileExists(filename);
            console.log("[StorageController] File exists check result:", exists);

            if (!exists) {
                console.log("[StorageController] Throwing ORPCError for:", filename);
                throw new ORPCError("NOT_FOUND", {
                    message: "File not found",
                });
            }

            // Read file and metadata
            const filePath = this.storageService.getFilePath(filename);
            const [buffer, metadata] = await Promise.all([readFile(filePath), this.storageService.getFileMetadata(filename)]);

            console.log("[StorageController] File read successfully:", filename);

            return new File([buffer], filename, { type: metadata.mimeType });
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
            if (!result?.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            const video = result.file;

            // Get absolute path and read file
            const videoPath = join(UPLOADS_DIR, video.filePath);
            const buffer = await readFile(videoPath);

            // Return as File object
            return new File([buffer], video.filename, {
                type: video.mimeType,
            });
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

            // Get current video processing state
            const result = await fileMetadataService.getVideoByFileId(fileId);
            if (!result?.file || !result.videoMetadata) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            const videoMetadata = result.videoMetadata;

            // If already failed, throw error immediately
            if (videoMetadata.processingError) {
                throw new Error(videoMetadata.processingError);
            }

            // If already processed, just return (no events to stream)
            if (videoMetadata.isProcessed) {
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
