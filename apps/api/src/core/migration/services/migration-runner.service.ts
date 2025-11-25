import { Injectable, Inject, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DATABASE_CONNECTION } from '@/core/modules/database/database-connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { sql } from 'drizzle-orm';
import type { Migration } from '../interfaces/migration.interface';
import { MigrationRegistry } from '../migration.registry';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MigrationResult {
  id: string;
  description: string;
  status: 'success' | 'failed' | 'skipped';
  executionTimeMs?: number;
  error?: string;
  type: 'sql' | 'ts';
}

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

interface MigrationEntry {
  tag: string;           // e.g., "0021_brave_hero" (same as Drizzle)
  type: 'sql' | 'ts';
  folderMillis: number;  // timestamp from journal's `when` field
  hash: string;          // SHA256 hash of migration content
  migrationClass?: Type<Migration>;
  filePath?: string;
  description?: string;
}

interface DrizzleMigrationRecord {
  id: number;
  hash: string;
  created_at: string;
}

/**
 * Service for running SQL and TypeScript migrations using Drizzle's migration table.
 * Uses the same drizzle.__drizzle_migrations table for tracking both SQL and TS migrations.
 */
@Injectable()
export class MigrationRunnerService {
  private readonly migrationsFolder = './src/config/drizzle/migrations';
  private readonly migrationsSchema = 'drizzle';
  private readonly migrationsTable = '__drizzle_migrations';

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly registry: MigrationRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Run all pending migrations (SQL and TypeScript) in order.
   * Uses Drizzle's migration tracking table and workflow.
   */
  async runAllMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    // Ensure migration schema and table exist (same as Drizzle does)
    await this.ensureMigrationTable();

    // Get all migrations sorted by timestamp
    const allMigrations = await this.getAllMigrationsSorted();
    
    if (allMigrations.length === 0) {
      console.log('ℹ️  No migrations found');
      return results;
    }

    // Get the last executed migration from Drizzle's table
    const lastMigration = await this.getLastExecutedMigration();

    console.log(`📋 Found ${allMigrations.length} total migrations`);
    if (lastMigration) {
      console.log(`✅ Last executed: ${lastMigration.created_at}\n`);
    } else {
      console.log(`ℹ️  No migrations executed yet\n`);
    }

    // Execute pending migrations in a transaction
    await this.db.transaction(async (tx) => {
      for (const migration of allMigrations) {
        // Skip if already executed (compare timestamps like Drizzle does)
        if (lastMigration && Number(lastMigration.created_at) >= migration.folderMillis) {
          console.log(`⏭️  Skipping [${migration.type.toUpperCase()}] ${migration.tag}`);
          results.push({
            id: migration.tag,
            description: migration.description || '',
            status: 'skipped',
            type: migration.type,
          });
          continue;
        }

        let result: MigrationResult;
        if (migration.type === 'sql') {
          result = await this.runSqlMigration(migration, tx);
        } else {
          result = await this.runTsMigration(migration, tx);
        }

        results.push(result);

        if (result.status === 'failed') {
          console.error(`❌ Migration ${migration.tag} failed, stopping execution`);
          throw new Error(`Migration ${migration.tag} failed: ${result.error}`);
        }
      }
    });

