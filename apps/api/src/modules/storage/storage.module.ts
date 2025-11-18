import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageController } from './controllers/storage.controller';
import { FileMetadataService } from './services/file-metadata.service';
import { FileMetadataRepository } from './repositories/file-metadata.repository';
import { StorageEventService } from './events/storage.event';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { EventsModule } from '@/core/modules/events/events.module';
import { VideoProcessingModule } from '@/core/modules/video-processing';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    // Configure video processing with storage-specific implementations
    VideoProcessingModule.forFeature({
      repository: FileMetadataRepository,
      events: StorageEventService,
    }),
  ],
  controllers: [StorageController],
  providers: [
    StorageService,
    FileMetadataService,
    FileMetadataRepository,
    StorageEventService,
  ],
  exports: [
    StorageService,
    FileMetadataService,
    FileMetadataRepository,
    StorageEventService,
  ],
})
export class StorageModule {}
