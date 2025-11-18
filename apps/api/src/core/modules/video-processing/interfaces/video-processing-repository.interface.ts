/**
 * Interface for video processing repository operations
 * Allows VideoProcessingService to work with any storage implementation
 */
export interface IVideoProcessingRepository {
  /**
   * Find all videos that are not fully processed (isProcessed = false)
   * Returns at least { id, isProcessed }, but can return additional fields
   */
  findIncompleteVideos(): Promise<{
    id: string;
    isProcessed: boolean;
    [key: string]: unknown; // Allow additional fields from implementation
  }[]>;

  /**
   * Get the file path for a specific video
   */
  getVideoFilePath(videoId: string): Promise<string>;

  /**
   * Update video processing status in database
   */
  updateVideoProcessingStatus(
    videoId: string,
    status: {
      isProcessed?: boolean;
      processingProgress?: number;
      processingError?: string | null;
    }
  ): Promise<void>;
}
