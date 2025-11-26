import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../core/modules/database/database-connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../config/drizzle/schema';
import { MigrationRunnerService } from '../../core/migration/services/migration-runner.service';

interface MigrateOptions {
  status?: boolean;
}

@Injectable()
@Command({ 
  name: 'migrate', 
  description: 'Run database migrations (SQL and TypeScript interleaved)',
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

    try {
      const results = await this.migrationRunner.runAllMigrations();
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      console.log(`\n📊 Migration summary:`);
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ⏭️  Skipped: ${skipped}`);
      if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}`);
        throw new Error('Some migrations failed');
      }

      console.log('\n✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async showStatus(): Promise<void> {
    console.log('📊 Migration Status\n');
    
    const status = await this.migrationRunner.getMigrationStatus();
    
    console.log(`Total migrations: ${status.total}`);
    console.log(`Executed: ${status.executed}`);
    console.log(`Pending: ${status.pending}\n`);

    if (status.executedMigrations.length > 0) {
      console.log('✅ Executed migrations:');
      for (const m of status.executedMigrations) {
        const time = m.executionTimeMs ? ` (${m.executionTimeMs}ms)` : '';
        const type = m.id.includes('.ts') ? '[TS]' : '[SQL]';
        console.log(`   ${type} ${m.id}${time}`);
      }
      console.log();
    }

    if (status.pendingMigrations.length > 0) {
      console.log('⏳ Pending migrations:');
      for (const id of status.pendingMigrations) {
        const type = id.includes('.ts') ? '[TS]' : '[SQL]';
        console.log(`   ${type} ${id}`);
      }
    }
  }

  @Option({
    flags: '--status',
    description: 'Show migration status without running migrations',
  })
  parseStatus(): boolean {
    return true;
  }
}