import { Module } from '@nestjs/common';
import { PresentationService } from './services/presentation.service';
import { PresentationRepository } from './repositories/presentation.repository';
import { PresentationController } from './controllers/presentation.controller';
import { PresentationEventService } from './events/presentation.event';
import { FileUploadModule } from '@/core/modules/file-upload/file-upload.module';
import { VideoProcessingModule } from '@/core/modules/video-processing';

@Module({
  imports: [
    FileUploadModule,
    VideoProcessingModule,
  ],
  providers: [PresentationService, PresentationRepository, PresentationEventService],
  controllers: [PresentationController],
  exports: [PresentationService, PresentationEventService],
})
export class PresentationModule {}
