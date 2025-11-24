import { Controller, Headers, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { StorageService } from "../services/storage.service";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { StorageEventService } from "../events/storage.event";
import { FileService } from "@/core/modules/file/services/file.service";
import { storageContract } from "@repo/api-contracts";
import { FileRangeService } from "@/core/modules/file/index";

@Controller()
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly storageEventService: StorageEventService,
        private readonly fileRangeService: FileRangeService,
        private readonly fileService: FileService
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

                const uploadedBy = (context as { user?: { id: string } }).user?.id;

                // Use StorageService which delegates to core FileService
                const result = await this.storageService.uploadImage(file, uploadedBy);

                console.log("[StorageController] uploadImage successful:", {
                    originalFilename: file.name,
                    fileId: result.fileId,
                    size: result.size,
                    mimeType: result.mimeType,
                    filePath: `${result.namespace}/${result.storedFilename}`,
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

            const uploadedBy = (context as { user?: { id: string } }).user?.id;

            // Use StorageService which delegates to core FileService
            const result = await this.storageService.uploadVideo(file, uploadedBy);

            // Get video metadata for processing
            const videoResult = await this.storageService.getVideoByFileId(result.fileId);
            if (!videoResult?.videoMetadata) {
                throw new Error("Failed to retrieve video metadata after upload");
            }

            await this.storageService.updateVideoProcessingStatus(videoResult.videoMetadata.id, {
                isProcessed: false,
                processingProgress: 0,
            });

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
                            await this.storageService.updateVideoProcessingStatus(videoResult.videoMetadata.id, {
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
                                this.logger.warn(`Video processing aborted for video ${videoResult.videoMetadata.id} with fileId: ${result.fileId}: ${err.message}`);
                                return; // Don't mark as error in DB for aborts
                            }

                            await this.storageService.updateVideoProcessingStatus(videoResult.videoMetadata.id, {
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
                storedFilename: result.storedFilename,
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

            const uploadedBy = (context as { user?: { id: string } }).user?.id;

            // Use StorageService which delegates to core FileService
            const result = await this.storageService.uploadAudio(file, uploadedBy);

            console.log("[StorageController] uploadAudio successful:", {
                originalFilename: file.name,
                fileId: result.fileId,
                size: result.size,
                mimeType: result.mimeType,
                filePath: `${result.namespace}/${result.storedFilename}`,
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
            const result = await this.storageService.getImageByFileId(fileId);
            if (!result?.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Image not found",
                });
            }

            const image = result.file;

            if (!image.namespace || !image.storedFilename) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File metadata incomplete",
                });
            }

            // Get file stream from FileService (supports any storage provider)
            const { buffer } = await this.fileService.getFileBuffer(fileId);

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
            const result = await this.storageService.getAudioByFileId(fileId);
            if (!result?.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Audio not found",
                });
            }

            const audio = result.file;

            if (!audio.namespace || !audio.storedFilename) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File metadata incomplete",
                });
            }

            // Get file stream from FileService (supports any storage provider)
            const { buffer } = await this.fileService.getFileBuffer(fileId);

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
            const result = await this.storageService.getRawFileByFileId(fileId);
            if (!result?.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File not found",
                });
            }

            const rawFile = result.file;

            if (!rawFile.namespace || !rawFile.storedFilename) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File metadata incomplete",
                });
            }

            // Build path from namespace and storedFilename
            const { buffer } = await this.fileService.getFileBuffer(fileId);

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
    getVideo(@Headers() headers: Record<string, string>) {
        return implement(storageContract.getVideo).handler(async ({ input }) => {
            const { fileId } = input;

            // Get video with metadata from database
            const result = await this.storageService.getVideoByFileId(fileId);
            if (!result?.file) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            const video = result.file;

            if (!video.namespace || !video.storedFilename) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File metadata incomplete",
                });
            }

            console.log("[DEBUG getVideo] Database query result:", {
                fileId,
                namespace: video.namespace,
                storedFilename: video.storedFilename,
                filename: video.filename,
            });

            return await this.fileRangeService.streamVideo(
                fileId,
                headers.range,
                { maxChunkSize: 512000 } // 500KB chunks
            );
        });
    }

    @Implement(storageContract.getImageData)
    getImageData() {
        return implement(storageContract.getImageData).handler(async ({ input }) => {
            const { fileId } = input;

            // TODO: Implement getImageData - return image metadata
            await this.storageService.getImageByFileId(fileId);

            return {};
        });
    }

    @Implement(storageContract.getAudioData)
    getAudioData() {
        return implement(storageContract.getAudioData).handler(async ({ input }) => {
            const { fileId } = input;

            // TODO: Implement getAudioData - return audio metadata
            await this.storageService.getAudioByFileId(fileId);

            return {};
        });
    }

    @Implement(storageContract.getRawFileData)
    getRawFileData() {
        return implement(storageContract.getRawFileData).handler(async ({ input }) => {
            const { fileId } = input;

            // TODO: Implement getRawFileData - return file metadata
            await this.storageService.getRawFileByFileId(fileId);

            return {};
        });
    }

    @Implement(storageContract.getVideoData)
    getVideoData() {
        return implement(storageContract.getVideoData).handler(async ({ input }) => {
            const { fileId } = input;

            const result = await this.storageService.getVideoByFileId(fileId);
            if (!result) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Video not found",
                });
            }

            return {
                isProcessed: result.videoMetadata.isProcessed,
            };
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
        const storageService = this.storageService;
        return implement(storageContract.subscribeVideoProcessing).handler(async function* ({ input }) {
            const { fileId } = input;

            // Get current video processing state
            const result = await storageService.getVideoByFileId(fileId);
            if (!result?.file) {
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
