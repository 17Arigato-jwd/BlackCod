import { get, set, del } from 'idb-keyval';
import { AppConfig, ChannelConfig } from '../types';
import { isVideoFile } from './videoUtils';

const CONFIG_KEY = 'localtube_config';
const CHANNEL_DATA_KEY = 'localtube_channel_data';
const CHANNEL_HANDLES_KEY = 'localtube_channel_handles';
const THUMBNAIL_STORE_PREFIX = 'thumb_';
const DIR_HANDLE_KEY = 'localtube_dir_handle'; // Legacy single handle

export const defaultConfig: AppConfig = {
  likedVideoIds: [],
  history: [],
  ratings: {},
  hiddenVideoIds: [],
  customVideoTitles: {},
  customCategories: [],
  videoChannelOverrides: {},
  userProfile: {
    name: 'User',
  },
  themeColor: 'default',
  customThemeColor: '#3b82f6',
  enableGradient: false,
  uiDensity: 'comfortable',
  autoplay: true,
  defaultSort: 'date',
  startupFolderNames: []
};

export const defaultChannelData: Record<string, ChannelConfig> = {};

// --- Config Management (LocalStorage) ---

export const loadConfig = (): AppConfig => {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    return { ...defaultConfig, ...parsed };
  }
  return defaultConfig;
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const toggleLike = (videoId: string, isLiked: boolean): AppConfig => {
  const config = loadConfig();
  if (isLiked) {
    if (!config.likedVideoIds.includes(videoId)) {
      config.likedVideoIds.push(videoId);
    }
  } else {
    config.likedVideoIds = config.likedVideoIds.filter(id => id !== videoId);
  }
  saveConfig(config);
  return config;
};

export const rateVideo = (videoId: string, rating: number): AppConfig => {
  const config = loadConfig();
  if (rating > 0) {
    config.ratings[videoId] = rating;
  } else {
    delete config.ratings[videoId];
  }
  saveConfig(config);
  return config;
};

export const hideVideo = (videoId: string): AppConfig => {
  const config = loadConfig();
  if (!config.hiddenVideoIds.includes(videoId)) {
    config.hiddenVideoIds.push(videoId);
  }
  saveConfig(config);
  return config;
};

export const renameVideo = (videoId: string, newTitle: string): AppConfig => {
  const config = loadConfig();
  if (newTitle && newTitle.trim()) {
    config.customVideoTitles[videoId] = newTitle.trim();
  } else {
    delete config.customVideoTitles[videoId];
  }
  saveConfig(config);
  return config;
};

export const addCustomCategory = (category: string): AppConfig => {
  const config = loadConfig();
  if (category && !config.customCategories?.includes(category)) {
    if (!config.customCategories) config.customCategories = [];
    config.customCategories.push(category);
    saveConfig(config);
  }
  return config;
};

export const moveVideosToChannel = (videoIds: string[], targetChannel: string): AppConfig => {
  const config = loadConfig();
  if (!config.videoChannelOverrides) config.videoChannelOverrides = {};
  
  videoIds.forEach(id => {
    config.videoChannelOverrides[id] = targetChannel;
  });
  
  saveConfig(config);
  return config;
};

export const removeVideoChannelOverrides = (videoIds: string[]): AppConfig => {
  const config = loadConfig();
  if (config.videoChannelOverrides) {
    videoIds.forEach(id => {
      delete config.videoChannelOverrides[id];
    });
    saveConfig(config);
  }
  return config;
};

export const addToHistory = (videoId: string): AppConfig => {
  const config = loadConfig();
  config.history = config.history.filter(id => id !== videoId);
  config.history.unshift(videoId);
  if (config.history.length > 50) {
    config.history.pop();
  }
  saveConfig(config);
  return config;
};

// --- Video Data Export/Import Helpers ---

export const getVideoExportData = () => {
  const config = loadConfig();
  return {
    customVideoTitles: config.customVideoTitles,
    ratings: config.ratings,
    videoChannelOverrides: config.videoChannelOverrides,
    hiddenVideoIds: config.hiddenVideoIds,
    likedVideoIds: config.likedVideoIds
  };
};

