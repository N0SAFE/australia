import { Injectable, Logger } from '@nestjs/common';
import multer from 'multer';
import { multerConfig, UPLOADS_DIR } from '../../../config/multer.config';
import { EnvService } from '../../../config/env/env.service';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Service to handle file upload processing
 * Converts Multer files to Web API File objects
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly upload: multer.Multer;

  constructor(private readonly envService: EnvService) {
    // Use centralized multer config with 500MB limit
    this.upload = multer({
      ...multerConfig,
      limits: {
        ...multerConfig.limits,
        files: 10, // Max 10 files per request
      },
    });
  }

  /**
   * Get the configured multer instance
   */
  getMulterInstance(): multer.Multer {
    return this.upload;
  }

  /**
   * Get subdirectory based on mimetype
   * @param mimetype - The file's mimetype
   * @returns Subdirectory name (videos/audio/images/files)
   */
  getSubdirectory(mimetype: string): string {
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('image/')) return 'images';
    return 'files';
  }

  /**
   * Get relative path for a file (subdirectory + filename)
   * @param mimetype - The file's mimetype
   * @param filename - The server-generated filename
   * @returns Relative path (e.g., "videos/abc123.mp4")
   */
  getRelativePath(mimetype: string, filename: string): string {
    const subdir = this.getSubdirectory(mimetype);
    return `${subdir}/${filename}`;
  }

  /**
   * Get the full absolute path to an uploaded file
   * @param filename - The server-generated filename (from file.name)
   * @param mimetype - The file's mimetype to determine subdirectory
   * @returns Full absolute path to the file on disk
   */
  getFilePath(filename: string, mimetype: string): string {
    const subdir = this.getSubdirectory(mimetype);
    return join(UPLOADS_DIR, subdir, filename);
  }

  /**
   * Create a Web API File object from multer file
   * The file.name will be the server-generated filename for storage
   * Controllers can access the stored file path via file.name
   */
  async createWebFile(multerFile: Express.Multer.File): Promise<File> {
    // For videos and large files, create File object without reading entire file
    const isLargeFile = multerFile.size > 10 * 1024 * 1024;

    let webFile: File;
    if (isLargeFile) {
      // Use server-generated filename so controllers can reference it
      webFile = new File([], multerFile.filename, {
        type: multerFile.mimetype,
      });
      // Override size property to reflect actual file size
      Object.defineProperty(webFile, 'size', {
        value: multerFile.size,
        writable: false,
      });
    } else {
      // For small files, read into memory
      const buffer = await readFile(multerFile.path);
      // Use server-generated filename
      webFile = new File([buffer], multerFile.filename, {
        type: multerFile.mimetype,
      });
    }

    return webFile;
  }

  /**
   * Set nested property in an object using dot notation path
   * Example: setNestedProperty(obj, 'user.profile.avatar', file) 
   * creates obj.user.profile.avatar = file
   */
  private setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    // Navigate to the parent of the final property
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      // Type narrowing: ensure we're working with an object
      const next = current[part];
      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        current[part] = {};
        current = current[part] as Record<string, unknown>;
      } else {
        current = next as Record<string, unknown>;
      }
    }

    // Set the final property
    const finalKey = parts[parts.length - 1];
    current[finalKey] = value;
  }

  /**
   * Process multer files and convert them to Web API File objects
   * Handles nested file fields with dot notation (e.g., "user.avatar", "profile.images.0")
   * Groups files by fieldname and returns a body object with converted files
   * 
   * Supported patterns:
   * - z.file() → fieldname: File
   * - z.array(z.file()) → fieldname: File[]
   * - z.object({ nested: z.file() }) → fieldname.nested: File
   * - z.object({ nested: z.object({ deep: z.file() }) }) → fieldname.nested.deep: File
   */
  async processUploadedFiles(
    multerFiles: Express.Multer.File[] | undefined,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = { ...body };

    if (!multerFiles || multerFiles.length === 0) {
      return result;
    }

    // Group files by fieldname to support multiple files per field
    const filesByField = new Map<string, Express.Multer.File[]>();

    for (const multerFile of multerFiles) {
      const existing = filesByField.get(multerFile.fieldname) ?? [];
      existing.push(multerFile);
      filesByField.set(multerFile.fieldname, existing);
    }

    // Convert each Multer file to Web API File object
    for (const [fieldname, files] of filesByField.entries()) {
      if (files.length === 1) {
        // Single file - attach to nested path if contains dots
        const multerFile = files[0];
        const webFile = await this.createWebFile(multerFile);
        
        if (fieldname.includes('.')) {
          this.setNestedProperty(result, fieldname, webFile);
        } else {
          result[fieldname] = webFile;
        }
        
        this.logger.debug(`Processed single file for field "${fieldname}": ${multerFile.filename} (${String(multerFile.size)} bytes)`);
      } else {
        // Multiple files - attach as array to nested path if contains dots
        const webFiles: File[] = [];
        for (const multerFile of files) {
          const webFile = await this.createWebFile(multerFile);
          webFiles.push(webFile);
        }
        
        if (fieldname.includes('.')) {
          this.setNestedProperty(result, fieldname, webFiles);
        } else {
          result[fieldname] = webFiles;
        }
        
        this.logger.debug(`Processed ${String(files.length)} files for field "${fieldname}"`);
      }
    }

    return result;
  }
}
