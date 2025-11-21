import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PresentationRepository, type PresentationVideoRecord } from "../repositories/presentation.repository";
import { FileUploadService } from "@/core/modules/file-upload/file-upload.service";
import { StorageService } from "@/modules/storage/services/storage.service";
import { join } from "path";
import { UPLOADS_DIR } from "@/config/multer.config";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { PresentationEventService } from "../events/presentation.event";

@Injectable()
export class PresentationService {
    private readonly logger = new Logger(PresentationService.name);

    constructor(
        private readonly presentationRepository: PresentationRepository,
        private readonly fileUploadService: FileUploadService,
        private readonly storageService: StorageService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly presentationEventService: PresentationEventService
    ) {}

    /**
     * Upload or replace presentation video
     */
    async uploadVideo(file: Express.Multer.File): Promise<PresentationVideoRecord & { url: string }> {
        // Determine subdirectory based on mimetype
        let subdir = 'videos';
        if (file.mimetype.startsWith('video/')) {
            subdir = 'videos';
        } else if (file.mimetype.startsWith('audio/')) {
            subdir = 'audio';
        }

        // Build file data
        const fileData = {
            url: `/uploads/${subdir}/${file.filename}`,
            filePath: `${subdir}/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
        };

        // Get current video to delete old file
        const currentVideo = await this.presentationRepository.findCurrent();

        // Delete old file if exists
        if (currentVideo?.filePath) {
            try {
                await this.storageService.deleteFile(currentVideo.filePath);
            } catch (error) {
                // Ignore deletion errors - continue with upload
                console.warn("Failed to delete old presentation video:", error);
            }
        }

        // Save to database (without processing - processing will be triggered but not awaited)
        const video = await this.presentationRepository.upsert({
            filePath: fileData.filePath,
            filename: fileData.filename,
            mimeType: fileData.mimetype,
            size: fileData.size,
            isProcessed: false,
            processingProgress: 0,
            processingError: null,
        });

        // Trigger async video processing (non-blocking) - return immediately
        // Get absolute file path
        const absolutePath = this.fileUploadService.getFilePath(fileData.filename, fileData.mimetype);

        // Start processing in background with abort strategy (don't await)
        this.presentationEventService
            .startProcessing("videoProcessing", { videoId: "singleton" }, ({ abortSignal, emit }) => {
                // Call video processing service and handle result with .then()
                return this.videoProcessingService
                    .processVideo(
                        absolutePath,
                        (progress, message) => {
                            // Emit progress updates using the emit helper
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
                        await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                            isProcessed: true,
                            processingProgress: 100,
                            processingError: null,
                        });

                        console.log("metadata", metadata);

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

                        return;
                    })
                    .catch(async (error: unknown) => {
                        const err = error instanceof Error ? error : new Error(String(error));

                        // Check if this was an abort
                        if (abortSignal?.aborted || err.message.includes("aborted")) {
                            this.logger.warn(`Video processing aborted for presentation video: ${err.message}`);
                            return; // Don't mark as error in DB for aborts
                        }

                        // FAILURE: Update database with error
                        await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                            isProcessed: false,
                            processingError: err.message,
                        });

                        this.logger.error(`Video processing failed for presentation video: ${err.message}`);

                        // Throw error to propagate to subscriber
                        throw err;
                    });
            })
            .catch((error: unknown) => {
                // This catches errors in the abort strategy wrapper itself
                const err = error instanceof Error ? error : new Error(String(error));
                this.logger.error(`Event processing wrapper failed: ${err.message}`);
            });

        return {
            ...video,
            url: fileData.url,
        };
    }

    /**
     * Trigger video processing for current presentation video
     */
    async triggerProcessing(): Promise<void> {
        const video = await this.presentationRepository.findCurrent();

        if (!video) {
            throw new NotFoundException("No presentation video found");
        }

        if (video.isProcessed) {
            throw new Error("Video is already processed");
        }

        // Get absolute file path from stored relative path
        const absolutePath = join(UPLOADS_DIR, video.filePath);

        // Start processing in background with abort strategy (don't await)
        this.presentationEventService
            .startProcessing("videoProcessing", { videoId: "singleton" }, ({ abortSignal, emit }) => {
                // Call video processing service and handle result with .then()
                return this.videoProcessingService
                    .processVideo(
                        absolutePath,
                        (progress, message) => {
                            // Emit progress updates using the emit helper
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
                        // If conversion happened and file path changed, update it
                        const updates: Parameters<typeof this.presentationRepository.updateVideoProcessingStatus>[1] = {
                            isProcessed: true,
                            processingProgress: 100,
                            processingError: null,
                        };

                        // Update file path if it changed during conversion
                        if (metadata.newFilePath) {
                            // Extract relative path from absolute path
                            const uploadsIndex = metadata.newFilePath.indexOf("uploads/");
                            const relativePath = uploadsIndex >= 0 ? metadata.newFilePath.substring(uploadsIndex) : metadata.newFilePath;

                            await this.presentationRepository.upsert({
                                filePath: relativePath,
                                filename: relativePath.split("/").pop() ?? "",
                                mimeType: "video/mp4",
                                size: video.size, // Keep original size
                                ...updates,
                            });
                        } else {
                            await this.presentationRepository.updateVideoProcessingStatus("singleton", updates);
                        }

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
                            this.logger.warn(`Video processing aborted for presentation video: ${err.message}`);
                            return; // Don't mark as error in DB for aborts
                        }

                        // FAILURE: Update database with error
                        await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                            isProcessed: false,
                            processingError: err.message,
                        });

                        this.logger.error(`Video processing failed for presentation video: ${err.message}`);

                        // Throw error to propagate to subscriber
                        throw err;
                    });
            })
            .catch((error: unknown) => {
                // This catches errors in the abort strategy wrapper itself
                const err = error instanceof Error ? error : new Error(String(error));
                this.logger.error(`Event processing wrapper failed: ${err.message}`);
            });
    }

    /**
     * Subscribe to video processing progress (async iterator)
     */
    async *subscribeProcessingProgress(): AsyncIterableIterator<{
        progress: number;
        message: string;
        metadata?: {
            duration: number;
            width: number;
            height: number;
            codec: string;
        };
        timestamp: string;
    }> {
        const video = await this.presentationRepository.findCurrent();

        if (!video) {
            throw new NotFoundException("No presentation video found");
        }

        // Subscribe to the event service for videoProcessing events
        const subscription = this.presentationEventService.subscribe("videoProcessing", { videoId: "singleton" });

        // First, yield current state
        const currentProgress = video.processingProgress ?? 0;
        const currentIsProcessed = video.isProcessed;
        const currentError = video.processingError ?? null;

        // If already failed, throw error immediately
        if (currentError) {
            throw new Error(currentError);
        }

        // If already processed, just return (no events to stream)
        if (currentIsProcessed) {
            return;
        }

        yield {
            progress: currentProgress,
            message: "Processing video...",
            timestamp: new Date().toISOString(),
        };

        // Then yield real-time updates from event service
        for await (const event of subscription) {
            // Yield all progress events - completion detected by iterator end
            yield {
                progress: event.progress,
                message: event.message || "",
                metadata: event.metadata,
                timestamp: event.timestamp,
            };
        }

        this.logger.log("Processing progress subscription ended");
    }

    /**
     * Get current presentation video
     */
    async getCurrentVideo(): Promise<(PresentationVideoRecord & { url: string }) | null> {
        const video = await this.presentationRepository.findCurrent();

        if (!video) {
            return null;
        }

        return {
            ...video,
            url: `/uploads/${video.filePath}`,
        };
    }

    /**
     * Delete presentation video
     */
    async deleteVideo() {
        const video = await this.presentationRepository.findCurrent();

        if (!video) {
            throw new NotFoundException("No presentation video found");
        }

        // Delete file from storage
        await this.storageService.deleteFile(video.filePath);

        // Delete from database
        await this.presentationRepository.delete();
    }

    /**
     * Get video stream path for serving
     */
    async getVideoPath(): Promise<string> {
        const video = await this.presentationRepository.findCurrent();

        if (!video) {
            throw new NotFoundException("No presentation video found");
        }

        return join(UPLOADS_DIR, video.filePath);
    }
}