export const importVideoData = (data: any) => {
  const config = loadConfig();
  // STRAIGHT REPLACE: Overwrite the video metadata fields with the uploaded ones
  const newConfig = {
    ...config,
    customVideoTitles: data.customVideoTitles || {},
    ratings: data.ratings || {},
    videoChannelOverrides: data.videoChannelOverrides || {},
    hiddenVideoIds: data.hiddenVideoIds || [],
    likedVideoIds: data.likedVideoIds || []
  };
  saveConfig(newConfig);
  return newConfig;
};

// --- Channel Data Management (IndexedDB) ---

export const loadChannels = async (): Promise<Record<string, ChannelConfig>> => {
  const data = await get(CHANNEL_DATA_KEY);
  return data || defaultChannelData;
};

export const saveChannel = async (channelId: string, updates: Partial<ChannelConfig>) => {
  const channels = await loadChannels();
  const current = channels[channelId] || { id: channelId, category: 'Uncategorized', isSubscribed: false };
  channels[channelId] = { ...current, ...updates };
  await set(CHANNEL_DATA_KEY, channels);
  return channels;
};

export const deleteChannelConfig = async (channelId: string) => {
  const channels = await loadChannels();
  if (channels[channelId]) {
    delete channels[channelId];
    await set(CHANNEL_DATA_KEY, channels);
  }
  // Also remove handle if exists
  await removeChannelHandle(channelId);
  return channels;
};

export const importChannelData = async (data: Record<string, ChannelConfig>) => {
  await set(CHANNEL_DATA_KEY, data);
};

// --- Thumbnail Management (IndexedDB) ---

export const saveCustomThumbnail = async (videoId: string, blob: Blob | string) => {
  await set(THUMBNAIL_STORE_PREFIX + videoId, blob);
};

export const getCustomThumbnail = async (videoId: string): Promise<string | null> => {
  const data = await get(THUMBNAIL_STORE_PREFIX + videoId);
  if (!data) return null;
  if (typeof data === 'string') return data; 
  return URL.createObjectURL(data as Blob);
};

// --- Directory Handle Management (IndexedDB) ---

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  await set(DIR_HANDLE_KEY, handle);
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | undefined> => {
  return await get(DIR_HANDLE_KEY);
};

// --- Multi-Folder Handle Management ---

export const saveChannelHandle = async (channelName: string, handle: FileSystemDirectoryHandle) => {
  const handles = (await get(CHANNEL_HANDLES_KEY)) || {};
  handles[channelName] = handle;
  await set(CHANNEL_HANDLES_KEY, handles);
};

export const loadChannelHandles = async (): Promise<Record<string, FileSystemDirectoryHandle>> => {
  return (await get(CHANNEL_HANDLES_KEY)) || {};
};

export const removeChannelHandle = async (channelName: string) => {
  const handles = (await get(CHANNEL_HANDLES_KEY)) || {};
  if (handles[channelName]) {
    delete handles[channelName];
    await set(CHANNEL_HANDLES_KEY, handles);
  }
};

// --- File System Access API Helpers ---

export async function verifyPermission(fileHandle: FileSystemHandle, readWrite = false) {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  // @ts-ignore
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

export async function getFilesRecursively(entry: FileSystemDirectoryHandle, path = ''): Promise<File[]> {
  const files: File[] = [];
  // @ts-ignore
  for await (const handle of entry.values()) {
    try {
        if (handle.kind === 'file') {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false,
          });
          if (isVideoFile(file)) {
            files.push(file);
          }
        } else if (handle.kind === 'directory') {
          const dirHandle = handle as FileSystemDirectoryHandle;
          const subFiles = await getFilesRecursively(dirHandle, path + handle.name + '/');
          files.push(...subFiles);
        }
    } catch (err) {
        console.warn(`Failed to access handle in ${path}:`, err);
    }
  }
  return files;
}

// --- System File Export ---

export const downloadSystemFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const saveFileToFolder = async (filename: string, content: string) => {
  try {
    // Check if File System Access API is supported (Chrome/Edge/Opera)
    // @ts-ignore
    if (window.showSaveFilePicker) {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Configuration File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } else {
      // Fallback for Firefox/Safari
      downloadSystemFile(filename, content);
      return true;
    }
  } catch (err) {
    // User cancelled or error
    console.debug('Save cancelled or failed', err);
    return false;
  }
}