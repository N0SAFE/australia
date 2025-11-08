import { Module } from "@nestjs/common";
import { CapsuleService } from './services/capsule.service';
import { CapsuleRepository } from './repositories/capsule.repository';
import { CapsuleController } from './controllers/capsule.controller';
import { DatabaseModule } from '../../core/modules/database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [CapsuleController],
    providers: [CapsuleService, CapsuleRepository],
    exports: [CapsuleService, CapsuleRepository],
})
export class CapsuleModule {}
