import { Module } from '@nestjs/common';
import { EnvModule } from '@/config/env/env.module';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { FileMetadataService } from './services/file-metadata.service';
import { FileRangeService } from './services/file-range.service';
import { FileService } from './services/file.service';
import { FileUploadRepository } from './repositories/file-upload.repository';

/**
 * File Module
 * 
 * Unified module for all file operations:
 * - Storage abstraction (local filesystem, S3, Azure, etc.)
 * - Path management
 * - Stream creation (integrated in FileService)
 * - Video streaming with Range support
 * - File metadata
 * - File uploads with namespace organization
 * 
 * Services exported for use in other modules:
 * - FileMetadataService - File information retrieval
 * - FileRangeService - File streaming with Range requests (video, audio, any file type)
 * - FileService - Comprehensive file operations (upload, get, delete, paths, streams)
 * 
 * Replaces the deprecated FileUploadModule.
 */
@Module({
  imports: [
    EnvModule,
    DatabaseModule, // For FileUploadRepository to access DatabaseService
  ],
  providers: [
    // Storage Provider (injectable via 'STORAGE_PROVIDER' token)
    {
      provide: 'STORAGE_PROVIDER',
      useClass: LocalStorageProvider,
    },
    // Core Services
    FileMetadataService,
    FileRangeService,
    // File Management Services (migrated from FileUploadModule)
    FileService,
    FileUploadRepository,
  ],
  exports: [
    'STORAGE_PROVIDER',
    FileMetadataService,
    FileRangeService,
    FileService, // Export for use in other modules
  ],
})
export class FileModule {}
