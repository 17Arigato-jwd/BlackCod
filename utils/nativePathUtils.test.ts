import { describe, expect, it } from 'vitest';
import { isPathWithin, normalizeNativePath } from './nativePathUtils';

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

  it('only accepts paths inside an approved library root', () => {
    expect(isPathWithin('/media/library/video.mp4', '/media/library')).toBe(true);
    expect(isPathWithin('/media/library-other/video.mp4', '/media/library')).toBe(false);
    expect(isPathWithin('/media/library/../private/video.mp4', '/media/library')).toBe(false);
  });
});
