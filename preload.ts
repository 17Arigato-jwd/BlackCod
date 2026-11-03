import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';
import { BlackCodApi, NativeScanProgress } from './ipcContracts';

const api: BlackCodApi = {
  version: '1.1.4',
  runtime: 'electron',
  selectDirectory: () => ipcRenderer.invoke('blackcod:select-directory'),
  scanDirectory: (directoryPath: string, scanId?: string) => ipcRenderer.invoke('blackcod:scan-directory', directoryPath, scanId),
  cancelDirectoryScan: (scanId: string) => ipcRenderer.invoke('blackcod:cancel-directory-scan', scanId),
  getMediaUrl: (filePath: string) => ipcRenderer.invoke('blackcod:get-media-url', filePath),
  onScanProgress: (listener: (progress: NativeScanProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: NativeScanProgress) => listener(progress);
    ipcRenderer.on('blackcod:scan-progress', handler);
    return () => ipcRenderer.removeListener('blackcod:scan-progress', handler);
  },
  revealPath: (path: string) => ipcRenderer.invoke('blackcod:reveal-path', path)
};

contextBridge.exposeInMainWorld('blackcod', api);
