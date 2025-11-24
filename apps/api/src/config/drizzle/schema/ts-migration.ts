import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Table for tracking TypeScript-based migrations.
 * This is separate from the Drizzle migration tracking.
 */
export const tsMigration = pgTable('ts_migration', {
  id: text('id').primaryKey(), // Migration ID (timestamp_description)
  description: text('description').notNull(),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  executionTimeMs: text('execution_time_ms'),
});

export type TsMigration = typeof tsMigration.$inferSelect;
export type NewTsMigration = typeof tsMigration.$inferInsert;
