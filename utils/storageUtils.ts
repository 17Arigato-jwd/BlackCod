import { get, set, del } from 'idb-keyval';
import { AnalysisJob, AppConfig, ChannelConfig, LibraryScanJob, ModelPack, Playlist, SmartChannel, VideoAnalysis, VideoChapter, VideoIndexRecord, VideoTag } from '../types';
import { isVideoFile } from './videoUtils';
import { normalizeChapters } from './analysisUtils';

const CONFIG_KEY = 'localtube_config';
const CHANNEL_DATA_KEY = 'localtube_channel_data';
const CHANNEL_HANDLES_KEY = 'localtube_channel_handles';
const THUMBNAIL_STORE_PREFIX = 'thumb_';
const DIR_HANDLE_KEY = 'localtube_dir_handle'; // Legacy single handle
const PLAYLISTS_KEY = 'localtube_playlists';
const LIBRARY_INDEX_KEY = 'localtube_library_index';
const VIDEO_TAGS_KEY = 'localtube_video_tags';
const SMART_CHANNELS_KEY = 'localtube_smart_channels';
const ANALYSIS_JOBS_KEY = 'localtube_analysis_jobs';
const VIDEO_ANALYSIS_KEY = 'localtube_video_analysis';
const MODEL_PACKS_KEY = 'localtube_model_packs';
const PLAY_QUEUE_KEY = 'localtube_play_queue';
const STORAGE_SCHEMA_KEY = 'localtube_storage_schema';
const LIBRARY_SCAN_JOBS_KEY = 'localtube_library_scan_jobs';
export const STORAGE_SCHEMA_VERSION = 2;
let indexedDbSchemaPromise: Promise<void> | undefined;

export const ensureIndexedDbSchema = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  if (!indexedDbSchemaPromise) {
    indexedDbSchemaPromise = (async () => {
      const stored = await get<number>(STORAGE_SCHEMA_KEY);
      if (stored !== STORAGE_SCHEMA_VERSION) {
        await set(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      }
    })();
  }
  await indexedDbSchemaPromise;
};

export const loadLibraryScanJobs = async (): Promise<LibraryScanJob[]> => {
  if (typeof indexedDB === 'undefined') return [];
  await ensureIndexedDbSchema();
  return (await get<LibraryScanJob[]>(LIBRARY_SCAN_JOBS_KEY)) || [];
};

export const saveLibraryScanJob = async (job: LibraryScanJob): Promise<LibraryScanJob> => {
  if (typeof indexedDB === 'undefined') return job;
  const jobs = (await loadLibraryScanJobs()).filter(item => item.id !== job.id);
  await set(LIBRARY_SCAN_JOBS_KEY, [...jobs, job]);
  return job;
};

export const updateLibraryScanJob = async (
  jobId: string,
  updates: Partial<Pick<LibraryScanJob, 'status' | 'scannedFiles' | 'videoFiles' | 'updatedAt' | 'error'>>
): Promise<LibraryScanJob | undefined> => {
  const jobs = await loadLibraryScanJobs();
  const current = jobs.find(job => job.id === jobId);
  if (!current) return undefined;
  const updated = { ...current, ...updates, updatedAt: Date.now() };
  await saveLibraryScanJob(updated);
  return updated;
};

interface ConfigEnvelope {
  schemaVersion: number;
  config: Partial<AppConfig>;
}

export const migratePersistedConfig = (value: unknown): ConfigEnvelope => {
  const raw = value && typeof value === 'object' && 'config' in value
    ? value as { config?: unknown }
    : { config: value };
  const config = raw.config && typeof raw.config === 'object'
    ? raw.config as Partial<AppConfig>
    : {};
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    config: {
      ...defaultConfig,
      ...config,
      startupFolderNames: Array.isArray(config.startupFolderNames)
        ? config.startupFolderNames
        : defaultConfig.startupFolderNames
    }
  };
};

