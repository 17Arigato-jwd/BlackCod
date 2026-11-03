import { describe, expect, it, vi } from 'vitest';
import { LibraryScanRequest, scanWithRetry } from './libraryScanService';

const request: LibraryScanRequest = {
  handle: { name: 'Library' } as FileSystemDirectoryHandle
};

describe('library scan service', () => {
  it('retries transient scanner failures', async () => {
    const scanner = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce([new File([], 'video.mp4')]);

    const result = await scanWithRetry(request, 2, scanner);

    expect(scanner).toHaveBeenCalledTimes(2);
    expect(result.files).toHaveLength(1);
    expect(result.cancelled).toBe(false);
  });

  it('stops before scanning when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const scanner = vi.fn();

    const result = await scanWithRetry({ ...request, signal: controller.signal }, 2, scanner);

    expect(scanner).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(true);
    expect(result.files).toHaveLength(0);
  });
});
