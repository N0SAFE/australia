import type { ReadStream } from 'fs';

/**
 * File statistics returned by storage providers
 */
export interface FileStats {
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Options for creating read streams
 */
export interface StreamOptions {
  start?: number;
  end?: number;
}

/**
 * Storage Provider Interface
 * 
 * Abstracts storage backend operations to support multiple storage types:
 * - Local filesystem (LocalStorageProvider)
 * - AWS S3 (S3StorageProvider)
 * - Azure Blob Storage (AzureStorageProvider)
 * - Google Cloud Storage (GCSStorageProvider)
 * 
 * All paths are relative to the storage provider's base directory/bucket.
 */
export interface IStorageProvider {
  /**
   * Get the base directory/bucket name for this storage provider
   * @returns Base storage location
   */
  getBaseDirectory(): string;

  /**
   * Get absolute path/URL for a relative file path
   * @param relativePath - Relative path within storage (e.g., "capsule/video/abc-123.mp4")
   * @returns Absolute path or URL
   */
  getAbsolutePath(relativePath: string): string;

  /**
   * Build relative path from namespace and filename
   * @param namespace - Array of path segments (e.g., ['capsule', 'video'])
   * @param filename - The filename (e.g., "abc-123.mp4")
   * @returns Relative path (e.g., "capsule/video/abc-123.mp4")
   */
  buildRelativePath(namespace: string[], filename: string): string;

  /**
   * Check if a file exists in storage
   * @param relativePath - Relative path to the file
   * @returns True if file exists, false otherwise
   */
  exists(relativePath: string): Promise<boolean>;

  /**
   * Save a File object to storage
   * @param file - The File object to save
   * @param relativePath - Relative path where file should be saved
   * @returns Absolute path/URL to the saved file
   */
  save(file: File, relativePath: string): Promise<string>;

  /**
   * Delete a file from storage
   * @param relativePath - Relative path to the file
   */
  delete(relativePath: string): Promise<void>;

  /**
   * Get file statistics (size, mimeType, timestamps)
   * @param relativePath - Relative path to the file
   * @returns File statistics
   */
  getStats(relativePath: string): Promise<FileStats>;

  /**
   * Get file size in bytes
   * @param relativePath - Relative path to the file
   * @returns File size in bytes
   */
  getSize(relativePath: string): Promise<number>;

  /**
   * Create a read stream for a file
   * Supports range requests via start/end options
   * 
   * @param relativePath - Relative path to the file
   * @param options - Optional start/end byte positions for range reads
   * @returns Node.js ReadStream
   */
  createReadStream(relativePath: string, options?: StreamOptions): Promise<ReadStream>;

  /**
   * Ensure directory exists (create if needed)
   * For cloud storage, this may be a no-op
   * 
   * @param relativePath - Relative path to the directory
   */
  ensureDirectory(relativePath: string): Promise<void>;
}
