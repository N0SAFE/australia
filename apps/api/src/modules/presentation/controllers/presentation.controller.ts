import { Controller } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { ORPCError } from "@orpc/server";
import { PresentationService } from "../services/presentation.service";
import { presentationContract } from "@repo/api-contracts";
import { Headers } from "@nestjs/common";
import { FileRangeService, FileService } from "@/core/modules/file";
import { AllowAnonymous } from "@/core/modules/auth/decorators/decorators";

@Controller()
export class PresentationController {
    constructor(
        private readonly presentationService: PresentationService,
        private readonly fileRangeService: FileRangeService,
        private readonly fileService: FileService,
    ) {}

    /**
     * Upload presentation video endpoint - implements ORPC contract with file upload
     * File is parsed by ORPC which provides a clean File object with proper type coercion
     */
    @Implement(presentationContract.upload)
    upload() {
        return implement(presentationContract.upload).handler(async ({ input }) => {
            try {
                const file: File = input.file;

                // Pass File object directly to service
                const result = await this.presentationService.uploadVideo(file);

                // Flatten nested structure for API response
                return {
                    id: result.id,
                    filename: result.file.filename,
                    mimeType: result.file.mimeType,
                    size: result.file.size,
                    duration: result.video.duration,
                    width: result.video.width,
                    height: result.video.height,
                    thumbnailPath: result.video.thumbnailPath,
                    uploadedAt: result.uploadedAt,
                    updatedAt: result.updatedAt,
                    url: result.url,
                };
            } catch (error) {
                console.error("[PresentationController] Error in upload:", error);
                throw error;
            }
        });
    }

    /**
     * Get current presentation video metadata
     */
    @Implement(presentationContract.getCurrent)
    getCurrent() {
        return implement(presentationContract.getCurrent).handler(async () => {
            const result = await this.presentationService.getCurrentVideo();

            if (!result) {
                return null;
            }

            // Flatten nested structure for API response
            return {
                id: result.id,
                filename: result.file.filename,
                mimeType: result.file.mimeType,
                size: result.file.size,
                duration: result.video.duration,
                width: result.video.width,
                height: result.video.height,
                thumbnailPath: result.video.thumbnailPath,
                uploadedAt: result.uploadedAt,
                updatedAt: result.updatedAt,
                url: result.url,
                isProcessed: result.video.isProcessed,
                processingProgress: result.video.processingProgress,
                processingError: result.video.processingError,
            };
        });
    }

    /**
     * Stream presentation video file with HTTP Range request support
     * Delegates to FileRangeService for all streaming logic
     */
    @Implement(presentationContract.getVideo)
    @AllowAnonymous()
    getVideo(@Headers() headers: Record<string, string>) {
        return implement(presentationContract.getVideo).handler(async ({ context }) => {
            try {
                const currentVideo = await this.presentationService.getCurrentVideo();

                if (!currentVideo) {
                    throw new ORPCError("NOT_FOUND", {
                        message: "No presentation video found",
                    });
                }

                // Get Range header (case-insensitive)
                const rangeHeader = headers.range || headers.Range;
                
                console.log('[PresentationController] Range header:', rangeHeader);
                console.log('[PresentationController] All headers:', JSON.stringify(headers));

                // Stream video using FileRangeService (all Range logic handled there)
                // Pass fileId directly - FileRangeService handles file retrieval
                const result = await this.fileRangeService.streamVideo(
                    currentVideo.file.id,
                    rangeHeader,
                    { maxChunkSize: 5 * 1024 * 1024 }, // 5MB chunks
                );
                
                console.log('[PresentationController] Response status:', result.status);
                console.log('[PresentationController] Response headers:', JSON.stringify(result.headers));
                
                // CRITICAL: Set HTTP response headers explicitly via request context
                // ORPC with outputStructure: "detailed" doesn't automatically set HTTP headers
                const request = (context as any).request;
                if (request?.res && result.headers) {
                    Object.entries(result.headers).forEach(([key, value]) => {
                        if (value) {
                            request.res.setHeader(key, value);
                        }
                    });
                }
                
                // Set status code if provided
                if (request?.res && result.status) {
                    request.res.status(result.status);
                }
                
                return result;
            } catch (error) {
                console.error("[PresentationController] Error in getVideo:", error);
                if (error instanceof ORPCError) {
                    throw error;
                }
                throw new ORPCError("INTERNAL_SERVER_ERROR", {
                    message: "Failed to stream video",
                });
            }
        });
    }

    /**
     * Delete presentation video
     */
    @Implement(presentationContract.delete)
    delete() {
        return implement(presentationContract.delete).handler(async () => {
            try {
                await this.presentationService.deleteVideo();
                return {
                    success: true,
                    message: "Presentation video deleted successfully",
                };
            } catch (error) {
                console.error("[PresentationController] Error in delete:", error);
                return {
                    success: false,
                    message: "Failed to delete presentation video",
                };
            }
        });
    }

    /**
     * Subscribe to video processing progress (async iterator)
     */
    @Implement(presentationContract.subscribeProcessingProgress)
    subscribeProcessingProgress() {
        // Store reference to service for use in generator function
        const presentationService = this.presentationService;
        return implement(presentationContract.subscribeProcessingProgress).handler(async function* () {
            try {
                // Subscribe to the event service and yield progress updates
                const iterator = presentationService.subscribeProcessingProgress();

                try {
                    for await (const event of iterator) {
                        yield event;
                    }
                } finally {
                    // Always clean up the iterator
                    try {
                        if (iterator.return) {
                            await iterator.return(undefined);
                        }
                    } catch (cleanupError) {
                        console.error("[PresentationController] Error cleaning up iterator:", cleanupError);
                        console.error("[PresentationController] Cleanup error stack:", cleanupError instanceof Error ? cleanupError.stack : "No stack trace");
                    }
                }
            } catch (error) {
                console.error("[PresentationController] Error in subscribeProcessingProgress:", error);
                console.error("[PresentationController] Error stack:", error instanceof Error ? error.stack : "No stack trace");

                throw new ORPCError("INTERNAL_SERVER_ERROR", {
                    message: error instanceof Error ? error.message : "Failed to subscribe to processing progress",
                });
            }

            console.log("[PresentationController] subscribeProcessingProgress completed");
        });
    }
}
