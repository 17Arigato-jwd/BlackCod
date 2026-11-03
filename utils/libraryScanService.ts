import { getFilesRecursively, DirectoryScanOptions } from './storageUtils';

export interface LibraryScanProgress {
  scannedFiles: number;
  videoFiles: number;
  currentPath: string;
}

export interface LibraryScanRequest {
  handle: FileSystemDirectoryHandle;
  signal?: AbortSignal;
  onProgress?: (progress: LibraryScanProgress) => void;
}

export interface LibraryScanResult {
  sourceName: string;
  files: File[];
  scannedFiles: number;
  cancelled: boolean;
}

export const scanLibrary = async (request: LibraryScanRequest): Promise<LibraryScanResult> => {
  let scannedFiles = 0;
  let videoFiles = 0;
  const options: DirectoryScanOptions = {
    signal: request.signal,
    onFile: currentPath => {
      scannedFiles += 1;
      request.onProgress?.({ scannedFiles, videoFiles, currentPath });
    }
  };
  const files = await getFilesRecursively(request.handle, '', options);
  videoFiles = files.length;
  request.onProgress?.({
    scannedFiles,
    videoFiles,
    currentPath: request.handle.name
  });
  return {
    sourceName: request.handle.name,
    files,
    scannedFiles,
    cancelled: request.signal?.aborted === true
  };
};

export const scanWithRetry = async (
  request: LibraryScanRequest,
  attempts = 2
): Promise<LibraryScanResult> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (request.signal?.aborted) {
      return { sourceName: request.handle.name, files: [], scannedFiles: 0, cancelled: true };
    }
    try {
      return await scanLibrary(request);
    } catch (error) {
      lastError = error;
      if (request.signal?.aborted) {
        return { sourceName: request.handle.name, files: [], scannedFiles: 0, cancelled: true };
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Library scan failed.');
};
