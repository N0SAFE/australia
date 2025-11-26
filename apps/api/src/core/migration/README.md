# TypeScript Migration System

## Overview

This directory contains the TypeScript-based migration system that complements Drizzle's SQL migrations with support for complex data transformations and business logic.

**Key Feature:** TypeScript migrations are **automatically generated** alongside SQL migrations when you run `bun run api -- db:generate`. Both files share the same name and execute in sequence.

## How It Works

1. **Change your schema** in `src/config/drizzle/schema/`
2. **Run `bun run api -- db:generate`**
   - Creates SQL migration: `0024_brave_hero.sql`
   - **Automatically creates** TS migration: `0024_brave_hero.migration.ts`
   - Registers TS migration in the migrations index
3. **Edit the TS file** to add your data transformation logic
4. **Run `bun run api -- db:migrate`**
   - Executes SQL migration (schema changes)
   - Executes TS migration immediately after (data transformations)

## Structure

```
migration/
├── abstract/
│   └── base-migration.ts          # Base class for all migrations
├── interfaces/
│   └── migration.interface.ts     # Migration interface definition
├── migrations/
│   └── index.ts                   # Central registry (auto-updated)
├── services/
│   └── migration-runner.service.ts    # Executes migrations
├── migration.module.ts            # NestJS module
└── migration.registry.ts          # Migration registry service

config/drizzle/migrations/
├── 0020_fearless_gressill.sql     # SQL migrations
├── 0021_example_data.migration.ts # TS migrations (same folder!)
└── meta/                          # Drizzle metadata
```

## Quick Start

### 1. Generate a New Migration

When you change your database schema, run:

```bash
bun run api -- db:generate
```

This command will:
1. Generate the SQL migration file using Drizzle Kit
2. **Automatically create a companion TypeScript migration file** with the same name
3. Register the TypeScript migration in the migrations index

The TypeScript file is created as a template at:
`src/config/drizzle/migrations/XXXX_description.migration.ts`

### 2. Implement Your Migration Logic

Edit the generated TypeScript file:

```typescript
// src/config/drizzle/migrations/0024_your_migration.migration.ts
import { Injectable } from '@nestjs/common';
import { BaseMigration } from '../../../core/migration/abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';

@Injectable()
export class YourMigration extends BaseMigration {
  readonly id = '0024_your_migration';
  readonly description = 'What this migration does';

  // Inject any services you need
  constructor(
    // private readonly yourService: YourService
  ) {
    super();
  }

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  🔄 Running your migration...');
    
    // Your migration logic here
    // This runs inside a transaction
    
    console.log('  ✅ Migration completed');
  }

  // Optional: Implement rollback
  async down(db: NodePgDatabase<typeof schema>): Promise<void> {
    console.log('  ⏪ Rolling back...');
    // Rollback logic here
  }
}
```

### 3. Automatic Registration

The migration is **automatically registered** in `src/core/migration/migrations/index.ts` by the generate script. You don't need to manually edit this file.

### 4. Run Migrations

```bash
# Run all migrations (SQL + TypeScript in interleaved order)
bun run api -- db:migrate

# Check migration status
bun run api -- db:migrate --status
```

**Migration Execution Order:**

When you run migrations, they execute in interleaved order based on their index:
1. SQL migration runs first (schema changes)
2. TypeScript migration runs immediately after (data transformations)

Example:
```
0020_fearless_gressill.sql       ✅ (schema change)
0021_brave_hero.sql              ✅ (schema change)
0021_brave_hero.migration.ts     ✅ (data transformation)
0022_epic_saga.sql               ✅ (schema change)
0022_epic_saga.migration.ts      ✅ (data transformation)
```

## Key Features

### 1. Transaction Safety

Each migration runs in its own database transaction:
- Success → Transaction committed
- Failure → Transaction rolled back automatically
- No partial data corruption

### 2. Service Injection

Inject any NestJS service into your migration:

```typescript
@Injectable()
export class MyMigration extends BaseMigration {
  constructor(
    private readonly fileService: FileService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    // Use injected services
    await this.fileService.migrateFiles(...);
    await this.emailService.sendNotification(...);
  }
}
```

### 3. Progress Tracking

All migrations are tracked in the `ts_migration` table:
- Execution status (success/failure)
- Execution time
- Error messages
- Timestamp

### 4. Type Safety

