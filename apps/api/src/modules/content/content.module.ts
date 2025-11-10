import { Module } from '@nestjs/common';
import { ContentService } from './services/content.service';
import { ContentController } from './controllers/content.controller';
import { ContentRepository } from './repositories/content.repository';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ContentService, ContentRepository],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
