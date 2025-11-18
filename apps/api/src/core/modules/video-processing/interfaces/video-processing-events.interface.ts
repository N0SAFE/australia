/**
 * Video processing event data structure
 */
export interface VideoProcessingEventData {
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    codec?: string;
  };
  timestamp: string;
}

/**
 * Interface for video processing event emissions
 * Allows VideoProcessingService to emit progress events to any event system
 */
export interface IVideoProcessingEvents {
  /**
   * Emit a video processing event
   */
  emit(
    eventName: 'videoProcessing',
    filter: { videoId: string },
    data: VideoProcessingEventData
  ): void;
}
