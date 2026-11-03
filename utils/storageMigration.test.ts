import { describe, expect, it } from 'vitest';
import { defaultConfig, migratePersistedConfig, STORAGE_SCHEMA_VERSION } from './storageUtils';

describe('storage migrations', () => {
  it('wraps legacy raw config data in the current schema', () => {
    const migrated = migratePersistedConfig({
      likedVideoIds: ['video-1'],
      startupFolderNames: ['Library']
    });

    expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
    expect(migrated.config.likedVideoIds).toEqual(['video-1']);
    expect(migrated.config.startupFolderNames).toEqual(['Library']);
  });

  it('uses safe defaults for malformed persisted values', () => {
    const migrated = migratePersistedConfig(null);

    expect(migrated.config).toEqual(defaultConfig);
  });
});
