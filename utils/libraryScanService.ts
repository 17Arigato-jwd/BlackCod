import { getFilesRecursively, DirectoryScanOptions, saveLibraryScanJob, updateLibraryScanJob } from './storageUtils';
import { LibraryScanJob } from '../types';

export interface LibraryScanProgress {
  scannedFiles: number;
  videoFiles: number;
  currentPath: string;
}

export interface LibraryScanRequest {
  handle: FileSystemDirectoryHandle;
  libraryId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: LibraryScanProgress) => void;
}

export interface LibraryScanResult {
  sourceName: string;
  files: File[];
  scannedFiles: number;
  cancelled: boolean;
}

export type LibraryScanner = (
  handle: FileSystemDirectoryHandle,
  path: string,
  options: DirectoryScanOptions
) => Promise<File[]>;

export const scanLibrary = async (
  request: LibraryScanRequest,
  scanner: LibraryScanner = getFilesRecursively
): Promise<LibraryScanResult> => {
  const job: LibraryScanJob = {
    id: crypto.randomUUID(),
    libraryId: request.libraryId || request.handle.name,
    status: 'running',
    scannedFiles: 0,
    videoFiles: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await saveLibraryScanJob(job);
  let scannedFiles = 0;
  let videoFiles = 0;
  const options: DirectoryScanOptions = {
    signal: request.signal,
    onFile: currentPath => {
      scannedFiles += 1;
      request.onProgress?.({ scannedFiles, videoFiles, currentPath });
      void updateLibraryScanJob(job.id, { scannedFiles, videoFiles });
    }
  };
  try {
    const files = await scanner(request.handle, '', options);
    videoFiles = files.length;
    const status = request.signal?.aborted ? 'cancelled' : 'complete';
    await updateLibraryScanJob(job.id, { status, scannedFiles, videoFiles });
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
  } catch (error) {
    await updateLibraryScanJob(job.id, {
      status: request.signal?.aborted ? 'cancelled' : 'failed',
      scannedFiles,
      videoFiles,
      error: error instanceof Error ? error.message : 'Library scan failed.'
    });
    throw error;
  }
};

export const scanWithRetry = async (
  request: LibraryScanRequest,
  attempts = 2,
  scanner: LibraryScanner = getFilesRecursively
): Promise<LibraryScanResult> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (request.signal?.aborted) {
      return { sourceName: request.handle.name, files: [], scannedFiles: 0, cancelled: true };
    }
    try {
      return await scanLibrary(request, scanner);
    } catch (error) {
      lastError = error;
      if (request.signal?.aborted) {
        return { sourceName: request.handle.name, files: [], scannedFiles: 0, cancelled: true };
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Library scan failed.');
};
