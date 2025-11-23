import { Module } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { FileUploadRepository } from './repositories/file-upload.repository';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { StorageModule } from '@/modules/storage/storage.module';

/**
 * Core File Upload Module
 * 
 * Provides centralized file upload functionality with namespace-based organization.
 * This is a core module that can be used across all features.
 * 
 * Features:
 * - Namespace-based file organization (e.g., ['capsule', 'video'] → capsule/video/{fileId}.ext)
 * - Layered architecture: Repository → Service pattern
 * - Support for image, video, audio, and raw files
 * - Video processing status tracking
 * 
 * Usage:
 * Import this module in any feature module that needs file upload:
 * 
 * @example
 * @Module({
 *   imports: [FileUploadModule],
 *   // ...
 * })
 * export class CapsuleModule {}
 * 
 * Then inject FileUploadService:
 * @example
 * constructor(private readonly fileUploadService: FileUploadService) {}
 * 
 * const result = await this.fileUploadService.uploadVideo(
 *   file,
 *   ['capsule', 'video'],
 *   userId
 * );
 */
@Module({
  imports: [
    DatabaseModule, // For FileUploadRepository to access DatabaseService
    StorageModule,  // For FileUploadService to access StorageService
  ],
  providers: [
    FileUploadRepository, // Database operations layer
    FileUploadService,    // Business logic layer
  ],
  exports: [
    FileUploadService, // Export service for use in other modules
  ],
})
export class FileUploadModule {}
