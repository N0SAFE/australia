import { Injectable, Inject, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DATABASE_CONNECTION } from '@/core/modules/database/database-connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { tsMigration } from '@/config/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { Migration } from '../interfaces/migration.interface';
import { MigrationRegistry } from '../migration.registry';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationResult {
  id: string;
  description: string;
  status: 'success' | 'failed' | 'skipped';
  executionTimeMs?: number;
  error?: string;
  type: 'sql' | 'ts';
}

interface MigrationEntry {
  id: string; // e.g., "0021_brave_hero" or "0022_epic_saga.ts"
  type: 'sql' | 'ts';
  index: number; // e.g., 21, 22
  migrationClass?: Type<Migration>;
  filePath?: string;
  description?: string;
}

/**
 * Service for running SQL and TypeScript migrations in interleaved order.
 * Migrations are sorted by their numeric index and executed sequentially.
 */
@Injectable()
export class MigrationRunnerService {
  private readonly migrationsFolder = './src/config/drizzle/migrations';

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly registry: MigrationRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Run all pending migrations (SQL and TypeScript) in interleaved order
   */
  async runAllMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    // Ensure migration tracking table exists
    await this.ensureMigrationTable();

    // Get all migrations (SQL + TS) sorted by index
    const allMigrations = await this.getAllMigrationsSorted();
    
    if (allMigrations.length === 0) {
      console.log('ℹ️  No migrations found');
      return results;
    }

