export interface BlackCodApi {
  version: string;
  runtime: 'electron' | 'browser';
  selectDirectory: () => Promise<string | null>;
  revealPath: (path: string) => Promise<boolean>;
}
