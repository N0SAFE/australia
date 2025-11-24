import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageController } from './controllers/storage.controller';
import { StorageEventService } from './events/storage.event';
import { DatabaseModule } from '@/core/modules/database/database.module';
import { EventsModule } from '@/core/modules/events/events.module';
import { VideoProcessingModule } from '@/core/modules/video-processing';
import { FileModule } from '@/core/modules/file/file.module';


@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    VideoProcessingModule,
    FileModule,
  ],
  controllers: [StorageController],
  providers: [
    StorageService,
    StorageEventService,
  ],
  exports: [
    StorageService,
    StorageEventService,
  ],
})
export class StorageModule {}
