import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { ReadStream } from 'fs';
import { PresentationRepository } from "../repositories/presentation.repository";
import { FileService } from "@/core/modules/file";
import { VideoProcessingService } from "@/core/modules/video-processing";
import { FfmpegService } from "@/core/modules/ffmpeg/services/ffmpeg.service";
import { PresentationEventService } from "../events/presentation.event";
import { PRESENTATION_VIDEO_NAMESPACE } from "../constants";

@Injectable()
export class PresentationService {
    private readonly logger = new Logger(PresentationService.name);

    constructor(
        private readonly presentationRepository: PresentationRepository,
        private readonly fileService: FileService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly ffmpegService: FfmpegService,
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

        const fileId = uploadResult.fileId;
        this.logger.log(`Video uploaded with fileId: ${fileId}`);

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
            fileId,
        });

        const namespace = [...PRESENTATION_VIDEO_NAMESPACE];

        // Start processing in background with abort strategy (don't await)
        this.presentationEventService
            .startProcessing("videoProcessing", { videoId: "singleton" }, async ({ abortSignal, emit }) => {
                try {
                    // 1. Get the file as a Web File from storage provider
                    const webFile = await this.fileService.getFileAsWebFile(fileId);
                    if (!webFile) {
                        throw new Error(`Failed to retrieve file ${fileId} from storage provider`);
                    }
                    const input = { id: fileId, file: webFile };

                    // 2. Process the video with FFmpeg (namespace-based temp storage)
                    const result = await this.videoProcessingService.processVideoFromFile(
                        input,
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
                    await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                        isProcessed: true,
                        processingProgress: 100,
                        processingError: null,
                    });

                    this.logger.log(`Video processing completed for file: ${fileId}`);

                    // Emit final completion event with metadata
                    emit({
                        progress: 100,
                        message: "Processing complete",
                        metadata: {
                            duration: result.metadata.duration,
                            width: result.metadata.width,
                            height: result.metadata.height,
                            codec: result.metadata.codec,
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
                        this.logger.warn(`Video processing aborted for presentation video: ${err.message}`);
                        return; // Don't mark as error in DB for aborts
                    }

                    // FAILURE: Update database with error
                    await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                        isProcessed: false,
                        processingError: err.message,
                    });

                    this.logger.error(`Video processing failed for presentation video: ${err.message}`);
                }
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
        const fileId = fileRecord.id;

        if (video.isProcessed) {
            throw new Error("Video is already processed");
        }

        const namespace = [...PRESENTATION_VIDEO_NAMESPACE];

        // Start processing in background with abort strategy (don't await)
        this.presentationEventService
            .startProcessing("videoProcessing", { videoId: "singleton" }, async ({ abortSignal, emit }) => {
                try {
                    // 1. Get the file as a Web File from storage provider
                    const webFile = await this.fileService.getFileAsWebFile(fileId);
                    if (!webFile) {
                        throw new Error(`Failed to retrieve file ${fileId} from storage provider`);
                    }
                    const input = { id: fileId, file: webFile };

                    // 2. Process the video with FFmpeg (namespace-based temp storage)
                    const processingResult = await this.videoProcessingService.processVideoFromFile(
                        input,
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
                    await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                        isProcessed: true,
                        processingProgress: 100,
                        processingError: null as string | null,
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
                        this.logger.warn(`Video processing aborted for presentation video: ${err.message}`);
                        return; // Don't mark as error in DB for aborts
                    }

                    // FAILURE: Update database with error
                    await this.presentationRepository.updateVideoProcessingStatus("singleton", {
                        isProcessed: false,
                        processingError: err.message,
                    });

                    this.logger.error(`Video processing failed for presentation video: ${err.message}`);
                }
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

    /**
     * Find presentation by fileId (for crash recovery)
     * Returns the presentation if it references this fileId
     */
    async findByFileId(fileId: string): Promise<{ fileId: string } | null> {
        const result = await this.presentationRepository.findCurrent();
        
        if (result?.file.id !== fileId) {
            return null;
        }

        return { fileId: result.file.id };
    }
}
