/**
 * Capsule Module FFmpeg Namespace Constants
 *
 * Defines the namespace used for FFmpeg temp file isolation.
 * Files are stored in: .ffmpeg-temp/{namespace[0]}/{fileId}/
 */

/**
 * Namespace for capsule video processing.
 * Used by both CapsuleService and CapsuleVideoRecoveryService.
 */
export const CAPSULE_VIDEO_NAMESPACE = ['capsules'] as const;
