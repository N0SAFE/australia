import { Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { FileUploadService } from './file-upload.service';

/**
 * Extended Request type with multer file properties
 */
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  body: Record<string, unknown>;
}

/**
 * NestJS Middleware to parse multipart/form-data uploads
 * This runs BEFORE ORPC processes the request
 * File storage only - video conversion is handled at controller level
 * 
 * Delegates file processing logic to FileUploadService
 */
@Injectable()
export class FileUploadMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FileUploadMiddleware.name);

  constructor(private readonly fileUploadService: FileUploadService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const contentType = req.headers['content-type'] ?? '';

    // Only handle multipart/form-data requests
    if (!contentType.includes('multipart/form-data')) {
      // Not multipart, pass through
      next();
      return;
    }

    // Get multer instance from service and parse all fields
    const upload = this.fileUploadService.getMulterInstance();
    
    upload.any()(req, res, (err) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        this.logger.error(`Multer error: ${errorMessage}`, errorStack);
        next(err);
        return;
      }

      // Process the multipart data and convert files to Web API File objects
      void (async () => {
        try {
          const multerReq = req as MulterRequest;
          const multerFiles = multerReq.files;
          const body = multerReq.body;

          // Use service to process uploaded files
          const processedBody = await this.fileUploadService.processUploadedFiles(
            multerFiles,
            body
          );

          // Update request body with converted files
          multerReq.body = processedBody;

          this.logger.debug(
            `Processed ${String(multerFiles?.length ?? 0)} files for ${String(Object.keys(processedBody).length)} fields`
          );

          next();
        } catch (error) {
          this.logger.error(
            `File processing error: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined
          );
          next(error as Error);
        }
      })();
    });
  }
}
