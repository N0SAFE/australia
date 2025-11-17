import { z } from 'zod';
import { EventBridgeService } from './event-bridge.service';

/**
 * Video Processing Event Factory
 * 
 * Creates type-safe events for video processing progress
 * 
 * @example
 * ```typescript
 * // Subscribe to video processing events
 * const videoEvent = createVideoProcessingEvent('video-uuid-123');
 * for await (const event of eventBridge.subscribe(videoEvent)) {
 *   console.log(`Progress: ${event.progress}%`);
 * }
 * 
 * // Emit progress update
 * eventBridge.emit(videoEvent, {
 *   progress: 50,
 *   status: 'processing',
 *   message: 'Extracting metadata...'
 * });
 * ```
 */
export const createVideoProcessingEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'video:processing',
    (videoId: string) => ({
      eventName: videoId,
      schema: z.object({
        progress: z.number().min(0).max(100),
        status: z.enum(['processing', 'completed', 'failed']),
        message: z.string().optional(),
        metadata: z.any().optional(),
        timestamp: z.string(),
      }),
    })
  );
};

/**
 * Image Processing Event Factory
 * 
 * Creates type-safe events for image processing
 */
export const createImageProcessingEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'image:processing',
    (imageId: string) => ({
      eventName: imageId,
      schema: z.object({
        status: z.enum(['processing', 'completed', 'failed']),
        message: z.string().optional(),
        thumbnails: z.array(z.string()).optional(),
        timestamp: z.string(),
      }),
    })
  );
};

/**
 * Audio Processing Event Factory
 * 
 * Creates type-safe events for audio processing
 */
export const createAudioProcessingEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'audio:processing',
    (audioId: string) => ({
      eventName: audioId,
      schema: z.object({
        progress: z.number().min(0).max(100),
        status: z.enum(['processing', 'completed', 'failed']),
        message: z.string().optional(),
        waveform: z.any().optional(),
        timestamp: z.string(),
      }),
    })
  );
};

/**
 * File Upload Event Factory
 * 
 * Creates type-safe events for file uploads
 */
export const createFileUploadEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'file:upload',
    (userId: string) => ({
      eventName: userId,
      schema: z.object({
        fileId: z.string(),
        fileName: z.string(),
        fileType: z.enum(['image', 'video', 'audio', 'text']),
        size: z.number(),
        timestamp: z.string(),
      }),
    })
  );
};

/**
 * General Processing Event Factory
 * 
 * Generic event factory for any processing task
 */
export const createProcessingEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'processing',
    (taskId: string, taskType: string) => ({
      eventName: `${taskType}:${taskId}`,
      schema: z.object({
        progress: z.number().min(0).max(100),
        status: z.string(),
        message: z.string().optional(),
        data: z.any().optional(),
        timestamp: z.string(),
      }),
    })
  );
};
