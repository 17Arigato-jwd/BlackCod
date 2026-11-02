import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('blackcod', {
  version: '1.1.2'
});