    return results;
  }

  /**
   * Get all migrations (SQL and TS) sorted by timestamp
   */
  private async getAllMigrationsSorted(): Promise<MigrationEntry[]> {
    const migrations: MigrationEntry[] = [];

    // Read journal file (like Drizzle does)
    const journal = this.readJournal();
    if (!journal) {
      return migrations;
    }

    // Get SQL and TS migrations from journal entries
    for (const entry of journal.entries) {
      // SQL migration
      const sqlPath = path.resolve(process.cwd(), this.migrationsFolder, `${entry.tag}.sql`);
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');
        
        migrations.push({
          tag: entry.tag,
          type: 'sql',
          folderMillis: entry.when,
          hash,
          filePath: sqlPath,
          description: `SQL: ${entry.tag}`,
        });
      }

      // TS migration (same tag, different extension)
      const tsPath = path.resolve(process.cwd(), this.migrationsFolder, `${entry.tag}.migration.ts`);
      if (fs.existsSync(tsPath)) {
        // Get TS migration from registry
        const migrationClass = this.findMigrationClass(entry.tag);
        if (migrationClass) {
          const tempInstance = new migrationClass();
          const tsContent = fs.readFileSync(tsPath, 'utf-8');
          const hash = crypto.createHash('sha256').update(tsContent).digest('hex');
          
          migrations.push({
            tag: `${entry.tag}.ts`,  // Add .ts suffix to distinguish from SQL
            type: 'ts',
            folderMillis: entry.when + 1,  // Run TS right after SQL (add 1ms)
            hash,
            migrationClass,
            filePath: tsPath,
            description: tempInstance.description,
          });
        }
      }
    }

    // Sort by timestamp
    migrations.sort((a, b) => a.folderMillis - b.folderMillis);

    return migrations;
  }

  /**
   * Read the journal file
   */
  private readJournal(): Journal | null {
    const journalPath = path.resolve(process.cwd(), this.migrationsFolder, 'meta/_journal.json');
    
    try {
      if (!fs.existsSync(journalPath)) {
        console.warn('No journal file found');
        return null;
      }
      
      const content = fs.readFileSync(journalPath, 'utf-8');
      return JSON.parse(content) as Journal;
    } catch (error) {
      console.error('Failed to read journal:', error);
      return null;
    }
  }

  /**
   * Find migration class by tag
   */
  private findMigrationClass(tag: string): Type<Migration> | undefined {
    const migrationClasses = this.registry.getAll();
    
    for (const MigrationClass of migrationClasses) {
      const tempInstance = new MigrationClass();
      // Match by tag (e.g., "0021_brave_hero")
      if (tempInstance.id === tag || tempInstance.id === `${tag}.ts`) {
        return MigrationClass;
      }
    }
    
    return undefined;
  }

  /**
   * Run a SQL migration
   */
  private async runSqlMigration(
    migration: MigrationEntry,
    tx: NodePgDatabase<typeof schema>
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log(`\n🔄 Running [SQL] ${migration.tag}`);

    try {
      // Read SQL file
      const sqlContent = fs.readFileSync(migration.filePath!, 'utf-8');
      
      // Split by statement breakpoints and execute
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await tx.execute(sql.raw(statement));
      }

      // Record in Drizzle's migration table (same format as Drizzle)
      await tx.execute(
        sql`INSERT INTO ${sql.identifier(this.migrationsSchema)}.${sql.identifier(this.migrationsTable)} 
            ("hash", "created_at") VALUES (${migration.hash}, ${migration.folderMillis})`
      );

      const executionTime = Date.now() - startTime;
      console.log(`✅ SQL migration ${migration.tag} completed in ${executionTime}ms`);

      return {
        id: migration.tag,
        description: migration.description || '',
        status: 'success',
        executionTimeMs: executionTime,
        type: 'sql',
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ SQL migration ${migration.tag} failed:`, errorMessage);

      return {
        id: migration.tag,
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
  private async runTsMigration(
    migration: MigrationEntry,
    tx: NodePgDatabase<typeof schema>
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Resolve the migration instance with DI
      const migrationInstance = await this.moduleRef.create(migration.migrationClass!);
      
      console.log(`\n🔄 Running [TS] ${migration.tag}`);
      console.log(`   Description: ${migrationInstance.description}`);

      // Execute the migration logic
      await migrationInstance.up(tx as NodePgDatabase<typeof schema>);

      // Record in Drizzle's migration table (same format as Drizzle)
      await tx.execute(
        sql`INSERT INTO ${sql.identifier(this.migrationsSchema)}.${sql.identifier(this.migrationsTable)} 
            ("hash", "created_at") VALUES (${migration.hash}, ${migration.folderMillis})`
      );

      const executionTime = Date.now() - startTime;
      console.log(`✅ TypeScript migration ${migration.tag} completed in ${executionTime}ms`);

      return {
        id: migration.tag,
        description: migrationInstance.description,
        status: 'success',
        executionTimeMs: executionTime,
        type: 'ts',
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ TypeScript migration ${migration.tag} failed:`, errorMessage);

      return {
        id: migration.tag,
        description: migration.description || '',
        status: 'failed',
        executionTimeMs: executionTime,
        error: errorMessage,
        type: 'ts',
      };
    }
  }

  /**
   * Get the last executed migration from Drizzle's table
   */
  private async getLastExecutedMigration(): Promise<DrizzleMigrationRecord | null> {
    try {
      const result = await this.db.execute<DrizzleMigrationRecord>(
        sql`SELECT id, hash, created_at FROM ${sql.identifier(this.migrationsSchema)}.${sql.identifier(this.migrationsTable)} 
            ORDER BY created_at DESC LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as DrizzleMigrationRecord;
    } catch (error) {
      // Table might not exist yet
      return null;
    }
  }

  /**
   * Ensure the migration schema and table exist (same as Drizzle does)
   */
  private async ensureMigrationTable(): Promise<void> {
    try {
      // Create schema if not exists
      await this.db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(this.migrationsSchema)}`);
      
      // Create table if not exists (same structure as Drizzle)
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(this.migrationsSchema)}.${sql.identifier(this.migrationsTable)} (
          id SERIAL PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at BIGINT
        )
      `);
    } catch (error) {
      console.error('Failed to create migration table:', error);
    }
  }

  /**
   * Get migration status (executed vs pending)
   */
  async getMigrationStatus() {
    await this.ensureMigrationTable();
    
    // Get all executed migrations from Drizzle's table
    const executedResult = await this.db.execute<DrizzleMigrationRecord>(
      sql`SELECT id, hash, created_at FROM ${sql.identifier(this.migrationsSchema)}.${sql.identifier(this.migrationsTable)} 
          ORDER BY created_at ASC`
    );
    
    const executed = executedResult.rows as DrizzleMigrationRecord[];
    const lastMigration = executed.length > 0 ? executed[executed.length - 1] : null;
    
    const allMigrations = await this.getAllMigrationsSorted();
    
    // Count pending migrations
    const pending = allMigrations.filter(m => {
      if (!lastMigration) return true;
      return m.folderMillis > Number(lastMigration.created_at);
    });

    return {
      total: allMigrations.length,
      executed: executed.length,
      pending: pending.length,
      executedMigrations: executed.map(m => ({
        id: m.hash.substring(0, 8),
        created_at: m.created_at,
      })),
      pendingMigrations: pending.map(m => m.tag),
    };
  }
}
