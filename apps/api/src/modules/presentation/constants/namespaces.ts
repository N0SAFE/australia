/**
 * Presentation Module FFmpeg Namespace Constants
 *
 * Defines the namespace used for FFmpeg temp file isolation.
 * Files are stored in: .ffmpeg-temp/{namespace.join('/')}/{fileId}/
 */

/**
 * Namespace for presentation video processing.
 * Used by both PresentationService and PresentationVideoRecoveryService.
 */
export const PRESENTATION_VIDEO_NAMESPACE = ['presentation', 'video'] as const;
