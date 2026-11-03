export interface BlackCodApi {
  version: string;
  runtime: 'electron' | 'browser';
  selectDirectory: () => Promise<string | null>;
  scanDirectory: (directoryPath: string) => Promise<NativeFileDescriptor[]>;
  revealPath: (path: string) => Promise<boolean>;
}

export interface NativeFileDescriptor {
  path: string;
  relativePath: string;
  size: number;
  lastModified: number;
}
