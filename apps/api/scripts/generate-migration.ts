#!/usr/bin/env bun
/**
 * Custom migration generator that:
 * 1. Runs drizzle-kit generate to create SQL migration
 * 2. Creates a companion TypeScript migration file with the same name
 */

import { $ } from 'bun';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = './src/config/drizzle/migrations';
const MIGRATIONS_META_DIR = path.join(MIGRATIONS_DIR, 'meta');
const JOURNAL_FILE = path.join(MIGRATIONS_META_DIR, '_journal.json');

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

/**
 * Read the journal file to get the latest migration
 */
function getLatestMigration(): JournalEntry | null {
  try {
    const journalContent = fs.readFileSync(JOURNAL_FILE, 'utf-8');
    const journal: Journal = JSON.parse(journalContent);
    
    if (journal.entries.length === 0) {
      return null;
    }
    
    // Get the last entry
    return journal.entries[journal.entries.length - 1];
  } catch (error) {
    console.error('Failed to read journal file:', error);
    return null;
  }
}

/**
 * Create TypeScript migration template
 */
function createTsMigrationTemplate(migrationTag: string): string {
  // Create valid class name (can't start with number)
  const parts = migrationTag.split('_');
  const className = 'Migration' + parts
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return `import { Injectable } from '@nestjs/common';
import { BaseMigration } from '../../../core/migration/abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';

/**
 * TypeScript migration: ${migrationTag}
 * 
 * This migration runs after the SQL migration with the same index.
 * Use this for complex data transformations that require:
 * - Business logic
 * - NestJS service injection
 * - Batch processing
 * - External API calls
 * - File operations
 */
@Injectable()
export class ${className}Migration extends BaseMigration {
  readonly id = '${migrationTag}';
  readonly description = 'TODO: Add migration description';

  // Inject any services you need
  constructor(
    // private readonly yourService: YourService,
  ) {
    super();
  }

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  🔄 Running TypeScript migration: ${migrationTag}');
    
    // TODO: Implement your migration logic here
    // This runs in a transaction - any error will rollback
    
    // Example: Data transformation
    // const records = await db.select().from(yourTable);
    // for (const record of records) {
    //   await db.update(yourTable)
    //     .set({ /* your updates */ })
    //     .where(eq(yourTable.id, record.id));
    // }
    
    console.log('  ✅ TypeScript migration completed');
  }

  /**
   * Optional: Implement rollback logic
   */
  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  ⏪ Rolling back: ${migrationTag}');
    // TODO: Implement rollback if needed
    throw new Error('Rollback not implemented for ${migrationTag}');
  }
}
`;
}

/**
 * Create TypeScript migration file
 */
function createTsMigrationFile(migrationTag: string): string {
  const tsFilePath = path.join(MIGRATIONS_DIR, `${migrationTag}.migration.ts`);
  
  // Check if file already exists
  if (fs.existsSync(tsFilePath)) {
    console.log(`⚠️  TypeScript migration already exists: ${tsFilePath}`);
    return tsFilePath;
  }
  
  const content = createTsMigrationTemplate(migrationTag);
  fs.writeFileSync(tsFilePath, content, 'utf-8');
  
  console.log(`✅ Created TypeScript migration: ${tsFilePath}`);
  return tsFilePath;
}

/**
 * Update the migrations index to register the new migration
 */
function updateMigrationsIndex(migrationTag: string) {
  const indexPath = './src/core/migration/migrations/index.ts';
  // Create valid class name (can't start with number)
  const parts = migrationTag.split('_');
  const className = 'Migration' + parts
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  try {
    let content = fs.readFileSync(indexPath, 'utf-8');
    
    // Check if migration is already registered
    if (content.includes(`/${migrationTag}.migration'`)) {
      console.log(`⚠️  Migration already registered in index`);
      return;
    }
    
    // Add import statement with correct path (migrations are in drizzle folder)
    const importStatement = `import { ${className}Migration } from '../../../config/drizzle/migrations/${migrationTag}.migration';`;
    const importsSection = content.match(/import.*migrations\/.*\.migration';/g);
    
    if (importsSection && importsSection.length > 0) {
      // Add after the last import
      const lastImport = importsSection[importsSection.length - 1];
      content = content.replace(lastImport, `${lastImport}\n${importStatement}`);
    } else {
      // Add before the MIGRATIONS array
      content = content.replace(
        'export const MIGRATIONS',
        `${importStatement}\n\nexport const MIGRATIONS`
      );
    }
    
    // Add to MIGRATIONS array
    content = content.replace(
      /\/\/ Add new migrations here\.\.\./,
      `${className}Migration,\n  // Add new migrations here...`
    );
    
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log(`✅ Registered migration in index`);
  } catch (error) {
    console.error('⚠️  Failed to update migrations index:', error);
    console.log('Please manually add the migration to src/core/migration/migrations/index.ts');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Generating database migration...\n');
  
  // Get the migration tag before running drizzle-kit
  const beforeMigration = getLatestMigration();
  
  // Run drizzle-kit generate
  console.log('📦 Running drizzle-kit generate...');
  try {
    await $`drizzle-kit generate`;
  } catch (error) {
    console.error('❌ Failed to generate SQL migration:', error);
    process.exit(1);
  }
  
  // Get the new migration
  const afterMigration = getLatestMigration();
  
  if (!afterMigration) {
    console.error('❌ No migrations found');
    process.exit(1);
  }
  
  // Check if a new migration was created
  if (beforeMigration && beforeMigration.tag === afterMigration.tag) {
    console.log('\n⚠️  No schema changes detected - no migration created');
    process.exit(0);
  }
  
  const migrationTag = afterMigration.tag;
  console.log(`\n✅ SQL migration created: ${migrationTag}.sql`);
  
  // Create TypeScript migration file
  console.log('\n📝 Creating TypeScript migration template...');
  const tsFilePath = createTsMigrationFile(migrationTag);
  
  // Update migrations index
  console.log('\n📝 Updating migrations index...');
  updateMigrationsIndex(migrationTag);
  
  console.log('\n✨ Migration generation complete!');
  console.log('\n📋 Next steps:');
  console.log(`   1. Edit ${tsFilePath}`);
  console.log(`   2. Implement your migration logic in the up() method`);
  console.log(`   3. Run: bun run api -- db:migrate`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
