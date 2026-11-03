import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import { readdir, stat } from "fs/promises";
import path from "path";
import { normalizeNativePath } from "./utils/nativePathUtils";
import { NativeFileDescriptor } from "./ipcContracts";

const videoExtensions = new Set(['.mkv', '.avi', '.mov', '.wmv', '.flv', '.mp4', '.m4v', '.3gp', '.ts', '.webm', '.ogv']);

const scanNativeDirectory = async (directoryPath: string): Promise<NativeFileDescriptor[]> => {
  const results: NativeFileDescriptor[] = [];
  const walk = async (currentPath: string, relativePrefix: string): Promise<void> => {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (videoExtensions.has(path.extname(entry.name).toLowerCase())) {
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

app.whenReady().then(() => {
  ipcMain.handle('blackcod:select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0] || null;
  });
  ipcMain.handle('blackcod:scan-directory', async (_event, directoryPath: unknown) => {
    const safePath = normalizeNativePath(directoryPath);
    if (!safePath) throw new Error('Invalid directory path.');
    const metadata = await stat(safePath);
    if (!metadata.isDirectory()) throw new Error('The selected path is not a directory.');
    return scanNativeDirectory(safePath);
  });
  ipcMain.handle('blackcod:reveal-path', async (_event, targetPath: unknown) => {
    const safePath = normalizeNativePath(targetPath);
    if (!safePath) {
      return false;
    }
    const result = await shell.openPath(safePath);
    if (result) throw new Error(result);
    return true;
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: file:",
      "connect-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    });
  });
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
