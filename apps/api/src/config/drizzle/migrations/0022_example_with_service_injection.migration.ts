import { Injectable } from '@nestjs/common';
import { BaseMigration } from '../../../core/migration/abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { DatabaseService } from '@/core/modules/database/services/database.service';

/**
 * Example TypeScript migration demonstrating NestJS service injection.
 * 
 * This shows the key advantage of TypeScript migrations:
 * - Full access to NestJS dependency injection
 * - Can inject any service (database, auth, file, external APIs, etc.)
 * - Reuse existing business logic
 * - Type-safe interactions with services
 * 
 * Common scenarios:
 * - File migrations (moving files to new storage)
 * - External API calls during migration
 * - Email notifications about data changes
 * - Complex validations using existing services
 * - Regenerating cached data
 */
@Injectable()
export class ExampleWithServiceInjectionMigration extends BaseMigration {
  readonly id = '0022_example_with_service_injection';
  readonly description = 'Example: Using NestJS services in migrations';

  constructor(
    private readonly databaseService: DatabaseService,
    // You can inject ANY service here:
    // private readonly authService: AuthService,
    // private readonly fileService: FileService,
    // private readonly emailService: EmailService,
    // etc.
  ) {
    super();
  }

  /**
   * Demonstrate using injected services during migration.
   */
  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  🔧 Starting migration with service injection...');

    // Access injected services
    console.log('  ✅ DatabaseService available:', !!this.databaseService);
    console.log('  ✅ Transaction DB available:', !!db);

    // Example: Use the database service for complex queries
    // In a real migration, you might:
    // - Use FileService to migrate files to new storage location
    // - Use AuthService to regenerate password hashes
    // - Use EmailService to notify users of changes
    // - Use any custom service for business logic

    console.log('  💡 Example use cases:');
    console.log('     - Migrate files to new storage system using FileService');
    console.log('     - Update user permissions using AuthService');
    console.log('     - Send notification emails about data changes');
    console.log('     - Call external APIs to enrich data');
    console.log('     - Generate reports or audit logs');
    console.log('     - Clean up orphaned records using business rules');

    // The key benefit: You have access to ALL your application services
    // and can run complex business logic that would be impossible in SQL alone

    console.log('  ✅ Migration with service injection completed');
  }

  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  ⏪ Rolling back service injection example...');
    console.log('  ℹ️  This is a demonstration - no rollback needed');
  }
}
