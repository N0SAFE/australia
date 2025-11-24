/**
 * Central registry of all TypeScript migrations.
 * 
 * To add a new migration:
 * 1. Create a new file in this directory: YYYYMMDDHHMMSS_description.migration.ts
 * 2. Extend BaseMigration and implement up() method
 * 3. Add the migration class to the MIGRATIONS array below
 * 4. The migration will be automatically registered and run in order
 * 
 * Migration naming convention:
 * - Format: YYYYMMDDHHMMSS_description.migration.ts
 * - Example: 20241124120000_add_user_preferences.migration.ts
 * - The timestamp ensures migrations run in chronological order
 */

import { Type } from '@nestjs/common';
import { Migration } from '../interfaces/migration.interface';

// Import all migrations here
import { ExampleDataTransformationMigration } from './20241124000000_example_data_transformation.migration';
import { ExampleWithServiceInjectionMigration } from './20241124000001_example_with_service_injection.migration';

/**
 * List of all TypeScript migrations.
 * Add new migrations to this array in chronological order.
 */
export const MIGRATIONS: Type<Migration>[] = [
  ExampleDataTransformationMigration,
  ExampleWithServiceInjectionMigration,
  // Add new migrations here...
];
