import type { Migration } from '../interfaces/migration.interface';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';

/**
 * Abstract base class for TypeScript migrations.
 * Extend this class to create custom migrations with access to NestJS services.
 */
export abstract class BaseMigration implements Migration {
  abstract readonly id: string;
  abstract readonly description: string;

  abstract up(db: NodePgDatabase<typeof schema>): Promise<void>;

  /**
   * Default down implementation throws an error.
   * Override this method if you want to support rollback.
   */
  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    throw new Error(`Rollback not implemented for migration ${this.id}`);
  }
}
