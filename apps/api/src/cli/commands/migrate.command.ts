import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Inject } from '@nestjs/common';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DATABASE_CONNECTION } from '../../core/modules/database/database-connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../config/drizzle/schema';
import { MigrationRunnerService } from '../../core/migration/services/migration-runner.service';

interface MigrateOptions {
  sqlOnly?: boolean;
  tsOnly?: boolean;
  status?: boolean;
}

@Injectable()
@Command({ 
  name: 'migrate', 
  description: 'Run database migrations (SQL and TypeScript)',
  options: { isDefault: false },
})
export class MigrateCommand extends CommandRunner {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly migrationRunner: MigrationRunnerService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: MigrateOptions): Promise<void> {
    // Show migration status
    if (options?.status) {
      await this.showStatus();
      return;
    }

    console.log('🔄 Running database migrations...\n');

    // Run SQL migrations (unless --ts-only flag is set)
    if (!options?.tsOnly) {
      await this.runSqlMigrations();
    }

    // Run TypeScript migrations (unless --sql-only flag is set)
    if (!options?.sqlOnly) {
      await this.runTypeScriptMigrations();
    }

    console.log('\n✅ All migrations completed successfully');
  }

  private async runSqlMigrations(): Promise<void> {
    console.log('📋 Running SQL migrations (Drizzle)...');
    
    try {
      await migrate(this.db, { 
        migrationsFolder: './src/config/drizzle/migrations',
      });
      console.log('✅ SQL migrations completed\n');
    } catch (error) {
      console.error('❌ SQL migration failed:', error);
      throw error;
    }
  }

  private async runTypeScriptMigrations(): Promise<void> {
    console.log('📋 Running TypeScript migrations...');
    
    try {
      const results = await this.migrationRunner.runPendingMigrations();
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      console.log(`\n📊 TypeScript migration summary:`);
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ⏭️  Skipped: ${skipped}`);
      if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}`);
        throw new Error('Some TypeScript migrations failed');
      }
    } catch (error) {
      console.error('❌ TypeScript migration failed:', error);
      throw error;
    }
  }

  private async showStatus(): Promise<void> {
    console.log('📊 Migration Status\n');
    
    const status = await this.migrationRunner.getMigrationStatus();
    
    console.log(`Total TypeScript migrations: ${status.total}`);
    console.log(`Executed: ${status.executed}`);
    console.log(`Pending: ${status.pending}\n`);

    if (status.executedMigrations.length > 0) {
      console.log('✅ Executed migrations:');
      for (const m of status.executedMigrations) {
        const time = m.executionTimeMs ? ` (${m.executionTimeMs}ms)` : '';
        console.log(`   - ${m.id}${time}`);
      }
      console.log();
    }

    if (status.pendingMigrations.length > 0) {
      console.log('⏳ Pending migrations:');
      for (const id of status.pendingMigrations) {
        console.log(`   - ${id}`);
      }
    }
  }

  @Option({
    flags: '--sql-only',
    description: 'Run only SQL migrations (skip TypeScript migrations)',
  })
  parseSqlOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--ts-only',
    description: 'Run only TypeScript migrations (skip SQL migrations)',
  })
  parseTsOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--status',
    description: 'Show migration status without running migrations',
  })
  parseStatus(): boolean {
    return true;
  }
}