/**
 * TypeScript Migration System
 * 
 * This module provides advanced migration capabilities for complex data transformations
 * that cannot be easily expressed in SQL alone.
 * 
 * Features:
 * - Full NestJS dependency injection support
 * - Automatic transaction management
 * - Migration tracking and status
 * - Type-safe database access
 * - Rollback support (optional)
 * 
 * Usage:
 * 1. Create migration: Extend BaseMigration class
 * 2. Register: Add to MIGRATIONS array in migrations/index.ts
 * 3. Run: Use MigrationRunnerService or enhanced migrate CLI command
 */

export * from './interfaces/migration.interface';
export * from './abstract/base-migration';
export * from './migration.registry';
export * from './migration.module';
export * from './services/migration-runner.service';
export * from './migrations';
