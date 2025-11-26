import { Injectable, Type } from '@nestjs/common';
import type { Migration } from './interfaces/migration.interface';

/**
 * Registry for managing TypeScript-based migrations.
 * Migrations are registered here and executed in order by their ID.
 */
@Injectable()
export class MigrationRegistry {
  private migrations: Map<string, Type<Migration>> = new Map();

  /**
   * Register a migration class
   * @param migrationClass - The migration class to register
   */
  register(migrationClass: Type<Migration>): void {
    // Create temporary instance to get metadata
    const tempInstance = new migrationClass();
    const id = tempInstance.id;

    if (this.migrations.has(id)) {
      throw new Error(`Migration with id "${id}" is already registered`);
    }

    this.migrations.set(id, migrationClass);
  }

  /**
   * Get all registered migrations sorted by ID (chronological order)
   */
  getAll(): Type<Migration>[] {
    // Sort migrations by ID (which should be timestamp-based)
    return Array.from(this.migrations.entries())
      .sort(([idA], [idB]) => idA.localeCompare(idB))
      .map(([, migrationClass]) => migrationClass);
  }

  /**
   * Get a specific migration by ID
   */
  get(id: string): Type<Migration> | undefined {
    return this.migrations.get(id);
  }

  /**
   * Check if a migration is registered
   */
  has(id: string): boolean {
    return this.migrations.has(id);
  }

  /**
   * Get all migration IDs in sorted order
   */
  getIds(): string[] {
    return Array.from(this.migrations.keys()).sort();
  }
}
