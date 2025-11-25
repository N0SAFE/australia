import type { Readable } from 'stream';

/**
 * Input for FFmpeg processing.
 *
 * Uses the standard Web File API, which is already used throughout the codebase
 * (FileService, ORPC handlers, etc.). The File object provides a clean abstraction
 * that works with any storage provider.
 *
 * The `id` field is critical: it's the database file ID and will be used as the
 * temp directory name. This enables crash recovery by directly mapping temp directories
 * back to database records.
 */
export interface FfmpegInput {
  /**
   * Database file ID (primary key).
   * REQUIRED: Used as the temp directory name for crash recovery mapping.
   * After crash, service can scan directories and map back to DB records.
   */
  id: string;

  /**
   * The file to process.
   * Standard Web File API - can be created from buffer, stream, or Blob.
   * The filename and mimeType are extracted from the File object.
   */
  file: File;
}

/**
 * Video metadata extracted from FFprobe.
 */
export interface VideoMetadata {
  /** Duration in seconds */
  duration: number;
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Video codec (e.g., 'h264', 'vp9') */
  codec: string;
  /** Bitrate in bits per second */
  bitrate?: number;
  /** Frame rate (e.g., 30, 60) */
  fps?: number;
}

/**
 * Result returned after video processing completes.
 */
export interface ProcessingResult {
  /** The file ID that was processed */
  fileId: string;

  /** Absolute path to processed file in FFmpeg temp directory */
  outputPath: string;

  /**
   * Whether conversion was actually performed.
   * false if video was already H.264/MP4 and no processing was needed.
   */
  wasConverted: boolean;

  /** Size of processed file in bytes */
  newSize: number;

  /** Video metadata after processing */
  metadata: VideoMetadata;
}

/**
 * Represents a file that was left in temp directory
 * (processing was interrupted or storage failed).
 *
 * Used during crash recovery to identify files that need
 * to be re-processed or cleaned up.
 */
export interface DanglingFile {
  /** Database file ID - can be used to lookup record */
  fileId: string;

  /** Namespace array that identifies the consumer service */
  namespace: string[];

  /** Absolute path to the temp directory */
  tempDir: string;

  /** Absolute path to input file copy */
  inputPath: string;

  /**
   * Absolute path to output file.
   * Present only if processing completed (storage may have failed).
   */
  outputPath?: string;

  /** Whether output file exists and processing was complete */
  isComplete: boolean;

  /** Metadata from lock file */
  lockMetadata: LockFileContent;
}

/**
 * Active processing job tracked in memory.
 * Used to prevent duplicate processing and enable abort functionality.
 */
export interface ProcessingJob {
  /** Database file ID being processed */
  fileId: string;

  /** Consumer service namespace */
  namespace: string[];

  /** Absolute path to temp directory */
  tempDir: string;

  /** When processing started */
  startedAt: Date;

  /** Controller to abort processing */
  abortController?: AbortController;

  /** Current progress (0-100) */
  progress: number;
}

/**
 * Lock file contents stored in .lock file.
 * Used to detect stale/dangling processing jobs after server restart.
 */
export interface LockFileContent {
  /** Database file ID */
  fileId: string;

  /** Consumer service namespace */
  namespace: string[];

  /** Original filename */
  originalName: string;

  /** Original MIME type */
  mimeType: string;

  /** ISO date string when processing started */
  startedAt: string;

  /**
   * Process ID of the server that started processing.
   * Used to detect if the process is still running (stale lock detection).
   */
  pid: number;
}

/**
 * Options for processVideo method.
 */
export interface ProcessVideoOptions {
  /**
   * Progress callback called periodically during processing.
   * @param progress - Progress value from 0 to 100
   */
  onProgress?: (progress: number) => void;

  /**
   * Abort signal to cancel processing.
   * If aborted, temp files are preserved for potential retry.
   */
  abortSignal?: AbortSignal;

  /**
   * Force processing even if video is already H.264.
   * Useful for re-encoding at different quality settings.
   */
  forceConvert?: boolean;

  /**
   * Target video quality preset.
   * @default 'medium'
   */
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Content returned when retrieving a processed file.
 */
export interface ProcessedFileContent {
  /** Readable stream of the processed file */
  stream: Readable;

  /** Size in bytes */
  size: number;

  /** MIME type (always 'video/mp4' after processing) */
  mimeType: string;

  /** Absolute path to the file (for advanced use cases) */
  path: string;
}

/**
 * Configuration for the FFmpeg temp service.
 */
export interface FfmpegTempConfig {
  /**
   * Base directory for temp files.
   * @default '.ffmpeg-temp'
   */
  basePath?: string;

  /**
   * Maximum age in milliseconds for temp files before cleanup.
   * @default 86400000 (24 hours)
   */
  maxAgeMs?: number;
}

/**
 * Statistics about temp file usage.
 */
export interface TempStorageStats {
  /** Total number of files across all namespaces */
  totalFiles: number;

  /** Total size in bytes */
  totalSize: number;

  /** Breakdown by namespace */
  byNamespace: Map<string, { files: number; size: number }>;

  /** Number of dangling (stale) files */
  danglingCount: number;
}
