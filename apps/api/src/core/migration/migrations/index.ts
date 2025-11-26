/**
 * Central registry of all TypeScript migrations.
 * 
 * TypeScript migrations are now stored in src/config/drizzle/migrations/
 * alongside SQL migrations. They use the same naming convention.
 * 
 * To add a new migration:
 * 1. Run: bun run api -- db:generate
 *    This creates both SQL and TypeScript migration files automatically
 * 2. Edit the generated .migration.ts file
 * 3. The migration will be automatically registered here by the generate script
 * 4. Run: bun run api -- db:migrate
 * 
 * Migration naming convention:
 * - Format: XXXX_description.migration.ts (same as SQL: XXXX_description.sql)
 * - Example: 0021_add_user_preferences.migration.ts
 * - The 4-digit index is assigned by Drizzle
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

// Import all migrations from drizzle migrations folder
import { ExampleDataTransformationMigration } from '../../../config/drizzle/migrations/0021_example_data_transformation.migration';
import { ExampleWithServiceInjectionMigration } from '../../../config/drizzle/migrations/0022_example_with_service_injection.migration';
import { 0021DeepKatFarrellMigration } from '../../../config/drizzle/migrations/0021_deep_kat_farrell.migration';

/**
 * List of all TypeScript migrations.
 * New migrations are automatically added here by the generate script.
 */
export const MIGRATIONS: Type<Migration>[] = [
  ExampleDataTransformationMigration,
  ExampleWithServiceInjectionMigration,
  0021DeepKatFarrellMigration,
  // Add new migrations here...
];
