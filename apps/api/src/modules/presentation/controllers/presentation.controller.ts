import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';
import { PresentationService } from '../services/presentation.service';
import { FileUploadService } from '@/core/modules/file-upload/file-upload.service';
import { presentationContract } from '@repo/api-contracts';
import { readFile } from 'fs/promises';

@Controller()
export class PresentationController {
  
  constructor(
    private readonly presentationService: PresentationService,
    private readonly fileUploadService: FileUploadService
  ) {}

  /**
   * Upload presentation video endpoint - implements ORPC contract with file upload
   * File is parsed by FileUploadMiddleware which provides a clean File object
   * with the server-generated filename as file.name
   */
  @Implement(presentationContract.upload)
  upload() {
    return implement(presentationContract.upload).handler(async ({ input }) => {
      try {
        const file: File = input;
        
        if (!file) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'No file uploaded',
          });
        }

        // Get full path from FileUploadService using file properties
        const fullPath = this.fileUploadService.getFilePath(file.name, file.type);
        
        // Create Express.Multer.File using clean File properties
        // file.name contains the server-generated filename from multer
        const multerFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: file.name, // This is actually the server-generated filename
          encoding: '7bit',
          mimetype: file.type,
          size: file.size,
          destination: '',
          filename: file.name, // Server-generated filename
          path: fullPath, // Full absolute path from FileUploadService
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

  /**
   * Subscribe to video processing progress (async iterator)
   */
  @Implement(presentationContract.subscribeProcessingProgress)
  subscribeProcessingProgress() {
    const self = this
    return implement(presentationContract.subscribeProcessingProgress).handler(async function* () {
      try {
        // Subscribe to the event service and yield progress updates
        const iterator = self.presentationService.subscribeProcessingProgress();
        
        try {
          for await (const event of iterator) {
            yield event;
          }
        } finally {
          // Always clean up the iterator
          try {
            if (iterator.return) {
              await iterator.return(undefined);
            }
          } catch (cleanupError) {
            console.error('[PresentationController] Error cleaning up iterator:', cleanupError);
            console.error('[PresentationController] Cleanup error stack:', cleanupError instanceof Error ? cleanupError.stack : 'No stack trace');
          }
        }
      } catch (error) {
        console.error('[PresentationController] Error in subscribeProcessingProgress:', error);
        console.error('[PresentationController] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: error instanceof Error ? error.message : 'Failed to subscribe to processing progress',
        });
      }
      
      console.log('[PresentationController] subscribeProcessingProgress completed')
    });
  }
}
