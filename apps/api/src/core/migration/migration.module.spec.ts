import { Test, type TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationModule } from './migration.module';
import { MigrationRegistry } from './migration.registry';
import { MigrationRunnerService } from './services/migration-runner.service';
import { DatabaseModule } from '../modules/database/database.module';

describe('MigrationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MigrationModule, DatabaseModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide MigrationRegistry', () => {
    const registry = module.get<MigrationRegistry>(MigrationRegistry);
    expect(registry).toBeDefined();
  });

  it('should provide MigrationRunnerService', () => {
    const runner = module.get<MigrationRunnerService>(MigrationRunnerService);
    expect(runner).toBeDefined();
  });
});
