import { Module, Global } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';

/**
 * Global file storage module
 * Available to all modules without explicit import
 */
@Global()
@Module({
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
