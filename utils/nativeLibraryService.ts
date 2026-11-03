import { BlackCodApi, NativeScanProgress } from '../ipcContracts';
import { VideoIndexRecord } from '../types';
import { nativeDescriptorToIndexRecord } from './libraryUtils';
import { saveLibraryIndex } from './storageUtils';

export interface NativeLibraryScanResult {
  scanId: string;
  records: VideoIndexRecord[];
  cancelled: boolean;
}

export const scanNativeLibrary = async (
  api: BlackCodApi,
  libraryPath: string,
  libraryId: string,
  onProgress?: (progress: NativeScanProgress) => void
): Promise<NativeLibraryScanResult> => {
  const scanId = crypto.randomUUID();
  const removeProgressListener = api.onScanProgress(progress => {
    if (progress.scanId === scanId) onProgress?.(progress);
  });
  try {
    const descriptors = await api.scanDirectory(libraryPath, scanId);
    const records = descriptors.map(descriptor => nativeDescriptorToIndexRecord(descriptor, libraryId));
    await saveLibraryIndex(records);
    return { scanId, records, cancelled: false };
  } finally {
    removeProgressListener();
  }
};

export const cancelNativeLibraryScan = (api: BlackCodApi, scanId: string): Promise<boolean> =>
  api.cancelDirectoryScan(scanId);
