import { z } from 'zod/v4';

/**
 * Shared file validation schemas for different media types
 */

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Image file schema
 * Validates: size (max 10MB), MIME type or extension
 */
export const imageSchema = z.file()
  .refine(file => file.size <= MAX_IMAGE_SIZE, {
    message: `Image size must not exceed ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    file => {
      // Check MIME type first (if present)
      if (file.type && file.type.startsWith('image/')) {
        return true;
      }
      
      // Fallback: Check file extension (case-insensitive)
      const filename = file.name.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
      return imageExtensions.some(ext => filename.endsWith(ext));
    },
    {
      message: 'Only image files are allowed (supported: jpg, jpeg, png, gif, webp, svg, bmp, ico)',
    }
  );

/**
 * Video file schema
 * Validates: size (max 500MB), MIME type or extension
 */
export const videoSchema = z.file()
  .refine(file => file.size <= MAX_VIDEO_SIZE, {
    message: `Video size must not exceed ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    file => {
      // Check MIME type first (if present)
      if (file.type && file.type.startsWith('video/')) {
        return true;
      }
      
      // Fallback: Check file extension (case-insensitive)
      const filename = file.name.toLowerCase();
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.3gp'];
      return videoExtensions.some(ext => filename.endsWith(ext));
    },
    {
      message: 'Only video files are allowed (supported: mp4, webm, mov, avi, mkv, flv, wmv, m4v, 3gp)',
    }
  );

/**
 * Audio file schema
 * Validates: size (max 50MB), MIME type or extension
 */
export const audioSchema = z.file()
  .refine(file => file.size <= MAX_AUDIO_SIZE, {
    message: `Audio size must not exceed ${MAX_AUDIO_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    file => {
      // Check MIME type first (if present)
      if (file.type && file.type.startsWith('audio/')) {
        return true;
      }
      
      // Fallback: Check file extension (case-insensitive)
      const filename = file.name.toLowerCase();
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus'];
      return audioExtensions.some(ext => filename.endsWith(ext));
    },
    {
      message: 'Only audio files are allowed (supported: mp3, wav, ogg, m4a, aac, flac, wma, opus)',
    }
  );

/**
 * Generic file schema (no type restrictions)
 * Can be used with custom size limits via .refine()
 */
export const fileSchema = z.file();
