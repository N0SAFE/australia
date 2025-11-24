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
 */
export interface FileRangeResponse {
  status?: number;
  headers: Record<string, string>;
  body: LazyFile;
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
    const maxChunkSize = options.maxChunkSize ?? 512000; // Default 500KB
    
    // Get file metadata from FileService
    const file = await this.fileService.getFileById(fileId);
    const fileSize = file.size;
    const mimeType = file.mimeType;

    // Handle Range requests
    if (rangeHeader) {
      const rangeResult = this.parseRangeHeader(rangeHeader, fileSize, maxChunkSize);
      
      if (!rangeResult) {
        // Invalid range - return 416 Range Not Satisfiable
        throw new Error(`Invalid range: ${rangeHeader}`);
      }

      const { start, end, contentLength } = rangeResult;
      
      // Create stream with range
      const lazyFile = await this.fileService.createLazyFile(fileId, {
        start,
        end,
      });

      // Build Range response headers
      const headers = this.buildRangeHeaders(start, end, fileSize, mimeType, contentLength);

      return {
        status: 206, // Partial Content
        headers,
        body: lazyFile,
      };
    }

    // No Range header - return full file
    const lazyFile = await this.fileService.createLazyFile(fileId);
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
   * @param maxChunkSize - Maximum allowed chunk size (default 500KB)
   * @returns Parsed range with enforced limits, or null if invalid
   */
  parseRangeHeader(
    rangeHeader: string,
    fileSize: number,
    maxChunkSize = 512000,
  ): RangeResult | null {
    // Parse "bytes=start-end" format
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match) {
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
   */
  buildRangeHeaders(
    start: number,
    end: number,
    totalSize: number,
    mimeType: string,
    contentLength: number,
  ): Record<string, string> {
    return {
      'Content-Range': `bytes ${start.toString()}-${end.toString()}/${totalSize.toString()}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength.toString(),
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    };
  }

  /**
   * Build headers for full file response (200 OK)
   */
  buildFullFileHeaders(
    fileSize: number,
    mimeType: string,
  ): Record<string, string> {
    return {
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize.toString(),
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    };
  }
}
