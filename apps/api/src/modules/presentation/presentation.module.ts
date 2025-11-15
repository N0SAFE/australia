import { Module } from '@nestjs/common';
import { PresentationService } from './services/presentation.service';
import { PresentationRepository } from './repositories/presentation.repository';
import { PresentationController } from './controllers/presentation.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [PresentationService, PresentationRepository],
  controllers: [PresentationController],
  exports: [PresentationService],
})
export class PresentationModule {}
