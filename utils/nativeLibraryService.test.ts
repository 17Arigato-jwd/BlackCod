import { describe, expect, it, vi } from 'vitest';
import { BlackCodApi } from '../ipcContracts';
import { cancelNativeLibraryScan, scanNativeLibrary } from './nativeLibraryService';

const createApi = (): BlackCodApi => ({
  version: '1.1.4',
  runtime: 'electron',
  selectDirectory: vi.fn(),
  scanDirectory: vi.fn(async (_path: string, scanId?: string) => {
    progressListener?.({ scanId: scanId || '', scannedFiles: 1, videoFiles: 1, currentPath: '/library/video.mp4' });
    return [{
      path: '/library/video.mp4',
      relativePath: 'video.mp4',
      size: 10,
      lastModified: 20
    }];
  }),
  cancelDirectoryScan: vi.fn(async () => true),
  getMediaUrl: vi.fn(),
  onScanProgress: vi.fn(listener => {
    progressListener = listener;
    return () => { progressListener = undefined; };
  }),
  revealPath: vi.fn()
});

let progressListener: ((progress: { scanId: string; scannedFiles: number; videoFiles: number; currentPath: string }) => void) | undefined;

describe('native library service', () => {
  it('maps descriptors, persists records, and forwards matching progress', async () => {
    const progress = vi.fn();
    const result = await scanNativeLibrary(createApi(), '/library', 'Library', progress);

    expect(result.records[0].nativePath).toBe('/library/video.mp4');
    expect(progress).toHaveBeenCalledOnce();
  });

  it('forwards cancellation to the native API', async () => {
    const api = createApi();
    await expect(cancelNativeLibraryScan(api, 'scan-1')).resolves.toBe(true);
    expect(api.cancelDirectoryScan).toHaveBeenCalledWith('scan-1');
  });
});
