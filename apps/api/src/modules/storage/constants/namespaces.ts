/**
 * Storage Module FFmpeg Namespace Constants
 *
 * Defines the namespace used for FFmpeg temp file isolation.
 * Files are stored in: .ffmpeg-temp/{namespace[0]}/{fileId}/
 */

/**
 * Namespace for storage video processing.
 * Used by both StorageController and StorageVideoRecoveryService.
 */
export const STORAGE_VIDEO_NAMESPACE = ['storage'] as const;
