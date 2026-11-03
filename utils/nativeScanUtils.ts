import { readdir, stat } from 'fs/promises';
import path from 'path';
import { NativeFileDescriptor } from '../ipcContracts';

export const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.avi', '.mov', '.wmv', '.flv', '.mp4', '.m4v',
  '.3gp', '.ts', '.webm', '.ogv'
]);

export const scanNativeDirectory = async (directoryPath: string): Promise<NativeFileDescriptor[]> => {
  const results: NativeFileDescriptor[] = [];
  const walk = async (currentPath: string, relativePrefix: string): Promise<void> => {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const metadata = await stat(absolutePath);
        results.push({
          path: absolutePath,
          relativePath,
          size: metadata.size,
          lastModified: metadata.mtimeMs
        });
      }
    }
  };
  await walk(directoryPath, '');
  return results;
};