export const defaultConfig: AppConfig = {
  likedVideoIds: [],
  history: [],
  watchProgress: {},
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

export const loadPlaylists = (): Playlist[] => {
  try {
    const stored = localStorage.getItem(PLAYLISTS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((playlist): playlist is Playlist =>
      !!playlist &&
      typeof playlist === 'object' &&
      typeof (playlist as Playlist).id === 'string' &&
      typeof (playlist as Playlist).name === 'string' &&
      Array.isArray((playlist as Playlist).videoIds)
    );
  } catch (error) {
    console.error('Failed to load playlists.', error);
    return [];
  }
};

const savePlaylists = (playlists: Playlist[]) => {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
};

export const createPlaylist = (name: string): Playlist => {
  const now = Date.now();
  const playlist: Playlist = {
    id: crypto.randomUUID(),
    name: name.trim() || 'New Playlist',
    description: '',
    videoIds: [],
    createdAt: now,
    updatedAt: now
  };
  savePlaylists([...loadPlaylists(), playlist]);
  return playlist;
};

export const addVideoToPlaylist = (playlistId: string, videoId: string): Playlist[] => {
  const playlists = loadPlaylists().map(playlist =>
    playlist.id === playlistId && !playlist.videoIds.includes(videoId)
      ? { ...playlist, videoIds: [...playlist.videoIds, videoId], updatedAt: Date.now() }
      : playlist
  );
  savePlaylists(playlists);
  return playlists;
};

export const renamePlaylist = (playlistId: string, name: string): Playlist[] => {
  const trimmedName = name.trim();
  if (!trimmedName) return loadPlaylists();
  const playlists = loadPlaylists().map(playlist =>
    playlist.id === playlistId
      ? { ...playlist, name: trimmedName, updatedAt: Date.now() }
      : playlist
  );
  savePlaylists(playlists);
  return playlists;
};

export const removeVideoFromPlaylist = (playlistId: string, videoId: string): Playlist[] => {
  const playlists = loadPlaylists().map(playlist =>
    playlist.id === playlistId
      ? { ...playlist, videoIds: playlist.videoIds.filter(id => id !== videoId), updatedAt: Date.now() }
      : playlist
  );
  savePlaylists(playlists);
  return playlists;
};

export const moveVideoInPlaylist = (playlistId: string, videoId: string, direction: 'up' | 'down'): Playlist[] => {
  const playlists = loadPlaylists().map(playlist => {
    if (playlist.id !== playlistId) return playlist;
    const index = playlist.videoIds.indexOf(videoId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= playlist.videoIds.length) return playlist;
    const videoIds = [...playlist.videoIds];
    [videoIds[index], videoIds[targetIndex]] = [videoIds[targetIndex], videoIds[index]];
    return { ...playlist, videoIds, updatedAt: Date.now() };
  });
  savePlaylists(playlists);
  return playlists;
};

export const deletePlaylist = (playlistId: string): Playlist[] => {
  const playlists = loadPlaylists().filter(playlist => playlist.id !== playlistId);
  savePlaylists(playlists);
  return playlists;
};

export const loadLibraryIndex = async (): Promise<Record<string, VideoIndexRecord>> => {
  await ensureIndexedDbSchema();
  return (await get(LIBRARY_INDEX_KEY)) || {};
};

export const saveLibraryIndex = async (records: VideoIndexRecord[]) => {
  const current = await loadLibraryIndex();
  records.forEach(record => {
    current[record.id] = record;
  });
  await set(LIBRARY_INDEX_KEY, current);
};

export const reconcileLibraryIndex = async (libraryId: string, activeVideoIds: string[]) => {
  const current = await loadLibraryIndex();
  const activeIds = new Set(activeVideoIds);
  Object.values(current).forEach(record => {
    if (record.libraryId === libraryId && !activeIds.has(record.id)) {
      current[record.id] = { ...record, status: 'missing' };
    }
  });
  await set(LIBRARY_INDEX_KEY, current);
};

export const loadVideoTags = async (): Promise<Record<string, VideoTag[]>> => {
  await ensureIndexedDbSchema();
  return (await get(VIDEO_TAGS_KEY)) || {};
};

export const saveVideoTags = async (tags: VideoTag[]) => {
  const current = await loadVideoTags();
  tags.forEach(tag => {
    const existing = current[tag.videoId] || [];
    current[tag.videoId] = [
      ...existing.filter(item => item.tag !== tag.tag || item.source !== tag.source),
      tag
    ];
  });
  await set(VIDEO_TAGS_KEY, current);
};

export const loadSmartChannels = (): SmartChannel[] => {
  try {
    const value = localStorage.getItem(SMART_CHANNELS_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load smart channels.', error);
    return [];
  }
};

export const loadPlayQueue = (): string[] => {
  try {
    const value = localStorage.getItem(PLAY_QUEUE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : [];
  } catch (error) {
    console.error('Failed to load playback queue.', error);
    return [];
  }
};

export const savePlayQueue = (videoIds: string[]) => {
  localStorage.setItem(PLAY_QUEUE_KEY, JSON.stringify([...new Set(videoIds)]));
};

export const saveSmartChannels = (channels: SmartChannel[]) => {
  localStorage.setItem(SMART_CHANNELS_KEY, JSON.stringify(channels));
};

export const loadAnalysisJobs = async (): Promise<AnalysisJob[]> => {
  await ensureIndexedDbSchema();
  return (await get<AnalysisJob[]>(ANALYSIS_JOBS_KEY)) || [];
};

export const saveAnalysisJobs = async (jobs: AnalysisJob[]) => {
  await set(ANALYSIS_JOBS_KEY, jobs);
};

export const updateAnalysisJob = async (
  jobId: string,
  updates: Partial<Pick<AnalysisJob, 'status' | 'attempts' | 'updatedAt' | 'error'>>
): Promise<AnalysisJob | undefined> => {
  const jobs = await loadAnalysisJobs();
  let updatedJob: AnalysisJob | undefined;
  const nextJobs = jobs.map(job => {
    if (job.id !== jobId) return job;
    updatedJob = { ...job, ...updates, updatedAt: Date.now() };
    return updatedJob;
  });
  if (updatedJob) await saveAnalysisJobs(nextJobs);
  return updatedJob;
};

export const cancelAnalysisJob = async (jobId: string): Promise<AnalysisJob | undefined> =>
  updateAnalysisJob(jobId, { status: 'cancelled', error: undefined });

export const retryAnalysisJob = async (jobId: string): Promise<AnalysisJob | undefined> =>
  updateAnalysisJob(jobId, { status: 'queued', error: undefined });

export const enqueueAnalysisJob = async (
  videoId: string,
  kind: AnalysisJob['kind'],
  priority = 0
): Promise<AnalysisJob> => {
  const jobs = await loadAnalysisJobs();
  const existing = jobs.find(job => job.videoId === videoId && job.kind === kind && (job.status === 'queued' || job.status === 'running'));
  if (existing) return existing;
  const now = Date.now();
  const job: AnalysisJob = {
    id: crypto.randomUUID(),
    videoId,
    kind,
    priority,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now
  };
  await saveAnalysisJobs([...jobs, job]);
  return job;
};

export const loadVideoAnalyses = async (): Promise<Record<string, VideoAnalysis>> => {
  await ensureIndexedDbSchema();
  return (await get<Record<string, VideoAnalysis>>(VIDEO_ANALYSIS_KEY)) || {};
};

export const saveVideoAnalysis = async (analysis: VideoAnalysis) => {
  const analyses = await loadVideoAnalyses();
  analyses[analysis.videoId] = analysis;
  await set(VIDEO_ANALYSIS_KEY, analyses);
};

export const updateVideoChapters = async (videoId: string, chapters: VideoChapter[], duration = Number.MAX_SAFE_INTEGER): Promise<VideoAnalysis> => {
  const analyses = await loadVideoAnalyses();
  const current = analyses[videoId] || {
    videoId,
    analysisVersion: 1,
    status: 'pending' as const,
    language: null,
    summary: null,
    analyzedAt: null,
    error: null,
    transcript: [],
    modelId: null,
    chapters: []
  };
  const next = { ...current, chapters: normalizeChapters(chapters, duration) };
  analyses[videoId] = next;
  await set(VIDEO_ANALYSIS_KEY, analyses);
  return next;
};

export const loadModelPacks = async (): Promise<ModelPack[]> => {
  await ensureIndexedDbSchema();
  return (await get<ModelPack[]>(MODEL_PACKS_KEY)) || [];
};

export const saveModelPack = async (pack: ModelPack): Promise<ModelPack[]> => {
  const packs = (await loadModelPacks()).filter(item => item.id !== pack.id);
  const next = [...packs, pack];
  await set(MODEL_PACKS_KEY, next);
  return next;
};

export const setModelPackEnabled = async (packId: string, enabled: boolean): Promise<ModelPack[]> => {
  const next = (await loadModelPacks()).map(pack => pack.id === packId ? { ...pack, enabled } : pack);
  await set(MODEL_PACKS_KEY, next);
  return next;
};

export const removeModelPack = async (packId: string): Promise<ModelPack[]> => {
  const next = (await loadModelPacks()).filter(pack => pack.id !== packId);
  await set(MODEL_PACKS_KEY, next);
  return next;
};

// --- Config Management (LocalStorage) ---

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.values(value).every(item => typeof item === 'string');

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.values(value).every(item => typeof item === 'number' && Number.isFinite(item));

const normalizeConfig = (value: unknown): AppConfig => {
  const parsed = value && typeof value === 'object' ? value as Partial<AppConfig> : {};
  const userProfile = parsed.userProfile && typeof parsed.userProfile === 'object'
    ? parsed.userProfile
    : defaultConfig.userProfile;

  return {
    ...defaultConfig,
    ...parsed,
    likedVideoIds: isStringArray(parsed.likedVideoIds) ? [...new Set(parsed.likedVideoIds)] : [],
    history: isStringArray(parsed.history) ? [...new Set(parsed.history)].slice(0, 50) : [],
    watchProgress: isNumberRecord(parsed.watchProgress)
      ? Object.fromEntries(Object.entries(parsed.watchProgress).filter(([, seconds]) => seconds >= 0))
      : {},
    ratings: isNumberRecord(parsed.ratings)
      ? Object.fromEntries(Object.entries(parsed.ratings).filter(([, rating]) => rating >= 1 && rating <= 5))
      : {},
    hiddenVideoIds: isStringArray(parsed.hiddenVideoIds) ? [...new Set(parsed.hiddenVideoIds)] : [],
    customVideoTitles: isStringRecord(parsed.customVideoTitles) ? parsed.customVideoTitles : {},
    customCategories: isStringArray(parsed.customCategories) ? [...new Set(parsed.customCategories)] : [],
    videoChannelOverrides: isStringRecord(parsed.videoChannelOverrides) ? parsed.videoChannelOverrides : {},
    userProfile: {
      name: typeof userProfile?.name === 'string' && userProfile.name.trim()
        ? userProfile.name.trim()
        : 'User',
      ...(typeof userProfile?.avatarDataUrl === 'string'
        ? { avatarDataUrl: userProfile.avatarDataUrl }
        : {})
    },
    themeColor: typeof parsed.themeColor === 'string' ? parsed.themeColor : defaultConfig.themeColor,
    customThemeColor: typeof parsed.customThemeColor === 'string'
      ? parsed.customThemeColor
      : defaultConfig.customThemeColor,
    enableGradient: typeof parsed.enableGradient === 'boolean'
      ? parsed.enableGradient
      : defaultConfig.enableGradient,
    uiDensity: parsed.uiDensity === 'compact' || parsed.uiDensity === 'spacious'
      ? parsed.uiDensity
      : 'comfortable',
    autoplay: typeof parsed.autoplay === 'boolean' ? parsed.autoplay : defaultConfig.autoplay,
    defaultSort: parsed.defaultSort === 'name' || parsed.defaultSort === 'size'
      ? parsed.defaultSort
      : 'date',
    startupFolderNames: isStringArray(parsed.startupFolderNames)
      ? [...new Set(parsed.startupFolderNames)]
      : []
  };
};

export const loadConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      const config = normalizeConfig(migratePersistedConfig(parsed).config);
      saveConfig(config);
      return config;
    }
  } catch (error) {
    console.error('Failed to load saved configuration; using defaults.', error);
  }
  return normalizeConfig(defaultConfig);
};

export const saveConfig = (config: AppConfig) => {
  const envelope: ConfigEnvelope = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    config
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(envelope));
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

export const saveVideoProgress = (videoId: string, seconds: number): AppConfig => {
  const config = loadConfig();
  if (Number.isFinite(seconds) && seconds >= 0) {
    config.watchProgress[videoId] = seconds;
    saveConfig(config);
  }
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

export const importVideoData = (data: unknown) => {
  const config = loadConfig();
  const imported = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const newConfig = normalizeConfig({
    ...config,
    customVideoTitles: imported.customVideoTitles,
    ratings: imported.ratings,
    videoChannelOverrides: imported.videoChannelOverrides,
    hiddenVideoIds: imported.hiddenVideoIds,
    likedVideoIds: imported.likedVideoIds
  });
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

export interface DirectoryScanOptions {
  signal?: AbortSignal;
  onFile?: (path: string) => void;
}

export async function getFilesRecursively(
  entry: FileSystemDirectoryHandle,
  path = '',
  options: DirectoryScanOptions = {}
): Promise<File[]> {
  const files: File[] = [];
  // @ts-ignore
  for await (const handle of entry.values()) {
    if (options.signal?.aborted) {
      throw new DOMException('Directory scan cancelled.', 'AbortError');
    }
    try {
        if (handle.kind === 'file') {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false,
          });
          options.onFile?.(path + file.name);
          if (isVideoFile(file)) {
            files.push(file);
          }
        } else if (handle.kind === 'directory') {
          const dirHandle = handle as FileSystemDirectoryHandle;
          const subFiles = await getFilesRecursively(dirHandle, path + handle.name + '/', options);
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