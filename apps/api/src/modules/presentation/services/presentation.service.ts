import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { ReadStream } from 'fs';
import { PresentationRepository } from "../repositories/presentation.repository";
import { FileService } from "@/core/modules/file";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { PresentationEventService } from "../events/presentation.event";

@Injectable()
export class PresentationService {
    private readonly logger = new Logger(PresentationService.name);

    constructor(
        private readonly presentationRepository: PresentationRepository,
        private readonly fileService: FileService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly presentationEventService: PresentationEventService
    ) {}

    /**
     * Upload or replace presentation video
     */
    async uploadVideo(file: File) {
        // Upload file using FileService with namespace ['presentation', 'video']
        const uploadResult = await this.fileService.uploadFile(
            file,
            ["presentation", "video"],
            "video",
            undefined // uploadedBy - presentation doesn't have user context
        );

        this.logger.log(`Video uploaded with fileId: ${uploadResult.fileId}`);

        // Get current video to delete old file
        const currentVideo = await this.presentationRepository.findCurrentBasic();

        // Delete old file if exists
        if (currentVideo?.fileId) {
            try {
                // Use FileService's deleteFile method (by fileId)
                await this.fileService.deleteFile(currentVideo.fileId);
                this.logger.log(`Deleted old video: ${currentVideo.fileId}`);
            } catch (error: unknown) {
                // Ignore deletion errors - continue with upload
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to delete old presentation video: ${errorMessage}`);
            }
        }

        // Save to database - only store fileId reference
        // All file metadata is in the file/videoFile tables
        await this.presentationRepository.upsert({
            fileId: uploadResult.fileId,
        });

        // Get absolute file path for processing (internal use only)
        const absolutePath = await this.fileService.getAbsoluteFilePath(uploadResult.fileId);

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
                        const updates = {
                            isProcessed: true,
                            processingProgress: 100,
                            processingError: null,
                        };

                        // Video processing complete - update status in videoFile table
                        await this.presentationRepository.updateVideoProcessingStatus("singleton", updates);

                        console.log("metadata", metadata);

                        // Video has been processed in-place (same file, converted content)
                        // No file replacement needed - just mark as processed
                        this.logger.log(`Video processing completed for file: ${uploadResult.fileId}`);

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

        // Get the complete video data with joined file and video metadata
        const result = await this.presentationRepository.findCurrent();
        
        if (!result) {
            throw new Error('Failed to retrieve uploaded video');
        }

        return {
            ...result.presentation,
            file: result.file,
            video: result.video,
            url: `/api/presentation/video/stream`, // Stream endpoint
        };
    }

    /**
     * Trigger video processing for current presentation video
     */
    async triggerProcessing(): Promise<void> {
        const result = await this.presentationRepository.findCurrent();

        if (!result) {
            throw new NotFoundException("No presentation video found");
        }

        const { file: fileRecord, video } = result;

        if (video.isProcessed) {
            throw new Error("Video is already processed");
        }

        // Get absolute file path from FileService
        const absolutePath = await this.fileService.getAbsoluteFilePath(fileRecord.id);

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
                        const updates = {
                            isProcessed: true,
                            processingProgress: 100,
                            processingError: null as string | null,
                        };

                        // Update processing status
                        await this.presentationRepository.updateVideoProcessingStatus("singleton", updates);

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
        const result = await this.presentationRepository.findCurrent();

        if (!result) {
            throw new NotFoundException("No presentation video found");
        }

        // Extract video metadata from joined result
        const { video } = result;

        // Subscribe to the event service for videoProcessing events
        const subscription = this.presentationEventService.subscribe("videoProcessing", { videoId: "singleton" });

        // First, yield current state from videoFile table
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
     * Returns presentation with file metadata from joined tables
     */
    async getCurrentVideo() {
        const result = await this.presentationRepository.findCurrent();

        if (!result) {
            return null;
        }

        return {
            ...result.presentation,
            file: result.file,
            video: result.video,
            url: `/presentation/video`, // Stream endpoint (matches ORPC contract path)
        };
    }

    /**
     * Delete presentation video
     */
    async deleteVideo() {
        const result = await this.presentationRepository.findCurrent();

        if (!result) {
            throw new NotFoundException("No presentation video found");
        }

        // Delete file from storage using FileService (by fileId)
        await this.fileService.deleteFile(result.file.id);

        // Delete from database (cascade will handle file table)
        await this.presentationRepository.delete();
    }

    /**
     * Get video stream for serving
     * Returns the file stream from FileService
     */
    async getVideoStream(): Promise<{
        stream: ReadStream;
        filename: string;
        mimeType: string;
        size: number;
    }> {
        const result = await this.presentationRepository.findCurrent();

        if (!result) {
            throw new NotFoundException("No presentation video found");
        }

        // Get file stream from FileService using the fileId
        return this.fileService.getFileStream(result.file.id);
    }

    /**
     * Get absolute file path for the video file
     */
    async getAbsoluteFilePath(fileId: string): Promise<string> {
        return this.fileService.getAbsoluteFilePath(fileId);
    }
}
