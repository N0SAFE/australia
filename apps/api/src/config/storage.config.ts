/**
 * Storage configuration constants
 * 
 * Note: This file provides static constants for upload directory path.
 * For dynamic file operations, prefer using StorageService which gets
 * the upload directory from environment variables.
 */

/**
 * Base uploads directory path
 * This is the default path but should match the UPLOADS_DIR environment variable
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR;

/**
 * Subdirectories for different file types
 */
export const STORAGE_SUBDIRS = {
  images: 'images',
  videos: 'videos',
  audio: 'audio',
  files: 'files',
} as const;
