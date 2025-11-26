import { Module, OnModuleInit } from '@nestjs/common';
import { EnvModule } from '../config/env/env.module';
import { DatabaseModule } from '../core/modules/database/database.module';
import { AuthModule } from '../core/modules/auth/auth.module';
import { FileModule } from '../core/modules/file/file.module';
import { StorageModule } from '../modules/storage/storage.module';
import { MigrationModule } from '../core/migration/migration.module';
import { MigrationRegistry } from '../core/migration/migration.registry';
import { MIGRATIONS } from '../core/migration/migrations';
import { DATABASE_CONNECTION } from '../core/modules/database/database-connection';
import { SeedCommand } from './commands/seed.command';
import { MigrateCommand } from './commands/migrate.command';
import { ResetCommand } from './commands/reset.command';
import { CreateDefaultAdminCommand } from './commands/create-default-admin.command';
import { createBetterAuth } from '@/config/auth/auth';
import { EnvService } from '@/config/env/env.service';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    FileModule,
    StorageModule,
    MigrationModule,
    AuthModule.forRootAsync({
      imports: [DatabaseModule, EnvModule],
      useFactory: createBetterAuth,
      inject: [DATABASE_CONNECTION, EnvService],
    }),
  ],
  providers: [
    SeedCommand,
    MigrateCommand,
    ResetCommand,
    CreateDefaultAdminCommand,
  ],
})
export class CLIModule implements OnModuleInit {
  constructor(private readonly migrationRegistry: MigrationRegistry) {}

  /**
   * Register all TypeScript migrations when the module initializes
   */
  onModuleInit() {
    for (const migration of MIGRATIONS) {
      this.migrationRegistry.register(migration);
    }
  }
}