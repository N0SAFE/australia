import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageController } from './controllers/storage.controller';
import { FileMetadataService } from './services/file-metadata.service';
import { DatabaseModule } from '@/core/modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StorageController],
  providers: [StorageService, FileMetadataService],
  exports: [StorageService, FileMetadataService],
})
export class StorageModule {}