Full TypeScript typing for database operations:

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  // Full schema typing and autocomplete
  const users = await db
    .select()
    .from(user)
    .where(eq(user.email, 'test@example.com'));
  
  // TypeScript knows the shape of `users`
  for (const u of users) {
    console.log(u.name); // ✓ Type-safe
  }
}
```

## Migration Naming Convention

**Format**: `XXXX_description.migration.ts`

- `XXXX`: 4-digit index matching Drizzle SQL migration numbering
- `description`: Brief description using snake_case
- `.migration.ts`: Suffix identifying it as a migration

**Examples**:
- `0021_add_user_preferences.migration.ts`
- `0022_migrate_file_storage.migration.ts`
- `0023_cleanup_orphaned_records.migration.ts`

**Important**: TypeScript migrations use the same numbering scheme as SQL migrations and are executed in interleaved order:
- `0020_fearless_gressill.sql` (SQL)
- `0021_add_user_preferences.migration.ts` (TypeScript)
- `0022_brave_hero.sql` (SQL)
- `0023_migrate_files.migration.ts` (TypeScript)

## Common Patterns

### Batch Processing

For large datasets:

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  const batchSize = 1000;
  let offset = 0;
  
  while (true) {
    const records = await db
      .select()
      .from(table)
      .limit(batchSize)
      .offset(offset);
    
    if (records.length === 0) break;
    
    // Process batch
    for (const record of records) {
      await this.processRecord(record);
    }
    
    offset += batchSize;
    console.log(`  ⏳ Processed ${offset} records...`);
  }
}
```

### Complex Data Transformation

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  const users = await db.select().from(user);
  
  for (const u of users) {
    // Transform data using business logic
    const normalized = await this.normalizeUserData(u);
    
    await db
      .update(user)
      .set(normalized)
      .where(eq(user.id, u.id));
  }
}
```

### File Migration

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  const files = await db.select().from(file);
  
  for (const f of files) {
    // Move file to new storage
    const newPath = await this.fileService.migrateToNewStorage(
      f.path,
      'new-bucket'
    );
    
    await db
      .update(file)
      .set({ path: newPath })
      .where(eq(file.id, f.id));
  }
}
```

### External API Integration

```typescript
async up(db: NodePgDatabase<typeof schema>): Promise<void> {
  const records = await db.select().from(table);
  
  for (const record of records) {
    // Fetch data from external API
    const externalData = await this.apiService.enrichData(record.id);
    
    await db
      .update(table)
      .set({ metadata: externalData })
      .where(eq(table.id, record.id));
  }
}
```

## Best Practices

1. **Keep migrations focused**: One migration = one logical change
2. **Make migrations idempotent**: Safe to run multiple times
3. **Add progress logging**: Essential for long-running migrations
4. **Test thoroughly**: Test on development data first
5. **Use batch processing**: For large datasets to avoid memory issues
6. **Handle errors gracefully**: Provide clear error messages
7. **Document complex logic**: Explain WHY, not just WHAT
8. **Consider rollback**: Implement `down()` if possible

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check error message in console output
2. Check `ts_migration` table for details:
   ```sql
   SELECT * FROM ts_migration WHERE success = false;
   ```
3. Fix the migration code
4. Remove the failed migration record:
   ```sql
   DELETE FROM ts_migration WHERE id = 'your_migration_id';
   ```
5. Run migrations again

### Reset All TypeScript Migrations

To start fresh (⚠️ development only):

```sql
DROP TABLE ts_migration;
```

Then run migrations again.

### Migration Won't Run

Check if it's already executed:

```bash
bun run api -- db:migrate --status
```

If it shows as executed but you want to re-run it:

```sql
DELETE FROM ts_migration WHERE id = 'your_migration_id';
```

## Architecture

### Flow Diagram

```
CLI Command
    ↓
MigrateCommand
    ↓
MigrationRunnerService
    ↓
┌─────────────────────────┐
│ For each migration:     │
│ 1. Check if executed    │
│ 2. Start transaction    │
│ 3. Run migration.up()   │
│ 4. Record in ts_migration│
│ 5. Commit transaction   │
└─────────────────────────┘
```

### Key Components

- **Migration Interface**: Defines contract for migrations
- **BaseMigration**: Abstract base class with common functionality
- **MigrationRegistry**: Registers and tracks all migrations
- **MigrationRunnerService**: Executes migrations with transaction management
- **MigrationModule**: NestJS module providing DI container

## SQL vs TypeScript Migrations

| Feature | SQL | TypeScript |
|---------|-----|-----------|
| Schema changes | ✅ Best | ❌ Not recommended |
| Complex logic | ❌ Limited | ✅ Full capability |
| Service access | ❌ No | ✅ Yes |
| Type safety | ❌ No | ✅ Yes |
| Transaction support | ✅ Yes | ✅ Yes |
| Debugging | ❌ Difficult | ✅ Easy |
| IDE support | ❌ Limited | ✅ Full |

## When to Use Each

### Use SQL Migrations (Drizzle) for:
- Creating/altering tables
- Adding/removing columns
- Creating indexes and constraints
- Simple data updates
- Database schema changes

### Use TypeScript Migrations for:
- Complex data transformations
- Business logic during migration
- File storage migrations
- External API integrations
- Batch processing with progress tracking
- Operations requiring multiple services
- Data validation using business rules

## Examples

See the example migrations in `migrations/`:
- `20241124000000_example_data_transformation.migration.ts`
- `20241124000001_example_with_service_injection.migration.ts`

## Documentation

For detailed documentation, see: `apps/api/docs/TYPESCRIPT-MIGRATIONS.md`
