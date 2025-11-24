/**
 * Central registry of all TypeScript migrations.
 * 
 * To add a new migration:
 * 1. Create a new file in this directory: XXXX_description.migration.ts
 *    where XXXX is a 4-digit index (same format as Drizzle SQL migrations)
 * 2. Extend BaseMigration and implement up() method
 * 3. Add the migration class to the MIGRATIONS array below
 * 4. The migration will be automatically registered and run in interleaved order with SQL migrations
 * 
 * Migration naming convention:
 * - Format: XXXX_description.migration.ts
 * - Example: 0021_add_user_preferences.migration.ts, 0022_migrate_files.migration.ts
 * - The 4-digit index must match the Drizzle migration numbering
 * - Migrations are executed in order: SQL and TS are interleaved based on index
 * 
 * Example order:
 * - 0020_fearless_gressill.sql (SQL)
 * - 0021_example_data_transformation.migration.ts (TS)
 * - 0022_example_with_service_injection.migration.ts (TS)
 * - 0023_another_sql_migration.sql (SQL)
 */

import { Type } from '@nestjs/common';
import { Migration } from '../interfaces/migration.interface';

// Import all migrations here
import { ExampleDataTransformationMigration } from './0021_example_data_transformation.migration';
import { ExampleWithServiceInjectionMigration } from './0022_example_with_service_injection.migration';

/**
 * List of all TypeScript migrations.
 * Add new migrations to this array.
 */
export const MIGRATIONS: Type<Migration>[] = [
  ExampleDataTransformationMigration,
  ExampleWithServiceInjectionMigration,
  // Add new migrations here...
];
