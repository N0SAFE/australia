import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';

/**
 * Interface for TypeScript-based migrations with complex logic.
 * Migrations implementing this interface can use NestJS dependency injection
 * and have access to the database connection within a transaction.
 */
export interface Migration {
  /**
   * Unique identifier for the migration.
   * Format: YYYYMMDDHHMMSS_description
   * Example: 20240101120000_add_user_preferences
   */
  readonly id: string;

  /**
   * Human-readable description of what this migration does
   */
  readonly description: string;

  /**
   * Execute the migration logic within a transaction.
   * @param db - Drizzle database connection with full schema typing
   * @throws Error if migration fails (will trigger rollback)
   */
  up(db: NodePgDatabase<typeof schema>): Promise<void>;

  /**
   * Optional: Rollback the migration if needed.
   * @param db - Drizzle database connection with full schema typing
   * @throws Error if rollback fails
   */
  down?(db: NodePgDatabase<typeof schema>): Promise<void>;
}
