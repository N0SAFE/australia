import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { multerConfig } from '../../config/multer.config';
import { EnvService } from '../../config/env/env.service';

/**
 * NestJS Middleware to parse multipart/form-data uploads
 * This runs BEFORE ORPC processes the request
 */
@Injectable()
export class FileUploadMiddleware implements NestMiddleware {
  private upload: multer.Multer;

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

  use(req: Request, res: Response, next: NextFunction) {
    const contentType = req.headers['content-type'] ?? '';

    console.log('[FileUploadMiddleware] Request:', {
      method: req.method,
      url: req.url,
      contentType,
      contentLength: req.headers['content-length'],
    });

    // Only handle multipart/form-data requests
    if (!contentType.includes('multipart/form-data')) {
      // Not multipart, pass through
      next();
      return;
    }

    console.log('[FileUploadMiddleware] Parsing multipart data...');

    // Parse all fields using multer (supports multiple files)
    this.upload.any()(req, res, (err) => {
      if (err) {
        console.error('[FileUploadMiddleware] Multer error:', {
          message: err.message,
          code: (err as any).code,
          field: (err as any).field,
          storageErrors: (err as any).storageErrors,
        });
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

          console.log('[FileUploadMiddleware] Files parsed:', {
            fileCount: multerFiles?.length ?? 0,
            files: multerFiles?.map(f => ({ fieldname: f.fieldname, filename: f.filename, mimetype: f.mimetype })),
            bodyFields: Object.keys(body),
          });

          // Convert each Multer file to Web API File object
          // For large files (videos), use lazy loading to avoid memory issues
          if (multerFiles && multerFiles.length > 0) {
            for (const multerFile of multerFiles) {
              // For videos larger than 10MB, create File object without reading entire file
              const isLargeFile = multerFile.size > 10 * 1024 * 1024;
              
              let webFile: File;
              if (isLargeFile) {
                // Create a minimal File object - actual file is on disk
                // We'll use multer metadata for server operations
                console.log('[FileUploadMiddleware] Large file detected, using lazy loading:', {
                  size: multerFile.size,
                  filename: multerFile.originalname,
                });
                webFile = new File([], multerFile.originalname, {
                  type: multerFile.mimetype,
                });
                // Override size property to reflect actual file size
                Object.defineProperty(webFile, 'size', {
                  value: multerFile.size,
                  writable: false,
                });
              } else {
                // For small files, read into memory as before
                const buffer = await readFile(multerFile.path);
                webFile = new File([buffer], multerFile.originalname, {
                  type: multerFile.mimetype,
                });
              }

              console.log('[FileUploadMiddleware] Converted file to Web API File:', {
                fieldname: multerFile.fieldname,
                name: webFile.name,
                size: webFile.size,
                type: webFile.type,
                lazy: isLargeFile,
              });

              // Inject the File object into the body for ORPC to parse
              // ORPC will see this in input[fieldname]
              body[multerFile.fieldname] = webFile;
              
              // Also keep multer file metadata under a special key for accessing the generated filename
              body._multerFiles ??= {};
              (body._multerFiles as Record<string, any>)[multerFile.fieldname] = {
                filename: multerFile.filename,
                originalname: multerFile.originalname,
                path: multerFile.path,
                size: multerFile.size,
                mimetype: multerFile.mimetype,
              };
            }
          }

          // Update request body with converted files
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (req as any).body = body;

          console.log('[FileUploadMiddleware] Continuing to ORPC handler with body:', {
            fields: Object.keys(body),
            hasFiles: !!body._multerFiles,
          });
          
          next();
        } catch (error) {
          console.error('[FileUploadMiddleware] Error converting files:', error);
          next(error as Error);
        }
      })();
    });
  }
}
