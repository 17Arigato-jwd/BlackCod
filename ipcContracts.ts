export interface BlackCodApi {
  version: string;
  runtime: 'electron' | 'browser';
  selectDirectory: () => Promise<string | null>;
  scanDirectory: (directoryPath: string, scanId?: string) => Promise<NativeFileDescriptor[]>;
  cancelDirectoryScan: (scanId: string) => Promise<boolean>;
  onScanProgress: (listener: (progress: NativeScanProgress) => void) => () => void;
  revealPath: (path: string) => Promise<boolean>;
}

export interface NativeFileDescriptor {
  path: string;
  relativePath: string;
  size: number;
  lastModified: number;
}

export interface NativeScanProgress {
  scanId: string;
  scannedFiles: number;
  videoFiles: number;
  currentPath: string;
}
