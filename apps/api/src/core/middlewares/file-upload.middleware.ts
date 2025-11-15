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

          // Convert each Multer file to Web API File object
          // For large files (videos), use lazy loading to avoid memory issues
          if (multerFiles && multerFiles.length > 0) {
            for (const multerFile of multerFiles) {
              // For videos larger than 10MB, create File object without reading entire file
              const isLargeFile = multerFile.size > 10 * 1024 * 1024;
              
              let webFile: File;
              if (isLargeFile) {
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
          
          next();
        } catch (error) {
          next(error as Error);
        }
      })();
    });
  }
}
