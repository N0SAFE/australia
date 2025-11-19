import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageController } from './controllers/storage.controller';
import { FileMetadataService } from './services/file-metadata.service';
import { FileMetadataRepository } from './repositories/file-metadata.repository';
import { StorageEventService } from './events/storage.event';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { EventsModule } from '@/core/modules/events/events.module';
import { VideoProcessingModule } from '@/core/modules/video-processing';
import { FileStorageModule } from '@/core/modules/file-storage/file-storage.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    VideoProcessingModule,
    FileStorageModule,
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
