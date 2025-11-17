import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageController } from './controllers/storage.controller';
import { FileMetadataService } from './services/file-metadata.service';
import { FileMetadataRepository } from './repositories/file-metadata.repository';
import { VideoProcessingService } from './services/video-processing.service';
import { FileProcessingGateway } from './gateways/file-processing.gateway';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { EventsModule } from '@/core/modules/events/events.module';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [StorageController],
  providers: [
    StorageService,
    FileMetadataService,
    FileMetadataRepository,
    VideoProcessingService,
    FileProcessingGateway,
  ],
  exports: [
    StorageService,
    FileMetadataService,
    FileMetadataRepository,
    VideoProcessingService,
    FileProcessingGateway,
  ],
})
export class StorageModule {}
