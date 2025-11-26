import { Module, Global } from '@nestjs/common';
import { MigrationRegistry } from './migration.registry';
import { MigrationRunnerService } from './services/migration-runner.service';
import { DatabaseModule } from '../modules/database/database.module';

/**
 * Global module for TypeScript-based migrations.
 * Provides migration registry and runner services.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    MigrationRegistry,
    MigrationRunnerService,
  ],
  exports: [
    MigrationRegistry,
    MigrationRunnerService,
  ],
})
export class MigrationModule {}
