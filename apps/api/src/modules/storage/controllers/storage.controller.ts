import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';
import { StorageService } from '../services/storage.service';
import { storageContract } from '@repo/api-contracts';
import { readFile } from 'fs/promises';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload image endpoint - implements ORPC contract with file upload
   * File is parsed by FileUploadMiddleware:
   * - input.file: Web API File object (for ORPC validation)
   * - input._multerFiles.file: Multer metadata (for server-generated filename)
   */
  @Implement(storageContract.uploadImage)
  uploadImage() {
    return implement(storageContract.uploadImage).handler(({ input }) => {
      try {
        console.log('[StorageController] uploadImage handler called');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.log('[StorageController] Raw input keys:', Object.keys(input as any));
        console.log('[StorageController] input.file type:', typeof input.file);
        console.log('[StorageController] input.file constructor:', input.file.constructor.name);
        console.log('[StorageController] input.file instanceof File:', input.file instanceof File);
        
        // Get Multer file metadata for server-generated filename
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;
        
        console.log('[StorageController] File info:', {
          hasInputFile: !!input.file,
          inputFileName: input.file.name,
          inputFileSize: input.file.size,
          hasMulterMetadata: !!multerMetadata,
          serverFilename: multerMetadata?.filename,
        });

        if (!multerMetadata) {
          console.error('[StorageController] NO MULTER METADATA!');
          throw new ORPCError('BAD_REQUEST', {
            message: 'No file metadata found',
          });
        }

        console.log('[StorageController] uploadImage successful:', {
          originalName: input.file.name,
          serverFilename: multerMetadata.filename,
          size: input.file.size,
          mimeType: input.file.type,
        });

        return {
          filename: multerMetadata.filename,
          path: `/storage/files/${multerMetadata.filename}`,
          size: input.file.size,
          mimeType: input.file.type,
        };
      } catch (error) {
        console.error('[StorageController] Error in uploadImage:', error);
        throw error;
      }
    });
  }

  /**
   * Upload video endpoint - implements ORPC contract with file upload
   * File is parsed by FileUploadMiddleware:
   * - input.file: Web API File object (for ORPC validation)
   * - input._multerFiles.file: Multer metadata (for server-generated filename)
   */
  @Implement(storageContract.uploadVideo)
  uploadVideo() {
    return implement(storageContract.uploadVideo).handler(({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;
      
      if (!input.file || !multerMetadata) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'No file uploaded',
        });
      }

      console.log('[StorageController] uploadVideo successful:', {
        originalName: input.file.name,
        serverFilename: multerMetadata.filename,
        size: input.file.size,
        mimeType: input.file.type,
      });

      return {
        filename: multerMetadata.filename,
        path: `/storage/files/${multerMetadata.filename}`,
        size: input.file.size,
        mimeType: input.file.type,
      };
    });
  }

  /**
   * Upload audio endpoint - implements ORPC contract with file upload
   * File is parsed by FileUploadMiddleware:
   * - input.file: Web API File object (for ORPC validation)
   * - input._multerFiles.file: Multer metadata (for server-generated filename)
   */
  @Implement(storageContract.uploadAudio)
  uploadAudio() {
    return implement(storageContract.uploadAudio).handler(({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const multerMetadata = (input as any)._multerFiles?.file as { filename: string; originalname: string; path: string; size: number; mimetype: string } | undefined;
      
      if (!input.file || !multerMetadata) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'No file uploaded',
        });
      }

      console.log('[StorageController] uploadAudio successful:', {
        originalName: input.file.name,
        serverFilename: multerMetadata.filename,
        size: input.file.size,
        mimeType: input.file.type,
      });

      return {
        filename: multerMetadata.filename,
        path: `/storage/files/${multerMetadata.filename}`,
        size: input.file.size,
        mimeType: input.file.type,
      };
    });
  }

  /**
   * Serve file endpoint - implements ORPC contract
   */
  @Implement(storageContract.getFile)
  getFile() {
    return implement(storageContract.getFile).handler(async ({ input }) => {
      const { filename } = input;
      
      console.log('[StorageController] getFile called with filename:', filename);
      
      // Check if file exists
      const exists = await this.storageService.fileExists(filename);
      console.log('[StorageController] File exists check result:', exists);
      
      if (!exists) {
        console.log('[StorageController] Throwing ORPCError for:', filename);
        throw new ORPCError('NOT_FOUND', {
          message: 'File not found',
        });
      }
      
      // Read file and metadata
      const filePath = this.storageService.getFilePath(filename);
      const [buffer, metadata] = await Promise.all([
        readFile(filePath),
        this.storageService.getFileMetadata(filename),
      ]);
      
      console.log('[StorageController] File read successfully:', filename);
      
      return new File([buffer], filename, { type: metadata.mimeType });
    });
  }
}
