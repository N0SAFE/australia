# TypeScript Migrations Guide

## Overview

This project now supports two types of database migrations:

1. **SQL Migrations** (Drizzle) - For simple schema changes
2. **TypeScript Migrations** - For complex data transformations with business logic

## Why TypeScript Migrations?

While SQL migrations are perfect for schema changes, sometimes you need more:

- **Complex Data Transformations**: Business logic that's hard to express in SQL
- **Service Integration**: Access to NestJS services (file storage, external APIs, etc.)
- **Type Safety**: Full TypeScript typing for database operations
- **Transaction Safety**: Automatic transaction management with rollback support
- **Code Reuse**: Leverage existing services and utilities
- **Progress Tracking**: Built-in logging and status reporting

## When to Use Each Type

### Use SQL Migrations (Drizzle) for:
- Creating/altering tables
- Adding/removing columns
- Creating indexes
- Setting up foreign keys
- Simple data updates

### Use TypeScript Migrations for:
- Complex data transformations
- Migrating files between storage systems
- Calling external APIs during migration
- Batch processing with progress tracking
- Data validation using business rules
- Operations requiring multiple services

## Creating a TypeScript Migration

### Step 1: Create Migration File

Create a new file in `src/core/migration/migrations/`:

```typescript
// 20241124120000_migrate_user_avatars.migration.ts
import { Injectable } from '@nestjs/common';
import { BaseMigration } from '../abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';
import { FileService } from '@/core/modules/file/services/file.service';
import { user } from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class MigrateUserAvatarsMigration extends BaseMigration {
  readonly id = '20241124120000_migrate_user_avatars';
  readonly description = 'Migrate user avatars to new storage system';

  constructor(private readonly fileService: FileService) {
    super();
  }

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  📦 Migrating user avatars...');

    // Fetch all users with avatars
    const users = await db
      .select()
      .from(user)
      .where(/* your condition */);

    let migrated = 0;
    for (const u of users) {
      // Use FileService to move avatar
      const newAvatarUrl = await this.fileService.migrateFile(
        u.image,
        'avatars'
      );

      // Update user record
      await db
        .update(user)
        .set({ image: newAvatarUrl })
        .where(eq(user.id, u.id));

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  ⏳ Migrated ${migrated}/${users.length} avatars`);
      }
    }

    console.log(`  ✅ Migrated ${migrated} avatars`);
  }

  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    // Optional: Implement rollback
    throw new Error('Rollback not implemented');
  }
}
```

### Step 2: Register Migration

Add your migration to `src/core/migration/migrations/index.ts`:

```typescript
import { MigrateUserAvatarsMigration } from './20241124120000_migrate_user_avatars.migration';

export const MIGRATIONS: Type<Migration>[] = [
  ExampleDataTransformationMigration,
  ExampleWithServiceInjectionMigration,
  MigrateUserAvatarsMigration, // Add here
];
```

### Step 3: Run Migration

```bash
# Run all migrations (SQL + TypeScript)
bun run api -- db:migrate

# Run only TypeScript migrations
bun run api -- db:migrate --ts-only

# Run only SQL migrations
bun run api -- db:migrate --sql-only

# Check migration status
bun run api -- db:migrate --status
```

## Migration Naming Convention

**Format**: `YYYYMMDDHHMMSS_description.migration.ts`

**Examples**:
- `20241124120000_add_user_preferences.migration.ts`
- `20241124153000_migrate_file_storage.migration.ts`
- `20241125080000_cleanup_orphaned_records.migration.ts`

The timestamp ensures migrations run in chronological order.

## Advanced Features

### Transaction Management

Each TypeScript migration runs in its own database transaction:
- If migration succeeds, transaction is committed
- If migration fails, transaction is rolled back
- No partial changes are left in the database

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  // Everything here runs in a transaction
  // If any operation fails, entire migration is rolled back
  
  await db.insert(table1).values({...});
  await db.update(table2).set({...});
  // ... more operations
}
```

### Service Injection

Inject any NestJS service into your migration:

