import { Controller, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { StorageService } from "../services/storage.service";
import { FileMetadataService } from "../services/file-metadata.service";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { StorageEventService } from "../events/storage.event";
import { FfmpegService } from "@/core/modules/ffmpeg/services/ffmpeg.service";
import { storageContract } from "@repo/api-contracts";
import { join } from "path";
import { UPLOADS_DIR } from "@/config/storage.config";
import { readFile } from "fs/promises";

@Controller()
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly fileMetadataService: FileMetadataService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly storageEventService: StorageEventService,
        private readonly ffmpegService: FfmpegService
    ) {}

    /**
     * Upload image endpoint - implements ORPC contract with file upload
     * Uses proper layered architecture: Controller → Service → Repository → DatabaseService
     */
    @Implement(storageContract.uploadImage)
    uploadImage() {
        return implement(storageContract.uploadImage).handler(async ({ input, context }) => {
            try {
                console.log("[StorageController] uploadImage handler called");
                
                const { file } = input;

                console.log("[StorageController] File info:", {
                    originalFilename: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                });

                // Feature-based organization for generic storage uploads
                const feature = 'storage';
                const uploadedBy = (context as { user?: { id: string } }).user?.id;
                
                // Use file-metadata service which orchestrates:
                // 1. Create DB record via repository (get fileId)
                // 2. Save file via storage service with fileId as filename
                // 3. Update DB record with actual paths
                const result = await this.fileMetadataService.uploadImage(
                    file,
                    feature,
                    uploadedBy
                );

                console.log("[StorageController] uploadImage successful:", {
                    originalFilename: file.name,
                    fileId: result.fileId,
                    size: result.size,
                    mimeType: result.mimeType,
                    filePath: result.filePath,
                });

                return {
                    filename: result.filename,
                    size: result.size,
                    mimeType: result.mimeType,
                    fileId: result.fileId,
                };
            } catch (error) {
                console.error("[StorageController] Error in uploadImage:", error);
                throw error;
            }
        });
    }

    /**
     * Upload video endpoint - implements ORPC contract with file upload
     * Uses proper layered architecture: Controller → Service → Repository → DatabaseService
     * Also starts video processing in the background
     */
    @Implement(storageContract.uploadVideo)
    uploadVideo() {
        return implement(storageContract.uploadVideo).handler(async ({ input, context }) => {
            const { file } = input;
            
            // Feature-based organization for generic storage uploads
            const feature = 'storage';
            const uploadedBy = (context as { user?: { id: string } }).user?.id;
            
            // Use file-metadata service which orchestrates:
            // 1. Create DB record via repository (get fileId)
            // 2. Save file via storage service with fileId as filename
            // 3. Update DB record with actual paths
            const result = await this.fileMetadataService.uploadVideo(
                file,
                feature,
                uploadedBy
            );
            
            // Get video metadata for processing
            const videoResult = await this.fileMetadataService.getVideoByFileId(result.fileId);
            if (!videoResult?.videoMetadata) {
                throw new Error('Failed to retrieve video metadata after upload');
            }

            // Mark processing as started in database
            await this.fileMetadataService.updateVideoProcessingStatus(
                videoResult.videoMetadata.id,
                {
                    isProcessed: false,
                    processingProgress: 0,
                    processingStartedAt: new Date(),
                }
            );

            // Start async video processing in background (non-blocking)
            this.storageEventService
                .startProcessing("videoProcessing", { fileId: result.fileId }, ({ abortSignal, emit }) => {
                    return this.videoProcessingService
                        .processVideo(
                            result.absolutePath,
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
                                videoResult.videoMetadata.id,
                                {
                                    isProcessed: true,
                                    processingProgress: 100,
                                    processingError: undefined,
                                },
                                result.fileId,
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
                                this.logger.warn(`Video processing aborted for video ${videoResult.videoMetadata.id} with fileId: ${result.fileId}: ${err.message}`);
                                return; // Don't mark as error in DB for aborts
                            }

                            // FAILURE: Update database with error
                            await this.fileMetadataService.updateVideoProcessingStatus(videoResult.videoMetadata.id, {
                                isProcessed: false,
                                processingError: err.message,
                            });

                            this.logger.error(`Video processing failed for video ${videoResult.videoMetadata.id} with fileId: ${result.fileId}: ${err.message}`);

                            // Throw error to propagate to subscriber
                            throw err;
                        });
                })
                .catch((error: unknown) => {
                    const err = error instanceof Error ? error : new Error(String(error));
                    this.logger.error(`Event processing wrapper failed: ${err.message}`);
                });

            console.log("[StorageController] uploadVideo successful:", {
                originalFilename: file.name,
                storedFilename: result.filePath,
                size: file.size,
                mimeType: file.type,
                fileId: result.fileId,
                videoMetadataId: videoResult.videoMetadata.id,
                processingStarted: true,
            });

            return {
                filename: result.filename,
                size: file.size,
                mimeType: file.type,
                fileId: result.fileId,
                videoId: videoResult.videoMetadata.id,
                isProcessed: false,
                message: "Video uploaded. Processing started. Subscribe to events for progress updates.",
            };
        });
    }

    /**
     * Upload audio endpoint - implements ORPC contract with file upload
     * Uses proper layered architecture: Controller → Service → Repository → DatabaseService
     */
    @Implement(storageContract.uploadAudio)
    uploadAudio() {
        return implement(storageContract.uploadAudio).handler(async ({ input, context }) => {
            const { file } = input;
            
            // Feature-based organization for generic storage uploads
            const feature = 'storage';
            const uploadedBy = (context as { user?: { id: string } }).user?.id;
            
            // Use file-metadata service which orchestrates:
            // 1. Create DB record via repository (get fileId)
            // 2. Save file via storage service with fileId as filename
            // 3. Update DB record with actual paths
            const result = await this.fileMetadataService.uploadAudio(
                file,
                feature,
                uploadedBy
            );

            console.log("[StorageController] uploadAudio successful:", {
                originalFilename: file.name,
                fileId: result.fileId,
                size: result.size,
                mimeType: result.mimeType,
                filePath: result.filePath,
            });

            return {
                filename: result.filename,
                size: result.size,
                mimeType: result.mimeType,
                fileId: result.fileId,
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
            const imagePath = join(UPLOADS_DIR, image.filePath);
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
            const audioPath = join(UPLOADS_DIR, audio.filePath);
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
            const rawFilePath = join(UPLOADS_DIR, rawFile.filePath);
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
            if (!result?.file) {
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
            const videoPath = join(UPLOADS_DIR, video.filePath);
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

            // Get current video processing state
            const result = await fileMetadataService.getVideoByFileId(fileId);
            if (!result?.file || !result.videoMetadata) {
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
