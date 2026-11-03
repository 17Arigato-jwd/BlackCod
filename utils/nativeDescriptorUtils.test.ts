import { describe, expect, it } from 'vitest';
import { nativeDescriptorToIndexRecord } from './libraryUtils';

describe('native descriptor indexing', () => {
  it('creates stable index records without constructing renderer File objects', () => {
    const record = nativeDescriptorToIndexRecord({
      path: '/media/library/course/lesson.mp4',
      relativePath: 'course/lesson.mp4',
      size: 42,
      lastModified: 100
    }, 'Library');

    expect(record.id).toBe('Library/course/lesson.mp4-42-100');
    expect(record.title).toBe('lesson');
    expect(record.nativePath).toBe('/media/library/course/lesson.mp4');
    expect(record.duration).toBeNull();
  });
});
