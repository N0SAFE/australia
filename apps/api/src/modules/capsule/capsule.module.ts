import { Module } from "@nestjs/common";
import { CapsuleService } from './services/capsule.service';
import { CapsuleRepository } from './repositories/capsule.repository';
import { CapsuleController } from './controllers/capsule.controller';
import { CapsuleEventService } from './events/capsule.event';
import { DatabaseModule } from '../../core/modules/database/database.module';
import { FileModule } from '@/core/modules/file/file.module';
import { VideoProcessingModule } from '@/core/modules/video-processing';
import { StorageModule } from '../storage/storage.module'; // Keep for StorageEventService

@Module({
    imports: [DatabaseModule, FileModule, VideoProcessingModule, StorageModule],
    controllers: [CapsuleController],
    providers: [CapsuleService, CapsuleRepository, CapsuleEventService],
    exports: [CapsuleService, CapsuleRepository, CapsuleEventService],
})
export class CapsuleModule {}
