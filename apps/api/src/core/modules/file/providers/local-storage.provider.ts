import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, promises as fs } from 'fs';
import type { ReadStream } from 'fs';
import { dirname, join } from 'path';
import { lookup } from 'mime-types';
import type {
  FileStats,
  IStorageProvider,
  StreamOptions,
} from '../interfaces/storage-provider.interface';
import { EnvService } from '@/config/env/env.service';

/**
 * Local Filesystem Storage Provider
 * 
 * Implements IStorageProvider for local filesystem operations.
 * Uses UPLOADS_DIR environment variable as base directory.
 * 
 * Features:
 * - File operations: save, delete, exists, stats
 * - Stream creation with range support
 * - Directory management
 * - MIME type detection
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly baseDirectory: string;

  constructor(private readonly envService: EnvService) {
    const uploadsDir = this.envService.get('UPLOADS_DIR');
    if (!uploadsDir) {
      throw new Error('UPLOADS_DIR environment variable is not set');
    }
    this.baseDirectory = uploadsDir;
  }

  getBaseDirectory(): string {
    return this.baseDirectory;
  }

  getAbsolutePath(relativePath: string): string {
    return join(this.baseDirectory, relativePath);
  }

  buildRelativePath(namespace: string[], filename: string): string {
    return join(...namespace, filename);
  }

  exists(relativePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(relativePath);
    return Promise.resolve(existsSync(absolutePath));
  }

  async save(file: File, relativePath: string): Promise<string> {
    const absolutePath = this.getAbsolutePath(relativePath);
    
    // Ensure directory exists
    await this.ensureDirectory(dirname(relativePath));
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);
    
    return absolutePath;
  }

  async delete(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    await fs.unlink(absolutePath);
  }

  async getStats(relativePath: string): Promise<FileStats> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const stats = await fs.stat(absolutePath);
    
    // Detect MIME type from extension, fallback to 'application/octet-stream'
    const mimeType = lookup(relativePath) || 'application/octet-stream';
    
    return {
      size: stats.size,
      mimeType,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  async getSize(relativePath: string): Promise<number> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const stats = await fs.stat(absolutePath);
    return stats.size;
  }

  createReadStream(
    relativePath: string,
    options?: StreamOptions,
  ): Promise<ReadStream> {
    const absolutePath = this.getAbsolutePath(relativePath);
    return Promise.resolve(createReadStream(absolutePath, options));
  }

  async ensureDirectory(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    await fs.mkdir(absolutePath, { recursive: true });
  }
}
