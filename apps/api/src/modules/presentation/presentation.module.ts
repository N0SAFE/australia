import { Module } from '@nestjs/common';
import { PresentationService } from './services/presentation.service';
import { PresentationRepository } from './repositories/presentation.repository';
import { PresentationController } from './controllers/presentation.controller';
import { PresentationEventService } from './events/presentation.event';
import { VideoProcessingModule } from '@/core/modules/video-processing';
import { FileModule } from '@/core/modules/file';

@Module({
  imports: [
    FileModule, // Unified file module (replaces deprecated FileUploadModule)
    VideoProcessingModule,
  ],
  providers: [PresentationService, PresentationRepository, PresentationEventService],
  controllers: [PresentationController],
  exports: [PresentationService, PresentationEventService],
})
export class PresentationModule {}
