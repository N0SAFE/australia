import { Injectable } from '@nestjs/common';
import type { LazyFile } from '@mjackson/lazy-file';
import { FileService } from './file.service';

/**
 * Range header parsing result
 */
interface RangeResult {
  start: number;
  end: number;
  contentLength: number;
  totalSize: number;
}

/**
 * File streaming response structure
 * Note: body can be either LazyFile (for full file streaming) or File (for Range requests)
 * Using File for Range requests ensures exact Content-Length match with HTTP/2
 */
export interface FileRangeResponse {
  status?: number;
  headers: Record<string, string>;
  body: LazyFile | File;
}

/**
 * File Range Service
 * 
 * Generic service for streaming any file type with HTTP Range support:
 * - Supports video, audio, images, and any other file types
 * - Parse Range headers for seeking and partial content delivery
 * - Build appropriate response headers based on MIME type
 * - Create file streams with range support
 * - Enforce chunk size limits for efficient streaming
 * 
 * Note: Uses fileId for all operations and delegates to FileService for file retrieval
 */
@Injectable()
export class FileRangeService {
  constructor(
    private readonly fileService: FileService,
  ) {}

  /**
   * Stream any file with optional Range support
   * Supports videos, audio files, images, PDFs, and any other file type
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request (e.g., "bytes=0-499999")
   * @param options - Configuration options
   * @returns File stream response with appropriate status and headers
   */
  async streamFile(
    fileId: string,
    rangeHeader?: string,
    options: { maxChunkSize?: number } = {},
  ): Promise<FileRangeResponse> {
    const maxChunkSize = options.maxChunkSize ?? 5 * 1024 * 1024; // Default 5MB
    
    // Get file metadata from FileService
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    const fileSize = file.size;
    
    // Fix empty MIME type - detect from filename or use default
    let mimeType = file.mimeType;
    if (!mimeType || mimeType.trim() === '') {
      // Detect from filename extension
      const ext = file.filename.split('.').pop()?.toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
      };
      mimeType = ext ? (mimeTypeMap[ext] ?? 'application/octet-stream') : 'application/octet-stream';
    }

    // Handle Range requests
    if (rangeHeader) {
      const rangeResult = this.parseRangeHeader(rangeHeader, fileSize, maxChunkSize);
      
      if (!rangeResult) {
        // Invalid range - return 416 Range Not Satisfiable
        console.error('[FileRangeService] Invalid range header:', rangeHeader);
        throw new Error(`Invalid range: ${rangeHeader}`);
      }

      const { start, end, contentLength } = rangeResult;
      
      // Use createRangeFile to read exact bytes into a standard File object
      // This ensures Content-Length matches exactly for HTTP/2 compatibility
      const rangeFile = await this.fileService.createRangeFile(
        fileId,
        {
          start,
          end,
        },
        mimeType, // Pass corrected MIME type
      );

      // Build Range response headers
      const headers = this.buildRangeHeaders(start, end, fileSize, mimeType, contentLength);

      return {
        status: 206, // Partial Content
        headers,
        body: rangeFile,
      };
    }

    // No Range header - return full file
    const lazyFile = await this.fileService.createLazyFile(fileId, undefined, mimeType);
    const headers = this.buildFullFileHeaders(fileSize, mimeType);

    return {
      headers,
      body: lazyFile,
    };
  }

  /**
   * Stream a video file with optional Range support
   * Convenience wrapper for backward compatibility
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request
   * @param options - Configuration options
   * @returns File stream response
   */
  async streamVideo(
    fileId: string,
    rangeHeader?: string,
    options: { maxChunkSize?: number } = {},
  ): Promise<FileRangeResponse> {
    return this.streamFile(fileId, rangeHeader, options);
  }

  /**
   * Stream an audio file with optional Range support
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request
   * @param options - Configuration options
   * @returns File stream response
   */
  async streamAudio(
    fileId: string,
    rangeHeader?: string,
    options: { maxChunkSize?: number } = {},
  ): Promise<FileRangeResponse> {
    return this.streamFile(fileId, rangeHeader, options);
  }

  /**
   * Parse Range header and enforce chunk size limit
   * 
   * @param rangeHeader - Range header value (e.g., "bytes=0-499999")
   * @param fileSize - Total file size in bytes
   * @param maxChunkSize - Maximum allowed chunk size (default 5mb)
   * @returns Parsed range with enforced limits, or null if invalid
   */
  parseRangeHeader(
    rangeHeader: string,
    fileSize: number,
    maxChunkSize = 5 * 1024 * 1024,
  ): RangeResult | null {
    // Parse "bytes=start-end" format
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match?.[1]) {
      return null;
    }

    const start = Number.parseInt(match[1], 10);
    let end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;

    // Validate range
    if (Number.isNaN(start) || start < 0 || start >= fileSize) {
      return null;
    }

    // Enforce maximum chunk size (HARD LIMIT)
    end = Math.min(end, start + maxChunkSize - 1, fileSize - 1);

    // Validate end position
    if (end < start) {
      return null;
    }

    const contentLength = end - start + 1;

    return {
      start,
      end,
      contentLength,
      totalSize: fileSize,
    };
  }

  /**
   * Build headers for Range response (206 Partial Content)
   * Note: All header values must be strings for HTTP/2 compatibility
   */
  buildRangeHeaders(
    start: number,
    end: number,
    totalSize: number,
    mimeType: string,
    contentLength: number,
  ): Record<string, string> {
    // Ensure content-type is never empty (critical for HTTP/2)
    const contentType = mimeType && mimeType.trim() !== '' ? mimeType : 'application/octet-stream';
    
    return {
      'content-range': `bytes ${start.toString()}-${end.toString()}/${totalSize.toString()}`,
      'accept-ranges': 'bytes',
      'content-length': contentLength.toString(),
      'content-type': contentType,
      'cache-control': 'public, max-age=3600',
    };
  }

  /**
   * Build headers for full file response (200 OK)
   * Note: All header values must be strings for HTTP/2 compatibility
   */
  buildFullFileHeaders(
    fileSize: number,
    mimeType: string,
  ): Record<string, string> {
    // Ensure content-type is never empty (critical for HTTP/2)
    const contentType = mimeType && mimeType.trim() !== '' ? mimeType : 'application/octet-stream';
    
    return {
      'accept-ranges': 'bytes',
      'content-length': fileSize.toString(),
      'content-type': contentType,
      'cache-control': 'public, max-age=3600',
    };
  }
}