    // Get already executed migrations
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.id));

    // Check Drizzle's __drizzle_migrations table for SQL migrations
    const sqlExecutedIds = await this.getDrizzleExecutedMigrations();
    executedIds.add(...sqlExecutedIds);

    console.log(`📋 Found ${allMigrations.length} total migrations`);
    console.log(`✅ ${executedIds.size} already executed\n`);

    // Execute pending migrations in order
    for (const migration of allMigrations) {
      if (executedIds.has(migration.id)) {
        console.log(`⏭️  Skipping [${migration.type.toUpperCase()}] ${migration.id}`);
        results.push({
          id: migration.id,
          description: migration.description || '',
          status: 'skipped',
          type: migration.type,
        });
        continue;
      }

      let result: MigrationResult;
      if (migration.type === 'sql') {
        result = await this.runSqlMigration(migration);
      } else {
        result = await this.runTsMigration(migration);
      }

      results.push(result);

      if (result.status === 'failed') {
        console.error(`❌ Migration ${migration.id} failed, stopping execution`);
        break;
      }
    }

    return results;
  }

  /**
   * Get all migrations (SQL and TS) sorted by index
   */
  private async getAllMigrationsSorted(): Promise<MigrationEntry[]> {
    const migrations: MigrationEntry[] = [];

    // Get SQL migrations from Drizzle migrations folder
    const sqlMigrations = this.getSqlMigrations();
    migrations.push(...sqlMigrations);

    // Get TypeScript migrations from registry
    const tsMigrations = this.getTsMigrations();
    migrations.push(...tsMigrations);

    // Sort by index
    migrations.sort((a, b) => a.index - b.index);

    return migrations;
  }

  /**
   * Get SQL migrations from migrations folder
   */
  private getSqlMigrations(): MigrationEntry[] {
    const migrations: MigrationEntry[] = [];
    const migrationsPath = path.resolve(process.cwd(), this.migrationsFolder);

    try {
      const files = fs.readdirSync(migrationsPath);
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const match = file.match(/^(\d{4})_(.+)\.sql$/);
          if (match) {
            const [, indexStr, name] = match;
            const index = parseInt(indexStr, 10);
            const id = `${indexStr}_${name}`;
            
            migrations.push({
              id,
              type: 'sql',
              index,
              filePath: path.join(migrationsPath, file),
              description: `SQL migration: ${name.replace(/_/g, ' ')}`,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not read SQL migrations:', error);
    }

    return migrations;
  }

  /**
   * Get TypeScript migrations from registry
   */
  private getTsMigrations(): MigrationEntry[] {
    const migrations: MigrationEntry[] = [];
    const migrationClasses = this.registry.getAll();

    for (const MigrationClass of migrationClasses) {
      // Create temporary instance to get metadata
      const tempInstance = new MigrationClass();
      const id = tempInstance.id;
      
      // Parse index from ID (format: 0001_description or 0001_description.ts)
      const match = id.match(/^(\d{4})_/);
      if (match) {
        const index = parseInt(match[1], 10);
        
        migrations.push({
          id: id.endsWith('.ts') ? id : `${id}.ts`,
          type: 'ts',
          index,
          migrationClass: MigrationClass,
          description: tempInstance.description,
        });
      }
    }

    return migrations;
  }

  /**
   * Run a SQL migration
   */
  private async runSqlMigration(migration: MigrationEntry): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log(`\n🔄 Running [SQL] ${migration.id}`);
    console.log(`   Description: ${migration.description}`);

    try {
      // Read SQL file
      const sqlContent = fs.readFileSync(migration.filePath!, 'utf-8');
      
      // Split by statement breakpoints and execute
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute in transaction
      await this.db.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.execute(sql.raw(statement));
        }

        // Record in tracking table
        await tx.insert(tsMigration).values({
          id: migration.id,
          description: migration.description || 'SQL migration',
          success: true,
          executionTimeMs: String(Date.now() - startTime),
        });
      });

      const executionTime = Date.now() - startTime;
      console.log(`✅ SQL migration ${migration.id} completed in ${executionTime}ms`);

      return {
        id: migration.id,
        description: migration.description || '',
        status: 'success',
        executionTimeMs: executionTime,
        type: 'sql',
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ SQL migration ${migration.id} failed:`, errorMessage);

      // Record failure
      try {
        await this.db.insert(tsMigration).values({
          id: migration.id,
          description: migration.description || 'SQL migration',
          success: false,
          errorMessage,
          executionTimeMs: String(executionTime),
        });
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }

      return {
        id: migration.id,
        description: migration.description || '',
        status: 'failed',
        executionTimeMs: executionTime,
        error: errorMessage,
        type: 'sql',
      };
    }
  }

  /**
   * Run a TypeScript migration
   */
  private async runTsMigration(migration: MigrationEntry): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Resolve the migration instance with DI
      const migrationInstance = await this.moduleRef.create(migration.migrationClass!);
      
      console.log(`\n🔄 Running [TS] ${migration.id}`);
      console.log(`   Description: ${migrationInstance.description}`);

      // Run migration in a transaction
      await this.db.transaction(async (tx) => {
        // Execute the migration logic
        await migrationInstance.up(tx as NodePgDatabase<typeof schema>);

        // Record success in migration tracking table
        await tx.insert(tsMigration).values({
          id: migration.id,
          description: migrationInstance.description,
          success: true,
          executionTimeMs: String(Date.now() - startTime),
        });
      });

      const executionTime = Date.now() - startTime;
      console.log(`✅ TypeScript migration ${migration.id} completed in ${executionTime}ms`);

      return {
        id: migration.id,
        description: migrationInstance.description,
        status: 'success',
        executionTimeMs: executionTime,
        type: 'ts',
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ TypeScript migration ${migration.id} failed:`, errorMessage);

      // Record failure (outside transaction since transaction was rolled back)
      try {
        await this.db.insert(tsMigration).values({
          id: migration.id,
          description: migration.description || '',
          success: false,
          errorMessage,
          executionTimeMs: String(executionTime),
        });
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }

      return {
        id: migration.id,
        description: migration.description || '',
        status: 'failed',
        executionTimeMs: executionTime,
        error: errorMessage,
        type: 'ts',
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
   * Get executed SQL migrations from Drizzle's tracking table
   */
  private async getDrizzleExecutedMigrations(): Promise<Set<string>> {
    try {
      const result = await this.db.execute(
        sql`SELECT tag FROM __drizzle_migrations`
      );
      return new Set(result.rows.map((row: any) => row.tag));
    } catch (error) {
      // Table might not exist yet
      return new Set();
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
      await this.db.execute(sql`
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
    
    // Also check Drizzle migrations
    const sqlExecutedIds = await this.getDrizzleExecutedMigrations();
    
    // Combine both
    for (const id of sqlExecutedIds) {
      executedIds.add(id);
    }
    
    const allMigrations = await this.getAllMigrationsSorted();
    const allIds = allMigrations.map(m => m.id);
    const pending = allIds.filter(id => !executedIds.has(id));

    return {
      total: allIds.length,
      executed: executedIds.size,
      pending: pending.length,
      executedMigrations: executed,
      pendingMigrations: pending,
    };
  }
}