```typescript
@Injectable()
export class MyMigration extends BaseMigration {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
    private readonly emailService: EmailService,
    // ... any other service
  ) {
    super();
  }

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    // Use injected services
    await this.fileService.moveFiles(...);
    await this.emailService.sendMigrationNotice(...);
  }
}
```

### Batch Processing

For large datasets, process in batches:

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const records = await db
      .select()
      .from(table)
      .limit(batchSize)
      .offset(offset);

    if (records.length === 0) {
      hasMore = false;
      break;
    }

    // Process batch
    for (const record of records) {
      await this.processRecord(record);
    }

    offset += batchSize;
    console.log(`  ⏳ Processed ${offset} records...`);
  }
}
```

### Error Handling

Migrations automatically handle errors:

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  // If any error is thrown, migration fails and transaction rolls back
  throw new Error('Something went wrong');
  
  // Alternative: Wrap in try-catch for custom error handling
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    throw error; // Re-throw to trigger rollback
  }
}
```

## Migration Status Tracking

The system tracks migration execution in the `ts_migration` table:

- `id`: Migration identifier
- `description`: What the migration does
- `executed_at`: When it ran
- `success`: Whether it succeeded
- `error_message`: Error details (if failed)
- `execution_time_ms`: How long it took

Check status with:
```bash
bun run api -- db:migrate --status
```

## Best Practices

1. **Keep migrations focused**: One migration = one logical change
2. **Make migrations idempotent**: Safe to run multiple times
3. **Add progress logging**: For long-running migrations
4. **Test rollback**: If you implement `down()` method
5. **Use batch processing**: For large datasets
6. **Handle errors gracefully**: Provide clear error messages
7. **Document complex logic**: Add comments explaining WHY
8. **Version carefully**: Use timestamp-based IDs

## Example Use Cases

### 1. File Migration
```typescript
// Move files from old storage to new storage
await this.fileService.moveToNewStorage(oldPath, newPath);
```

### 2. Data Transformation
```typescript
// Transform data using business logic
const enriched = await this.enrichmentService.addMetadata(record);
await db.update(table).set({ metadata: enriched });
```

### 3. External API Integration
```typescript
// Fetch data from external API during migration
const externalData = await this.apiService.fetchUserData(userId);
await db.update(user).set({ externalId: externalData.id });
```

### 4. Complex Validation
```typescript
// Validate and clean up data using business rules
const valid = await this.validationService.validateRecord(record);
if (!valid) {
  await db.delete(table).where(eq(table.id, record.id));
}
```

## Troubleshooting

### Migration Fails

If a migration fails:
1. Check the error message in console
2. Check `ts_migration` table for error details
3. Fix the migration code
4. The migration won't run again until you remove its entry from `ts_migration`

### Remove Failed Migration

```sql
DELETE FROM ts_migration WHERE id = 'your_migration_id';
```

### Reset All TypeScript Migrations

```sql
DROP TABLE ts_migration;
```

Then run migrations again.

## Architecture

```
src/core/migration/
├── interfaces/
│   └── migration.interface.ts      # Migration interface
├── abstract/
│   └── base-migration.ts           # Base class for migrations
├── services/
│   └── migration-runner.service.ts # Executes migrations
├── migrations/
│   ├── index.ts                    # Migration registry
│   └── *.migration.ts              # Individual migrations
├── migration.registry.ts           # Migration registration
└── migration.module.ts             # NestJS module
```

## Comparison with SQL Migrations

| Feature | SQL Migrations | TypeScript Migrations |
|---------|---------------|----------------------|
| Schema changes | ✅ Perfect | ❌ Not recommended |
| Complex logic | ❌ Limited | ✅ Full capability |
| Service access | ❌ No | ✅ Yes |
| Type safety | ❌ No | ✅ Yes |
| Transaction support | ✅ Yes | ✅ Yes |
| IDE support | ❌ Limited | ✅ Full |
| Debugging | ❌ Difficult | ✅ Easy |

## Summary

TypeScript migrations complement SQL migrations by providing:
- Full NestJS ecosystem access
- Type-safe database operations
- Complex business logic support
- Better debugging and error handling
- Reusable code and services

Use them when SQL migrations aren't enough!
