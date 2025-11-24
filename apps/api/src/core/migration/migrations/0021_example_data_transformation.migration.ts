import { Injectable } from '@nestjs/common';
import { BaseMigration } from '../abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { user } from '@/config/drizzle/schema';
import { sql } from 'drizzle-orm';

/**
 * Example TypeScript migration demonstrating complex data transformation.
 * 
 * This migration shows how to:
 * - Use NestJS dependency injection (Injectable decorator)
 * - Access database with full typing
 * - Perform complex data transformations
 * - Run within a transaction (automatic via runner)
 * 
 * Use cases for TypeScript migrations:
 * - Data migration between table structures
 * - Complex business logic during migration
 * - Integration with external services during migration
 * - Batch processing with progress tracking
 * - Data validation and cleanup
 */
@Injectable()
export class ExampleDataTransformationMigration extends BaseMigration {
  readonly id = '0021_example_data_transformation';
  readonly description = 'Example: Transform user data with complex logic';

  /**
   * This is a demonstration migration that would normalize user email addresses.
   * In a real scenario, you might need to:
   * - Migrate data from old schema to new schema
   * - Clean up inconsistent data
   * - Generate computed values
   * - Call external APIs
   * - Process large datasets in batches
   */
  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  📊 Starting example data transformation...');

    // Example 1: Get count of users to process
    const userCount = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM "user"`
    );
    const totalUsers = Number(userCount.rows[0]?.count ?? 0);
    console.log(`  📈 Found ${totalUsers} users to process`);

    // Example 2: Complex query with business logic
    // In a real migration, you might do something like:
    // - Normalize email addresses to lowercase
    // - Extract first/last names from full name
    // - Calculate derived fields
    // - Migrate data to new table structure
    
    if (totalUsers > 0) {
      // Example batch processing pattern
      const batchSize = 100;
      let processed = 0;

      // This is just a demonstration - actual implementation would
      // fetch and process users in batches
      console.log(`  ⚙️  Would process users in batches of ${batchSize}`);
      console.log(`  ✨ This is a demonstration migration - no actual changes made`);
      
      // In a real migration you might do:
      /*
      while (processed < totalUsers) {
        const users = await db
          .select()
          .from(user)
          .limit(batchSize)
          .offset(processed);

        for (const u of users) {
          // Complex transformation logic here
          await db
            .update(user)
            .set({ 
              email: u.email.toLowerCase(),
              // other transformations...
            })
            .where(eq(user.id, u.id));
        }

        processed += users.length;
        console.log(`  ⏳ Processed ${processed}/${totalUsers} users`);
      }
      */
    }

    console.log('  ✅ Example data transformation completed');
  }

  /**
   * Rollback implementation.
   * Since this is just an example, we don't actually implement rollback.
   */
  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  ⏪ Rolling back example data transformation...');
    console.log('  ℹ️  This is a demonstration - no rollback needed');
  }
}
