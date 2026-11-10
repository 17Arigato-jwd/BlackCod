import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import { stat } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { normalizeNativePath } from "./utils/nativePathUtils";
import { isPathWithin } from "./utils/nativePathUtils";
import { scanNativeDirectory } from "./utils/nativeScanUtils";

const cancelledScans = new Set<string>();
const approvedLibraryRoots = new Set<string>();

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
    const selectedPath = result.canceled ? null : result.filePaths[0] || null;
    if (selectedPath) approvedLibraryRoots.add(path.resolve(selectedPath));
    return selectedPath;
  });
  ipcMain.handle('blackcod:scan-directory', async (event, directoryPath: unknown, scanIdValue: unknown) => {
    const safePath = normalizeNativePath(directoryPath);
    if (!safePath) throw new Error('Invalid directory path.');
    const metadata = await stat(safePath);
    if (!metadata.isDirectory()) throw new Error('The selected path is not a directory.');
    approvedLibraryRoots.add(safePath);
    const scanId = typeof scanIdValue === 'string' && scanIdValue ? scanIdValue : crypto.randomUUID();
    cancelledScans.delete(scanId);
    try {
      return await scanNativeDirectory(safePath, {
        scanId,
        isCancelled: () => cancelledScans.has(scanId),
        onProgress: progress => event.sender.send('blackcod:scan-progress', progress)
      });
      ipcMain.handle('blackcod:get-media-url', async (_event, filePath: unknown) => {
        const safePath = normalizeNativePath(filePath);
        if (!safePath || ![...approvedLibraryRoots].some(root => isPathWithin(safePath, root))) {
          return null;
        }
        const metadata = await stat(safePath);
        if (!metadata.isFile()) return null;
        return pathToFileURL(safePath).toString();
      });
    } finally {
      cancelledScans.delete(scanId);
    }
  });
  ipcMain.handle('blackcod:cancel-directory-scan', async (_event, scanId: unknown) => {
    if (typeof scanId !== 'string' || !scanId) return false;
    cancelledScans.add(scanId);
    return true;
  });
  ipcMain.handle('blackcod:reveal-path', async (_event, targetPath: unknown) => {
    const safePath = normalizeNativePath(targetPath);
    if (!safePath) {
      return false;
    }
    try {
      const metadata = await stat(safePath);
      if (metadata.isDirectory()) {
        await shell.openPath(safePath);
      } else {
        shell.showItemInFolder(safePath);
      }
      return true;
    } catch {
      shell.showItemInFolder(safePath);
      return true;
    }
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
