import { Injectable } from "@nestjs/common";
import { BaseEventService } from "@/core/modules/events/base-event.service";
import { contractBuilder, ProcessingStrategy } from "@/core/modules/events/event-contract.builder";
import { z } from "zod";

/**
 * Presentation video processing event contracts
 * Uses same structure as storage events but tracks the current presentation video
 */
const presentationVideoProcessingContract = contractBuilder()
    .input(
        z.object({
            videoId: z.string().describe("Video ID being processed"),
        })
    )
    .output(
        z.object({
            progress: z.number().min(0).max(100).describe("Processing progress percentage"),
            message: z.string().describe("Status message"),
            metadata: z
                .object({
                    duration: z.number(),
                    width: z.number(),
                    height: z.number(),
                    codec: z.string(),
                })
                .optional()
                .describe("Video metadata (available on completion)"),
            timestamp: z.string().describe("Event timestamp"),
        })
    )
    .strategy(ProcessingStrategy.ABORT)
    .build();

const presentationContracts = {
    videoProcessing: presentationVideoProcessingContract,
} as const;

/**
 * Presentation Event Service
 *
 * Manages real-time events for presentation video operations.
 * Uses BaseEventService for type-safe event handling with automatic validation.
 *
 * Features:
 * - ABORT strategy: New processing aborts previous operation for same video
 * - WebSocket SSE support via ORPC
 * - Type-safe event emission and subscription
 */
@Injectable()
export class PresentationEventService extends BaseEventService<typeof presentationContracts> {
    constructor() {
        super("presentation", presentationContracts);
    }
}
