import { Injectable, Inject, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DATABASE_CONNECTION } from '@/core/modules/database/database-connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { tsMigration } from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { Migration } from '../interfaces/migration.interface';
import { MigrationRegistry } from '../migration.registry';

export interface MigrationResult {
  id: string;
  description: string;
  status: 'success' | 'failed' | 'skipped';
  executionTimeMs?: number;
  error?: string;
}

/**
 * Service for running TypeScript-based migrations with full transaction support.
 * Each migration runs in its own isolated transaction.
 */
@Injectable()
export class MigrationRunnerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly registry: MigrationRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Run all pending TypeScript migrations
   */
  async runPendingMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    // Ensure migration tracking table exists
    await this.ensureMigrationTable();

    // Get all registered migrations
    const migrationClasses = this.registry.getAll();
    
    if (migrationClasses.length === 0) {
      console.log('ℹ️  No TypeScript migrations registered');
      return results;
    }

    // Get already executed migrations
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.id));

    console.log(`📋 Found ${migrationClasses.length} registered TypeScript migrations`);
    console.log(`✅ ${executedIds.size} already executed`);

    // Execute pending migrations
    for (const MigrationClass of migrationClasses) {
      // Resolve the migration instance with DI
      const migration = await this.moduleRef.create(MigrationClass);
      
      if (executedIds.has(migration.id)) {
        console.log(`⏭️  Skipping already executed migration: ${migration.id}`);
        results.push({
          id: migration.id,
          description: migration.description,
          status: 'skipped',
        });
        continue;
      }

      const result = await this.runMigration(migration);
      results.push(result);

      if (result.status === 'failed') {
        console.error(`❌ Migration ${migration.id} failed, stopping execution`);
        break;
      }
    }

    return results;
  }

  /**
   * Run a single migration within a transaction
   */
  private async runMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log(`\n🔄 Running migration: ${migration.id}`);
    console.log(`   Description: ${migration.description}`);

    try {
      // Run migration in a transaction
      await this.db.transaction(async (tx) => {
        // Execute the migration logic
        await migration.up(tx as NodePgDatabase<typeof schema>);

        // Record success in migration tracking table
        await tx.insert(tsMigration).values({
          id: migration.id,
          description: migration.description,
          success: true,
          executionTimeMs: String(Date.now() - startTime),
        });
      });

      const executionTime = Date.now() - startTime;
      console.log(`✅ Migration ${migration.id} completed in ${executionTime}ms`);

      return {
        id: migration.id,
        description: migration.description,
        status: 'success',
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Migration ${migration.id} failed:`, errorMessage);

      // Record failure (outside transaction since transaction was rolled back)
      try {
        await this.db.insert(tsMigration).values({
          id: migration.id,
          description: migration.description,
          success: false,
          errorMessage,
          executionTimeMs: String(executionTime),
        });
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }

      return {
        id: migration.id,
        description: migration.description,
        status: 'failed',
        executionTimeMs: executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Get list of executed migrations from database
   */
  private async getExecutedMigrations() {
    try {
      return await this.db
        .select()
        .from(tsMigration)
        .where(eq(tsMigration.success, true));
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Ensure the migration tracking table exists
   */
  private async ensureMigrationTable(): Promise<void> {
    try {
      // Try to query the table to see if it exists
      await this.db.select().from(tsMigration).limit(1);
    } catch (error) {
      // Table doesn't exist, create it
      console.log('📝 Creating ts_migration tracking table...');
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS ts_migration (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW() NOT NULL,
          success BOOLEAN DEFAULT TRUE NOT NULL,
          error_message TEXT,
          execution_time_ms TEXT
        )
      `);
    }
  }

  /**
   * Get migration status (executed vs pending)
   */
  async getMigrationStatus() {
    await this.ensureMigrationTable();
    
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));
    
    const registered = this.registry.getIds();
    const pending = registered.filter(id => !executedIds.has(id));

    return {
      total: registered.length,
      executed: executed.length,
      pending: pending.length,
      executedMigrations: executed,
      pendingMigrations: pending,
    };
  }
}
