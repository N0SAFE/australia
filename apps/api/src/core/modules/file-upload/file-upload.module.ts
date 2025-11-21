import { Module, Global } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadMiddleware } from './file-upload.middleware';

/**
 * Global file upload module
 * Provides file upload processing service and middleware
 * Available to all modules without explicit import
 */
@Global()
@Module({
  providers: [FileUploadService, FileUploadMiddleware],
  exports: [FileUploadService, FileUploadMiddleware],
})
export class FileUploadModule {}
