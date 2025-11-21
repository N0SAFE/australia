import { Module } from "@nestjs/common";
import { CapsuleService } from './services/capsule.service';
import { CapsuleRepository } from './repositories/capsule.repository';
import { CapsuleController } from './controllers/capsule.controller';
import { DatabaseModule } from '../../core/modules/database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [DatabaseModule, StorageModule],
    controllers: [CapsuleController],
    providers: [CapsuleService, CapsuleRepository],
    exports: [CapsuleService, CapsuleRepository],
})
export class CapsuleModule {}
