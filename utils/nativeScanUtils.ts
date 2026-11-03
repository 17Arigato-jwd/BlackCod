import { readdir, stat } from 'fs/promises';
import path from 'path';
import { NativeFileDescriptor, NativeScanProgress } from '../ipcContracts';

export const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.avi', '.mov', '.wmv', '.flv', '.mp4', '.m4v',
  '.3gp', '.ts', '.webm', '.ogv'
]);

export const scanNativeDirectory = async (
  directoryPath: string,
  options: { scanId?: string; isCancelled?: () => boolean; onProgress?: (progress: NativeScanProgress) => void } = {}
): Promise<NativeFileDescriptor[]> => {
  const results: NativeFileDescriptor[] = [];
  let scannedFiles = 0;
  const walk = async (currentPath: string, relativePrefix: string): Promise<void> => {
    if (options.isCancelled?.()) return;
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (options.isCancelled?.()) return;
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const metadata = await stat(absolutePath);
        scannedFiles += 1;
        results.push({
          path: absolutePath,
          relativePath,
          size: metadata.size,
          lastModified: metadata.mtimeMs
        });
        options.onProgress?.({
          scanId: options.scanId || '',
          scannedFiles,
          videoFiles: results.length,
          currentPath: absolutePath
        });
      }
    }
  };
  await walk(directoryPath, '');
  return results;
};
