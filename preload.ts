import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';
import { BlackCodApi } from './ipcContracts';

const api: BlackCodApi = {
  version: '1.1.2',
  runtime: 'electron',
  selectDirectory: () => ipcRenderer.invoke('blackcod:select-directory'),
  revealPath: (path: string) => ipcRenderer.invoke('blackcod:reveal-path', path)
};

contextBridge.exposeInMainWorld('blackcod', api);
