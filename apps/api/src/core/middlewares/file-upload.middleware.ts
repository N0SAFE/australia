import { Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { multerConfig } from '../../config/multer.config';
import { EnvService } from '../../config/env/env.service';

/**
 * NestJS Middleware to parse multipart/form-data uploads
 * This runs BEFORE ORPC processes the request
 * File storage only - video conversion is handled at controller level
 */
@Injectable()
export class FileUploadMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FileUploadMiddleware.name);
  private upload: multer.Multer;

  constructor(
    private readonly envService: EnvService,
  ) {
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
   * Create a Web API File object from multer file
   * The file.name will be the server-generated filename for storage
   * Controllers can access the stored file path via file.name
   */
  private async createWebFile(
    multerFile: Express.Multer.File,
    readFile: (path: string) => Promise<Buffer>
  ): Promise<File> {
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

  use(req: Request, res: Response, next: NextFunction) {
    const contentType = req.headers['content-type'] ?? '';

    // Only handle multipart/form-data requests
    if (!contentType.includes('multipart/form-data')) {
      // Not multipart, pass through
      next();
      return;
    }

    // Parse all fields using multer (supports multiple files)
    this.upload.any()(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }

      // Process the multipart data and convert files to Web API File objects
      void (async () => {
        try {
          const { readFile } = await import('fs/promises');
          
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const multerFiles = (req as any).files as Express.Multer.File[] | undefined;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const body = ((req as any).body as Record<string, any> | undefined) ?? {};

          // Group files by fieldname to support multiple files per field
          const filesByField = new Map<string, Express.Multer.File[]>();
          
          if (multerFiles && multerFiles.length > 0) {
            for (const multerFile of multerFiles) {
              const existing = filesByField.get(multerFile.fieldname) ?? [];
              existing.push(multerFile);
              filesByField.set(multerFile.fieldname, existing);
            }
          }

          // Convert each Multer file to Web API File object
          for (const [fieldname, files] of filesByField.entries()) {
            if (files.length === 1) {
              // Single file - attach directly to field
              const multerFile = files[0];
              const webFile = await this.createWebFile(multerFile, readFile);
              body[fieldname] = webFile;
            } else {
              // Multiple files - attach as array
              const webFiles: File[] = [];
              for (const multerFile of files) {
                const webFile = await this.createWebFile(multerFile, readFile);
                webFiles.push(webFile);
              }
              body[fieldname] = webFiles;
            }
          }

          // Update request body with converted files
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (req as any).body = body;
          
          next();
        } catch (error) {
          next(error as Error);
        }
      })();
    });
  }
}
