import { describe, expect, it } from 'vitest';
import { normalizeNativePath } from './nativePathUtils';

describe('native path validation', () => {
  it('accepts and normalizes absolute paths', () => {
    const value = normalizeNativePath('/tmp/blackcod/../video.mp4');
    expect(value).toBe('/tmp/video.mp4');
  });

  it('rejects renderer-controlled relative and malformed values', () => {
    expect(normalizeNativePath('video.mp4')).toBeNull();
    expect(normalizeNativePath('')).toBeNull();
    expect(normalizeNativePath('/tmp/video\0.mp4')).toBeNull();
    expect(normalizeNativePath(null)).toBeNull();
  });
});
