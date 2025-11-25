import { Controller, Headers, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { StorageService } from "../services/storage.service";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { FfmpegService } from "@/core/modules/ffmpeg/services/ffmpeg.service";
import { StorageEventService } from "../events/storage.event";
import { FileService } from "@/core/modules/file/services/file.service";
import { storageContract } from "@repo/api-contracts";
import { FileRangeService } from "@/core/modules/file/index";
import { STORAGE_VIDEO_NAMESPACE } from "../constants";

@Controller()
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly ffmpegService: FfmpegService,
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
            const fileId = result.fileId;

            // Get video metadata for processing
            const videoResult = await this.storageService.getVideoByFileId(fileId);
            if (!videoResult?.videoMetadata) {
                throw new Error("Failed to retrieve video metadata after upload");
            }

            const videoMetadataId = videoResult.videoMetadata.id;
            const namespace = [...STORAGE_VIDEO_NAMESPACE];

            await this.storageService.updateVideoProcessingStatus(videoMetadataId, {
                isProcessed: false,
                processingProgress: 0,
            });

            // Start async video processing in background (non-blocking)
            this.storageEventService
                .startProcessing("videoProcessing", { fileId }, async ({ abortSignal, emit }) => {
                    try {
                        // 1. Get the file as a Web File from storage provider
                        const webFile = await this.fileService.getFileAsWebFile(fileId);
                        if (!webFile) {
                            throw new Error(`Failed to retrieve file ${fileId} from storage provider`);
                        }
                        const processingInput = { id: fileId, file: webFile };

                        // 2. Process the video with FFmpeg (namespace-based temp storage)
                        const processingResult = await this.videoProcessingService.processVideoFromFile(
                            processingInput,
                            namespace,
                            (progress, message) => {
                                emit({
                                    progress,
                                    message,
                                    timestamp: new Date().toISOString(),
                                });
                            },
                            abortSignal
                        );

                        // 3. Get the processed file stream from temp storage
                        const processedFileContent = await this.ffmpegService.getProcessedFile(fileId, namespace);

                        // 4. Convert stream to Web File
                        const chunks: Uint8Array[] = [];
                        for await (const chunk of processedFileContent.stream) {
                            chunks.push(chunk as Uint8Array);
                        }
                        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                        const buffer = new Uint8Array(totalLength);
                        let chunkOffset = 0;
                        for (const chunk of chunks) {
                            buffer.set(chunk, chunkOffset);
                            chunkOffset += chunk.length;
                        }
                        const processedWebFile = new File([buffer], webFile.name, {
                            type: 'video/mp4',
                        });

                        // 5. Replace the original file content in storage provider
                        await this.fileService.replaceFileContent(fileId, processedWebFile);

                        // 6. Update file metadata (size, mimeType) in database
                        await this.fileService.updateFileMetadata(fileId, {
                            size: processedWebFile.size,
                            mimeType: 'video/mp4',
                        });

                        // 7. Cleanup temp files
                        await this.ffmpegService.cleanup(fileId, namespace);

                        // 8. Update video processing status in database
                        await this.storageService.updateVideoProcessingStatus(videoMetadataId, {
                            isProcessed: true,
                            processingProgress: 100,
                            processingError: undefined,
                        });

                        // Emit final completion event with metadata
                        emit({
                            progress: 100,
                            message: "Processing complete",
                            metadata: {
                                duration: processingResult.metadata.duration,
                                width: processingResult.metadata.width,
                                height: processingResult.metadata.height,
                                codec: processingResult.metadata.codec,
                            },
                            timestamp: new Date().toISOString(),
                        });
                    } catch (error: unknown) {
                        const err = error instanceof Error ? error : new Error(String(error));

                        // Always cleanup temp files on error
                        await this.ffmpegService.cleanup(fileId, namespace).catch((cleanupErr: unknown) => {
                            this.logger.warn(`Failed to cleanup temp files for fileId ${fileId}: ${String(cleanupErr)}`);
                        });

                        // Check if this was an abort
                        if (abortSignal?.aborted || err.message.includes("aborted")) {
                            this.logger.warn(`Video processing aborted for video ${videoMetadataId} with fileId: ${fileId}: ${err.message}`);
                            return; // Don't mark as error in DB for aborts
                        }

                        await this.storageService.updateVideoProcessingStatus(videoMetadataId, {
                            isProcessed: false,
                            processingError: err.message,
                        });

                        this.logger.error(`Video processing failed for video ${videoMetadataId} with fileId: ${fileId}: ${err.message}`);
                    }
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

            // Check if file exists before attempting to read
            const fileExists = await this.fileService.fileExists(fileId);
            if (!fileExists) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Image file not found on filesystem",
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

            // Check if file exists before attempting to read
            const fileExists = await this.fileService.fileExists(fileId);
            if (!fileExists) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Audio file not found on filesystem",
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

            // Check if file exists before attempting to read
            const fileExists = await this.fileService.fileExists(fileId);
            if (!fileExists) {
                throw new ORPCError("NOT_FOUND", {
                    message: "File not found on filesystem",
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

            // Check if file exists before attempting to stream
            try {
                const fileExists = await this.fileService.fileExists(fileId);
                if (!fileExists) {
                    throw new ORPCError("NOT_FOUND", {
                        message: "Video file not found on filesystem",
                    });
                }
            } catch {
                // If error checking existence, also return 404
                throw new ORPCError("NOT_FOUND", {
                    message: "Video file not found on filesystem",
                });
            }

            return await this.fileRangeService.streamVideo(
                fileId,
                headers.range,
                { maxChunkSize: 5 * 1024 * 1024 } // 5MB chunks
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
            if (!result?.videoMetadata) {
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
