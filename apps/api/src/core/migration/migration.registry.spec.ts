import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationRegistry } from './migration.registry';
import { BaseMigration } from './abstract/base-migration';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/config/drizzle/schema';

// Test migration classes
class TestMigration1 extends BaseMigration {
  readonly id = '20240101000000_test_1';
  readonly description = 'Test migration 1';

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    // Test implementation
  }
}

class TestMigration2 extends BaseMigration {
  readonly id = '20240101000001_test_2';
  readonly description = 'Test migration 2';

  async up(db: NodePgDatabase<typeof schema>): Promise<void> {
    // Test implementation
  }
}

describe('MigrationRegistry', () => {
  let registry: MigrationRegistry;

  beforeEach(() => {
    registry = new MigrationRegistry();
  });

  it('should register a migration', () => {
    registry.register(TestMigration1);
    expect(registry.has('20240101000000_test_1')).toBe(true);
  });

  it('should get a registered migration', () => {
    registry.register(TestMigration1);
    const migration = registry.get('20240101000000_test_1');
    expect(migration).toBe(TestMigration1);
  });

  it('should return all registered migrations', () => {
    registry.register(TestMigration1);
    registry.register(TestMigration2);
    
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]).toBe(TestMigration1);
    expect(all[1]).toBe(TestMigration2);
  });

  it('should return migrations sorted by ID', () => {
    // Register in reverse order
    registry.register(TestMigration2);
    registry.register(TestMigration1);
    
    const all = registry.getAll();
    expect(all[0]).toBe(TestMigration1); // Earlier timestamp
    expect(all[1]).toBe(TestMigration2); // Later timestamp
  });

  it('should return all migration IDs sorted', () => {
    registry.register(TestMigration2);
    registry.register(TestMigration1);
    
    const ids = registry.getIds();
    expect(ids).toEqual([
      '20240101000000_test_1',
      '20240101000001_test_2',
    ]);
  });

  it('should throw error when registering duplicate migration', () => {
    registry.register(TestMigration1);
    expect(() => registry.register(TestMigration1)).toThrow(
      'Migration with id "20240101000000_test_1" is already registered'
    );
  });

  it('should return undefined for non-existent migration', () => {
    const migration = registry.get('nonexistent');
    expect(migration).toBeUndefined();
  });

  it('should return false for non-existent migration check', () => {
    expect(registry.has('nonexistent')).toBe(false);
  });
});
