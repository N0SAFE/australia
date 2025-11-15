import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';
import { PresentationService } from '../services/presentation.service';
import { presentationContract } from '@repo/api-contracts';
import { readFile } from 'fs/promises';

// Interface for ORPC input with Multer file metadata
interface MulterFileInput {
  file: File;
  _multerFiles?: {
    file?: {
      filename: string;
      originalname: string;
      path: string;
      size: number;
      mimetype: string;
    };
  };
}

@Controller()
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  /**
   * Upload presentation video endpoint - implements ORPC contract with file upload
   * File is parsed by FileUploadMiddleware:
   * - input.file: Web API File object (for ORPC validation)
   * - input._multerFiles.file: Multer metadata (for server-generated filename)
   */
  @Implement(presentationContract.upload)
  upload() {
    return implement(presentationContract.upload).handler(async ({ input }) => {
      try {
        // Get Multer file metadata for server-generated filename
        const multerInput = input as unknown as MulterFileInput;
        const multerMetadata = multerInput._multerFiles?.file;
        
        if (!multerMetadata) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'No file uploaded or file metadata missing',
          });
        }

        // Create Express.Multer.File from metadata
        const multerFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: multerMetadata.originalname,
          encoding: '7bit',
          mimetype: multerMetadata.mimetype,
          size: multerInput.file.size,
          destination: '',
          filename: multerMetadata.filename,
          path: multerMetadata.path,
          buffer: Buffer.from([]),
        } as Express.Multer.File;

        const result = await this.presentationService.uploadVideo(multerFile);
        
        return result;
      } catch (error) {
        console.error('[PresentationController] Error in upload:', error);
        throw error;
      }
    });
  }

  /**
   * Get current presentation video metadata
   */
  @Implement(presentationContract.getCurrent)
  getCurrent() {
    return implement(presentationContract.getCurrent).handler(async () => {
      return await this.presentationService.getCurrentVideo();
    });
  }

  /**
   * Stream presentation video file
   */
  @Implement(presentationContract.getVideo)
  getVideo() {
    return implement(presentationContract.getVideo).handler(async () => {
      try {
        const videoPath = await this.presentationService.getVideoPath();
        const currentVideo = await this.presentationService.getCurrentVideo();
        
        if (!currentVideo) {
          throw new ORPCError('NOT_FOUND', {
            message: 'No presentation video found',
          });
        }
        
        // Read file
        const buffer = await readFile(videoPath);
        
        // Return as File object
        return new File([buffer], currentVideo.filename, { 
          type: currentVideo.mimeType 
        });
      } catch (error) {
        console.error('[PresentationController] Error in getVideo:', error);
        if (error instanceof ORPCError) {
          throw error;
        }
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to stream video',
        });
      }
    });
  }

  /**
   * Delete presentation video
   */
  @Implement(presentationContract.delete)
  delete() {
    return implement(presentationContract.delete).handler(async () => {
      try {
        await this.presentationService.deleteVideo();
        return { 
          success: true, 
          message: 'Presentation video deleted successfully' 
        };
      } catch (error) {
        console.error('[PresentationController] Error in delete:', error);
        return { 
          success: false, 
          message: 'Failed to delete presentation video' 
        };
      }
    });
  }
}
