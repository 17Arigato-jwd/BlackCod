import React, { lazy, Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { LocalVideo, ViewState, AppConfig, Channel, ChannelConfig, UploadJob, Playlist, VideoTag, VideoIndexRecord } from './types';
import { getVideoId, isVideoFile } from './utils/videoUtils';
import { createLocalVideo, toVideoIndexRecord } from './utils/libraryUtils';
import { deriveLocalTags } from './utils/tagUtils';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoGrid } from './components/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer';
import { MiniPlayer } from './components/MiniPlayer';
import { GradientBackground } from './components/GradientBackground';
import { LoadingAnimation } from './components/LoadingAnimation';
import { 
  FolderOpen, Loader2, RefreshCw, FileVideo, AlertCircle, X, 
  Upload as UploadIcon, ArrowRight, ChevronDown, Check, FileJson, Info, HardDrive 
} from 'lucide-react';
import { 
  loadConfig, 
  saveConfig, 
  toggleLike, 
  addToHistory, 
  saveCustomThumbnail, 
  getDirectoryHandle,
  verifyPermission,
  getFilesRecursively,
  loadChannels,
  saveChannel,
  rateVideo,
  hideVideo,
  renameVideo,
  addCustomCategory,
  moveVideosToChannel,
  removeVideoChannelOverrides,
  deleteChannelConfig,
  saveChannelHandle,
  loadChannelHandles,
  defaultConfig,
  importVideoData,
  importChannelData,
  saveVideoProgress,
  loadPlaylists,
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  saveLibraryIndex,
  saveVideoTags,
  loadVideoTags,
  loadLibraryIndex,
  reconcileLibraryIndex
} from './utils/storageUtils';

const ChannelView = lazy(() => import('./components/ChannelView').then(module => ({ default: module.ChannelView })));
const FoldersView = lazy(() => import('./components/FoldersView').then(module => ({ default: module.FoldersView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(module => ({ default: module.SettingsView })));
const PlaylistsView = lazy(() => import('./components/PlaylistsView').then(module => ({ default: module.PlaylistsView })));

// Theme Palettes
const THEMES: Record<string, { black: string; dark: string; red: string }> = {
  default: { black: '#0f0f0f', dark: '#272727', red: '#ff0000' },
  orange:  { black: '#180a00', dark: '#2e1600', red: '#f97316' },
  blue:    { black: '#000a18', dark: '#00162e', red: '#3b82f6' },
  green:   { black: '#001805', dark: '#002e0d', red: '#22c55e' },
  purple:  { black: '#120018', dark: '#24002e', red: '#a855f7' },
  pink:    { black: '#18000f', dark: '#2e001d', red: '#ec4899' },
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const mixWithBlack = (hex: string, percent: number) => {
  const { r, g, b } = hexToRgb(hex);
  const mixedR = Math.round(r * percent);
  const mixedG = Math.round(g * percent);
  const mixedB = Math.round(b * percent);
  return `rgb(${mixedR}, ${mixedG}, ${mixedB})`;
};

const generateCustomPalette = (hex: string) => {
  return {
    red: hex,
    dark: mixWithBlack(hex, 0.25),
    black: mixWithBlack(hex, 0.08)
  };
};

const App: React.FC = () => {
  const [videos, setVideos] = useState<LocalVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<LocalVideo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const playbackTimeRef = useRef(0);
  const playbackSaveTimeoutRef = useRef<number | null>(null);
  
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Pending Upload State (For Confirmation)
  const [pendingUpload, setPendingUpload] = useState<{
    files: File[];
    sourceName: string;
    videoCount: number;
    systemFiles: { name: string, type: 'config' | 'video' | 'channel', file: File }[];
    candidateStartupFolderName?: string;
    directoryHandle?: FileSystemDirectoryHandle;
  } | null>(null);

  const [addToStartup, setAddToStartup] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewState, setViewState] = useState<ViewState>('home');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(loadConfig());
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelConfig>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists());
  const [videoTags, setVideoTags] = useState<Record<string, VideoTag[]>>({});
  const libraryIndexRef = useRef<Record<string, VideoIndexRecord>>({});
  const [needsPermission, setNeedsPermission] = useState(false);
  const [skippedIntro, setSkippedIntro] = useState(false);
  
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryLoadStatus, setLibraryLoadStatus] = useState('');
  const [permissionRequiredHandles, setPermissionRequiredHandles] = useState<FileSystemDirectoryHandle[]>([]);
  const [hidePermissionBanner, setHidePermissionBanner] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(THEMES['default']);

  const legacyInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videosRef = useRef<LocalVideo[]>([]);
  const channelConfigsRef = useRef<Record<string, ChannelConfig>>({});

  const isUploadLimitReached = uploadQueue.length >= 3;
  const hasVideos = videos.length > 0;
  const enableGradient = config.enableGradient;

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    channelConfigsRef.current = channelConfigs;
  }, [channelConfigs]);

  useEffect(() => {
    return () => {
      if (playbackSaveTimeoutRef.current !== null) {
        window.clearTimeout(playbackSaveTimeoutRef.current);
      }
      videosRef.current.forEach(video => {
        URL.revokeObjectURL(video.url);
        if (video.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(video.thumbnailUrl);
      });
      Object.keys(channelConfigsRef.current).forEach(key => {
        const channel = channelConfigsRef.current[key];
        if (channel.iconUrl?.startsWith('blob:')) URL.revokeObjectURL(channel.iconUrl);
      });
    };
  }, []);

  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  useEffect(() => {
    let theme;
    if (config.themeColor === 'custom' && config.customThemeColor) {
      theme = generateCustomPalette(config.customThemeColor);
    } else {
      theme = THEMES[config.themeColor || 'default'] || THEMES['default'];
    }
    setCurrentTheme(theme);
    const root = document.documentElement;
    root.style.setProperty('--yt-black', theme.black);
    root.style.setProperty('--yt-dark', theme.dark);
    root.style.setProperty('--yt-red', theme.red);
    root.style.setProperty('--yt-brand', theme.red);
    document.body.style.backgroundColor = theme.black;
  }, [config.themeColor, config.customThemeColor, config.enableGradient]);

  useEffect(() => {
    const init = async () => {
      try {
        setVideoTags(await loadVideoTags());
        libraryIndexRef.current = await loadLibraryIndex();
        const loadedChannels = await loadChannels();
        const processed: Record<string, ChannelConfig> = {};
        for (const [key, val] of Object.entries(loadedChannels)) {
          processed[key] = {
            ...val,
            iconUrl: val.iconBlob ? URL.createObjectURL(val.iconBlob) : undefined
          }
        }
        setChannelConfigs(processed);

        const loadedConfig = loadConfig();
        let configChanged = false;
        const savedHandlesMap = await loadChannelHandles();
        
        // --- Sync Config Folders with IDB Handles ---
        let folderNames = loadedConfig.startupFolderNames || [];

        // Legacy: If config empty but handles exist, populate config
        if (folderNames.length === 0 && Object.keys(savedHandlesMap).length > 0) {
           folderNames = Object.keys(savedHandlesMap);
           loadedConfig.startupFolderNames = folderNames;
           saveConfig(loadedConfig);
           configChanged = true;
        }

        const handlesToLoad: FileSystemDirectoryHandle[] = [];
        const missingFolders: string[] = [];

        // Check for missing folders
        folderNames.forEach(name => {
           if (savedHandlesMap[name]) {
             handlesToLoad.push(savedHandlesMap[name]);
           } else {
             missingFolders.push(name);
           }
        });

        if (missingFolders.length > 0) {
           addNotification(`Missing startup folders: ${missingFolders.join(', ')}. They may have been removed.`);
        }

        // Check for legacy single handle (pre-multi folder support)
        const singleHandle = await getDirectoryHandle(); 
        if (singleHandle) {
           const alreadyIncluded = handlesToLoad.some(h => h.name === singleHandle.name);
           if (!alreadyIncluded) {
              handlesToLoad.push(singleHandle);
              // Auto-add to config if not present
              if (!folderNames.includes(singleHandle.name)) {
                 loadedConfig.startupFolderNames = [...folderNames, singleHandle.name];
                 saveConfig(loadedConfig);
                 configChanged = true;
              }
           }
        }

        if (configChanged) {
            setConfig(prev => ({ ...prev, ...loadedConfig }));
        }

        const allHandles = handlesToLoad;
        const hasDataChanged = 
            loadedConfig.history.length > 0 ||
            loadedConfig.likedVideoIds.length > 0 ||
            Object.keys(loadedConfig.ratings).length > 0 ||
            Object.keys(loadedChannels).length > 0;

        if (allHandles.length > 0 || hasDataChanged) {
          setNeedsPermission(true);
          setPermissionRequiredHandles(allHandles);
          setIsLibraryLoading(true);

          const usableHandles: { handle: FileSystemDirectoryHandle, name: string }[] = [];
          const needsPerm: FileSystemDirectoryHandle[] = [];

          for (const handle of allHandles) {
            // @ts-ignore
            const permState = await handle.queryPermission({ mode: 'read' });
            if (permState === 'granted') usableHandles.push({ handle, name: handle.name });
            else needsPerm.push(handle);
          }

          setPermissionRequiredHandles(needsPerm);
          if (needsPerm.length === 0 && !hasDataChanged) {
            setNeedsPermission(false);
            setSkippedIntro(true);
          }

          if (usableHandles.length > 0) {
             setIsRestoring(true);
             await Promise.all(usableHandles.map(async ({ handle, name }) => {
                try {
                  const files = await getFilesRecursively(handle);
                  await processFiles(files, name, true, name); 
                } catch (e) {
                  console.error(e);
                  addNotification(`Failed to load folder: ${name}`);
                }
             }));
             setIsRestoring(false);
          }
        }
      } catch (err) {
        console.error('Failed to initialize library.', err);
        addNotification('Failed to restore the saved library.');
      } finally {
        setIsLibraryLoading(false);
      }
    };
    init();
  }, []);

  const handleResumeLoading = async () => {
     setHidePermissionBanner(true);
     setIsLibraryLoading(true);
     const remainingPerms: FileSystemDirectoryHandle[] = [];
     for (const handle of permissionRequiredHandles) {
       if (await verifyPermission(handle)) {
          const files = await getFilesRecursively(handle);
          await processFiles(files, handle.name, true, handle.name);
       } else remainingPerms.push(handle);
     }
     setPermissionRequiredHandles(remainingPerms);
     setIsLibraryLoading(false);
  };

  const handleRestoreLibrary = async () => {
    setIsRestoring(true);
    const remainingPerms: FileSystemDirectoryHandle[] = [];
    for (const handle of permissionRequiredHandles) {
      if (await verifyPermission(handle)) {
         const files = await getFilesRecursively(handle);
         await processFiles(files, handle.name, true, handle.name);
      } else remainingPerms.push(handle);
    }
    setPermissionRequiredHandles(remainingPerms);
    setNeedsPermission(remainingPerms.length > 0);
    if (remainingPerms.length === 0 || videos.length > 0) setSkippedIntro(true);
    setIsRestoring(false);
  };

  const prepareUpload = async (
    allFiles: File[], 
    sourceName: string, 
    candidateStartupFolderName?: string,
    directoryHandle?: FileSystemDirectoryHandle
  ) => {
    if (isUploadLimitReached) {
      alert("Wait for current uploads to finish.");
      return;
    }

    const videoFiles: File[] = [];
    const systemFiles: { name: string, type: 'config' | 'video' | 'channel', file: File }[] = [];

    for (const file of allFiles) {
      if (isVideoFile(file)) {
        videoFiles.push(file);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        // Smart detection of JSON files
        if (file.name.includes('.config')) {
            systemFiles.push({ name: file.name, type: 'config', file });
        } else if (file.name.includes('.video')) {
            systemFiles.push({ name: file.name, type: 'video', file });
        } else if (file.name.includes('.channel')) {
            systemFiles.push({ name: file.name, type: 'channel', file });
        } else {
            // Peek at content to infer type if filename is generic
            try {
               const text = await file.text();
               const json = JSON.parse(text);
               if (json.userProfile || json.themeColor) {
                   systemFiles.push({ name: file.name, type: 'config', file });
               } else if (json.customVideoTitles || json.ratings) {
                   systemFiles.push({ name: file.name, type: 'video', file });
               } else if (Object.values(json).some((v: any) => v && typeof v === 'object' && v.category)) {
                   systemFiles.push({ name: file.name, type: 'channel', file });
               }
            } catch (e) {
               console.warn("Skipping invalid JSON file:", file.name);
            }
        }
      }
    }

    if (videoFiles.length === 0 && systemFiles.length === 0) {
      addNotification("No supported files found.");
      return;
    }

    setPendingUpload({
      files: videoFiles,
      sourceName,
      videoCount: videoFiles.length,
      systemFiles,
      candidateStartupFolderName,
      directoryHandle
    });
    // Default to true if a startup folder name is provided AND we have a persistent handle
    setAddToStartup(!!candidateStartupFolderName && !!directoryHandle);
  };

  const confirmUpload = async () => {
    if (!pendingUpload) return;
    const { files, systemFiles, sourceName, candidateStartupFolderName, directoryHandle } = pendingUpload;
    setPendingUpload(null);

    let configProcessed = false;
    let channelProcessed = false;

    // Process System Files first
    for (const sys of systemFiles) {
      await processSystemFile(sys.file, sys.type);
      if (sys.type === 'config') configProcessed = true;
      if (sys.type === 'channel') channelProcessed = true;
    }

    // If we restored a config or channel metadata, reload to ensure fresh state across the whole UI
    if (configProcessed || channelProcessed) {
      window.location.reload();
      return;
    }

    // Handle Startup Folder Addition
    // Only add if explicit check AND we have a valid directory handle
    if (candidateStartupFolderName && addToStartup && directoryHandle) {
       // 1. Save handle to IndexedDB for persistent access
       await saveChannelHandle(candidateStartupFolderName, directoryHandle);
       // 2. Initialize channel metadata
       await handleUpdateChannel(candidateStartupFolderName, { id: candidateStartupFolderName, displayName: candidateStartupFolderName, category: 'Uncategorized', isSubscribed: true });
       
       // 3. Update Configuration list
       setConfig(prev => {
          const newFolders = Array.from(new Set([...(prev.startupFolderNames || []), candidateStartupFolderName]));
          const updatedCfg = { ...prev, startupFolderNames: newFolders };
          saveConfig(updatedCfg);
          return updatedCfg;
      });
      addNotification(`Added "${candidateStartupFolderName}" to startup folders.`);
    }

    if (files.length > 0) {
      await processFiles(files, sourceName, false);
    }
  };

  const processSystemFile = (file: File, type: 'config' | 'video' | 'channel') => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (type === 'config') {
            saveConfig(data);
            addNotification("Saved configuration.");
          } else if (type === 'video') {
            const updated = importVideoData(data);
            setConfig(updated);
            addNotification("Applied video metadata.");
          } else if (type === 'channel') {
            await importChannelData(data);
            addNotification("Saved channel metadata.");
          }
        } catch (err) { console.error("Sys file fail", err); }
        resolve();
      };
      reader.readAsText(file);
    });
  };

  const processFiles = async (videoFiles: File[], sourceName: string = "Upload", silent = false, forceChannelName?: string) => {
    const jobId = crypto.randomUUID();
    const newJob: UploadJob = { id: jobId, name: sourceName, current: 0, total: videoFiles.length };
    setUploadQueue(prev => [...prev, newJob]);

    const processedVideos: LocalVideo[] = [];
    const CHUNK_SIZE = 5;
    let lastProgressUpdate = 0;
    
    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      const id = `${sourceName}/${file.webkitRelativePath || file.name}-${file.size}-${file.lastModified}`;
      const video = await createLocalVideo(file, config, sourceName, forceChannelName, libraryIndexRef.current[id]);
      if (video) processedVideos.push(video);

      if (i === videoFiles.length - 1 || i - lastProgressUpdate >= 10) {
        lastProgressUpdate = i;
        setUploadQueue(prev => prev.map(job => job.id === jobId ? { ...job, current: i + 1 } : job));
      }
      if (i % CHUNK_SIZE === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    setVideos(prev => {
       const newIds = new Set(processedVideos.map(v => v.id));
       prev.forEach(video => {
         if (newIds.has(video.id)) {
           URL.revokeObjectURL(video.url);
           if (video.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(video.thumbnailUrl);
         }
       });
       return [...prev.filter(v => !newIds.has(v.id)), ...processedVideos];
    });
    const indexRecords = processedVideos.map(video => toVideoIndexRecord(video, sourceName));
    await saveLibraryIndex(indexRecords);
    await reconcileLibraryIndex(sourceName, videoFiles.map(file => getVideoId(file, sourceName)));
    indexRecords.forEach(record => {
      libraryIndexRef.current[record.id] = record;
    });
    const generatedTags = processedVideos.flatMap(deriveLocalTags);
    await saveVideoTags(generatedTags);
    setVideoTags(previous => {
      const next = { ...previous };
      generatedTags.forEach(tag => {
        next[tag.videoId] = [
          ...(next[tag.videoId] || []).filter(item => item.tag !== tag.tag || item.source !== tag.source),
          tag
        ];
      });
      return next;
    });
    setUploadQueue(prev => prev.filter(job => job.id !== jobId));
  };

  const handleDirectoryPick = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker();
        // Do NOT save handle yet. Wait for confirmation.
        
        const files = await getFilesRecursively(handle);
        // Pass handle to prepareUpload so it can be saved on confirm
        await prepareUpload(files, handle.name, handle.name, handle);
      } catch (err) { 
        console.error(err); 
      }
    } else {
      legacyInputRef.current?.click();
    }
  };

  const handleUploadInput = (e: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let folderName = undefined;
    if (isFolder && files[0].webkitRelativePath) {
        const parts = files[0].webkitRelativePath.split('/');
        if (parts.length > 0) folderName = parts[0];
    }

    prepareUpload(Array.from(files), isFolder ? "Folder Upload" : "File Upload", folderName);
    // Clear input to allow re-selection of the same file/folder
    e.target.value = '';
  };

  const handleNavigate = (view: ViewState) => {
    setViewState(view);
    if (selectedVideo && !isMiniPlayer) setIsMiniPlayer(true);
    else if (!selectedVideo) setSelectedChannel(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleVideoSelect = (video: LocalVideo) => {
    setSelectedVideo(video);
    setIsMiniPlayer(false);
    setConfig(addToHistory(video.id));
    playbackTimeRef.current = config.watchProgress[video.id] || 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaybackTimeUpdate = (time: number) => {
    playbackTimeRef.current = time;
    if (!selectedVideo) return;
    if (playbackSaveTimeoutRef.current !== null) {
      window.clearTimeout(playbackSaveTimeoutRef.current);
    }
    playbackSaveTimeoutRef.current = window.setTimeout(() => {
      setConfig(saveVideoProgress(selectedVideo.id, time));
      playbackSaveTimeoutRef.current = null;
    }, 1000);
  };

  const handleAddToPlaylist = (videoId: string, playlistId: string) => {
    setPlaylists(addVideoToPlaylist(playlistId, videoId));
    addNotification('Added video to playlist.');
  };

  const handleCreatePlaylist = (name: string, videoId: string) => {
    const playlist = createPlaylist(name);
    setPlaylists(addVideoToPlaylist(playlist.id, videoId));
    addNotification(`Created playlist "${playlist.name}".`);
  };

  const handleCreatePlaylistFromView = () => {
    const name = window.prompt('New playlist name');
    if (name?.trim()) {
      setPlaylists(previous => [...previous, createPlaylist(name)]);
    }
  };

  const handleUpdateChannel = async (id: string, updates: Partial<ChannelConfig>) => {
    const newMap = await saveChannel(id, updates);
    const processed: Record<string, ChannelConfig> = {};
    for (const [key, val] of Object.entries(newMap)) {
      processed[key] = { ...val, iconUrl: val.iconBlob ? URL.createObjectURL(val.iconBlob) : undefined };
    }
    setChannelConfigs(processed);
  };

  const displayedVideos = useMemo(() => {
    let filtered = [...videos];
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query)
        || video.file.name.toLowerCase().includes(query)
        || video.channelName.toLowerCase().includes(query)
        || (videoTags[video.id] || []).some(tag => tag.tag.includes(query))
      );
    }
    const sortMode = config.defaultSort || 'date';
    filtered.sort((a, b) => {
       if (sortMode === 'name') return a.title.localeCompare(b.title);
       if (sortMode === 'size') return b.size - a.size;
       return b.lastModified - a.lastModified;
    });

    switch (viewState) {
      case 'history': {
        const videosById = new Map(videos.map(video => [video.id, video]));
        return config.history
          .map(id => videosById.get(id))
          .filter((v): v is LocalVideo => !!v);
      }
      case 'liked': return filtered.filter(v => config.likedVideoIds.includes(v.id));
      case 'channel': return filtered.filter(v => v.channelName === selectedChannel);
      default: return filtered;
    }
  }, [videos, videoTags, searchTerm, config.defaultSort, viewState, selectedChannel, config.history, config.likedVideoIds]);

  const visibleVideos = useMemo(
    () => displayedVideos.slice(0, visibleCount),
    [displayedVideos, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, config.defaultSort, viewState, selectedChannel]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount(count => count + 20);
      setIsLoadingMore(false);
    }, 0);
  };

  const channels = useMemo<Channel[]>(() => {
    const counts = new Map<string, number>();
    videos.forEach(video => counts.set(video.channelName, (counts.get(video.channelName) || 0) + 1));
    return [...counts.entries()].map(([name, videoCount]) => ({ name, videoCount }));
  }, [videos]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    
    // Improved Multi-Folder/File Handling
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items) as any[];
      
      // Separate handles and files immediately
      const handlePromises = items.map(item => {
        if (item.kind === 'file' && item.getAsFileSystemHandle) {
             return item.getAsFileSystemHandle();
        }
        return null;
      });

      // Synchronously grab files before they expire
      const rawFiles: File[] = [];
      for (const item of items) {
          if (item.kind === 'file') {
              const f = item.getAsFile();
              if (f) rawFiles.push(f);
          }
      }

      // Resolve handles
      const handles = (await Promise.all(handlePromises)).filter(h => h !== null) as FileSystemHandle[];
      const directoryHandles = handles.filter(h => h.kind === 'directory') as FileSystemDirectoryHandle[];
      
      // Process Directory Handles (Persistent)
      if (directoryHandles.length > 0) {
            for (const handle of directoryHandles) {
                // Do NOT save handle yet. Wait for confirmation.
                // We'll process only the first dropped folder for startup-capability in the modal, 
                // but process all files for immediate playback.
                // Note: The modal UI currently only supports a single "sourceName" and "candidateStartupFolder".
                // If dropping multiple, we iterate.
                
                const folderFiles = await getFilesRecursively(handle);
                await prepareUpload(folderFiles, handle.name, handle.name, handle);
            }
      }
      
      // Process loose files if no directory handles found, OR if there were files dropped that weren't directories
      if (directoryHandles.length === 0 && rawFiles.length > 0) {
            prepareUpload(rawFiles, "Drag & Drop");
      }
    }
  };

  if (!hasVideos && uploadQueue.length === 0 && !skippedIntro && !pendingUpload) {
    return (
      <div className="min-h-screen bg-yt-black text-white flex flex-col items-center justify-center p-4" onDragOver={handleDragOver} onDrop={handleDrop}>
        <GradientBackground colors={currentTheme} visible={config.enableGradient} />
        <div className="relative z-10 max-w-md w-full text-center space-y-8 pointer-events-none">
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-2xl shadow-lg shadow-red-900/20 ${enableGradient ? 'bg-gradient-to-br from-[var(--yt-brand)] to-black' : 'bg-[var(--yt-brand)]'}`}>
              <FolderOpen className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">BlackCod</h1>
          <p className="text-sm font-medium text-yt-gray uppercase tracking-widest mb-4">By VCHS Studios</p>
          <p className="text-gray-400 text-lg">{needsPermission ? "Welcome back! Please verify access." : "Experience your local video collection."}</p>
          <div className="pt-8 flex flex-col items-center gap-3 w-full max-w-xs mx-auto pointer-events-auto">
            {needsPermission ? (
              <button onClick={handleRestoreLibrary} className={`flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg w-full bg-blue-600 hover:bg-blue-700 text-white`}>
                <RefreshCw className="w-6 h-6" /> Restore Library
              </button>
            ) : (
              <>
                 <button onClick={handleDirectoryPick} className="px-6 py-4 rounded-full font-bold text-lg transition-all shadow-lg w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200">
                  <FolderOpen className="w-6 h-6" /> Select Folder
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className={`px-6 py-4 rounded-full font-bold text-lg transition-all shadow-lg w-full flex items-center justify-center gap-2 bg-yt-dark border border-gray-600 text-white hover:bg-gray-700`}>
                  <FileVideo className="w-6 h-6" /> Select Videos
                 </button>
                 <p className="text-xs text-gray-500 mt-2">Drag & Drop folders to add multiple</p>
              </>
            )}
            <button onClick={() => setSkippedIntro(true)} className="text-xs text-gray-500 hover:text-white mt-4 underline pointer-events-auto">Skip setup</button>
          </div>
        </div>
        <input type="file" ref={legacyInputRef} onChange={(e) => handleUploadInput(e, true)} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple />
        <input type="file" ref={fileInputRef} onChange={(e) => handleUploadInput(e, false)} className="hidden" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.mp4,.m4v,.3gp,.ts,.webm,.ogv,.json" multiple />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col relative transition-colors duration-700" onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={() => setIsDragging(false)}>
      <GradientBackground colors={currentTheme} visible={config.enableGradient} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} searchTerm={searchTerm} onSearchChange={setSearchTerm} resetHome={() => handleNavigate('home')} onUpload={handleUploadInput} onPickFolder={handleDirectoryPick} isUploadLimitReached={isUploadLimitReached} userProfile={config.userProfile} enableGradient={enableGradient} />
        <div className="flex flex-1 pt-14 relative">
          <Sidebar isOpen={isSidebarOpen && !selectedVideo} currentView={viewState} onNavigate={handleNavigate} uploadQueue={uploadQueue} enableGradient={enableGradient} density={config.uiDensity} />
          <main className={`flex-1 transition-all duration-200 h-[calc(100vh-56px)] overflow-y-auto ${(isSidebarOpen && !selectedVideo) ? 'sm:ml-60' : 'sm:ml-[72px]'}`}>
            {selectedVideo && !isMiniPlayer ? (
              <VideoPlayer video={selectedVideo} channelConfig={channelConfigs[selectedVideo.channelName]} suggestedVideos={videos} playlists={playlists} videoTags={videoTags[selectedVideo.id] || []} onVideoSelect={handleVideoSelect} onAddToPlaylist={(playlistId) => handleAddToPlaylist(selectedVideo.id, playlistId)} onCreatePlaylist={(name) => handleCreatePlaylist(name, selectedVideo.id)} isLiked={config.likedVideoIds.includes(selectedVideo.id)} rating={config.ratings[selectedVideo.id] || 0} onToggleLike={(id) => setConfig(toggleLike(id, !config.likedVideoIds.includes(id)))} onRate={(id, r) => setConfig(rateVideo(id, r))} onUpdateThumbnail={(id, url) => { saveCustomThumbnail(id, url); setVideos(prev => prev.map(v => v.id === id ? { ...v, thumbnailUrl: url } : v)); }} onUpdateVideo={(id, u) => setVideos(prev => prev.map(v => v.id === id ? { ...v, ...u } : v))} onChannelClick={(n) => { setSelectedChannel(n); setViewState('channel'); }} onRemoveVideo={(id) => { setConfig(hideVideo(id)); setVideos(v => v.filter(x => x.id !== id)); if (selectedVideo?.id === id) setSelectedVideo(null); }} onRenameVideo={(id, t) => { setConfig(renameVideo(id, t)); setVideos(v => v.map(x => x.id === id ? { ...x, title: t } : x)); }} onToggleMiniPlayer={() => setIsMiniPlayer(true)} enableGradient={enableGradient} autoplay={config.autoplay} startTime={playbackTimeRef.current} onTimeUpdate={handlePlaybackTimeUpdate} />
            ) : (
              <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading view...</div>}>
              <div>
                {viewState === 'settings' ? <SettingsView config={config} onUpdateConfig={setConfig} /> :
                viewState === 'playlists' ? <PlaylistsView playlists={playlists} videos={videos} onCreatePlaylist={handleCreatePlaylistFromView} onDeletePlaylist={(id) => setPlaylists(deletePlaylist(id))} onVideoSelect={handleVideoSelect} /> :
                 viewState === 'channel' && selectedChannel ? <ChannelView channelName={selectedChannel} config={channelConfigs[selectedChannel] || { id: selectedChannel, category: 'Uncategorized', isSubscribed: false }} videos={videos.filter(v => v.channelName === selectedChannel)} allVideos={videos} onUpdateChannel={handleUpdateChannel} onEditCustomFolder={(id, n, c, i, v) => { handleUpdateChannel(id, { displayName: n, category: c, iconBlob: i || undefined }); setConfig(moveVideosToChannel(v, id)); }} onVideoSelect={handleVideoSelect} customCategories={config.customCategories} onAddCategory={c => setConfig(addCustomCategory(c))} enableGradient={enableGradient} density={config.uiDensity} /> :
                 viewState === 'folders' ? <FoldersView channels={channels} channelConfigs={channelConfigs} allVideos={videos} customCategories={config.customCategories} searchTerm={searchTerm} onToggleSubscribe={n => handleUpdateChannel(n, { isSubscribed: !channelConfigs[n]?.isSubscribed })} onNavigateChannel={n => { setSelectedChannel(n); setViewState('channel'); }} onUpdateChannelName={(id, n) => handleUpdateChannel(id, { displayName: n })} onRemoveChannel={n => { setConfig(moveVideosToChannel(videos.filter(v => v.channelName === n).map(v => v.id), 'Uncategorized')); setVideos(v => v.map(x => x.channelName === n ? { ...x, channelName: 'Uncategorized' } : x)); deleteChannelConfig(n); }} onAddFolder={handleDirectoryPick} onCreateCustomFolder={(n, c, i, v) => { handleUpdateChannel(n, { displayName: n.split('/').pop(), category: c, iconBlob: i || undefined, isSubscribed: true }); setConfig(moveVideosToChannel(v, n)); }} onEditCustomFolder={(id, n, c, i, v) => { handleUpdateChannel(id, { displayName: n, category: c, iconBlob: i || undefined }); setConfig(moveVideosToChannel(v, id)); }} isUploadLimitReached={isUploadLimitReached} enableGradient={enableGradient} density={config.uiDensity} onVideoSelect={handleVideoSelect} /> :
                 <>
                   <VideoGrid videos={visibleVideos} onVideoSelect={handleVideoSelect} density={config.uiDensity} />
                   {visibleCount < displayedVideos.length && (
                     <div className="flex justify-center pb-20">
                       <button
                         type="button"
                         onClick={handleLoadMore}
                         disabled={isLoadingMore}
                         className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                       >
                         {isLoadingMore ? 'Loading...' : `Load more (${displayedVideos.length - visibleCount} remaining)`}
                       </button>
                     </div>
                   )}
                 </>
                 }
              </div>
              </Suspense>
            )}
          </main>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-[#181818] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <div className="p-6 text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center border border-blue-500/30">
                    <UploadIcon className="w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-bold text-white">Confirm Upload</h2>
                 <p className="text-gray-400 text-sm">We found the following items in your selection from <b>{pendingUpload.sourceName}</b>:</p>
                 
                 <div className="bg-black/40 rounded-xl p-4 text-left space-y-2 border border-white/5">
                    {pendingUpload.videoCount > 0 && (
                       <div className="flex items-center gap-2 text-sm text-white">
                          <FileVideo className="w-4 h-4 text-red-500" />
                          <span>{pendingUpload.videoCount} Video Files</span>
                       </div>
                    )}
                    {pendingUpload.systemFiles.map(sys => (
                       <div key={sys.name} className="flex items-center gap-2 text-sm text-white">
                          <FileJson className="w-4 h-4 text-blue-400" />
                          <span className="truncate">System Data: {sys.name}</span>
                       </div>
                    ))}
                 </div>

                 {/* Checkbox moved here, right below the summary box */}
                 {pendingUpload.candidateStartupFolderName && pendingUpload.directoryHandle && (
                    <div 
                      className="mt-2 p-4 rounded-xl border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-4 group text-left" 
                      onClick={() => setAddToStartup(!addToStartup)}
                    >
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all shrink-0 ${addToStartup ? 'bg-blue-600 border-blue-600' : 'border-gray-500'}`}>
                            {addToStartup && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white leading-tight">Add "{pendingUpload.candidateStartupFolderName}" to startup?</h4>
                            <p className="text-xs text-gray-400 mt-1">BlackCod will load this folder automatically when you open the app.</p>
                        </div>
                    </div>
                 )}
                 
                 {pendingUpload.systemFiles.some(s => s.type === 'config') && (
                    <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg text-left">
                       <Info className="w-4 h-4 shrink-0" />
                       <p>Restoring a configuration file will automatically reload the application to apply your old profile, theme, and managed folders.</p>
                    </div>
                 )}
              </div>
              <div className="flex border-t border-white/5">
                 <button onClick={() => setPendingUpload(null)} className="flex-1 py-4 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors">Cancel</button>
                 <div className="w-px bg-white/5"></div>
                 <button onClick={confirmUpload} className="flex-1 py-4 font-bold text-blue-400 hover:bg-blue-400/10 transition-colors">Start Upload</button>
              </div>
           </div>
        </div>
      )}

      {selectedVideo && isMiniPlayer && <MiniPlayer video={selectedVideo} currentTime={playbackTimeRef.current} onClose={() => { setSelectedVideo(null); setIsMiniPlayer(false); }} onExpand={() => setIsMiniPlayer(false)} onTimeUpdate={handlePlaybackTimeUpdate} enableGradient={enableGradient} />}
      <div className="fixed bottom-20 right-8 z-50 flex flex-col gap-2">
        {notifications.map(n => (
          <div key={n.id} className="text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 bg-red-900/90 animate-in slide-in-from-right">
            <AlertCircle className="w-5 h-5" /> <span className="text-sm">{n.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="ml-2 hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      
      {/* Hidden Inputs for Upload Functionality in Main View */}
      <input type="file" ref={legacyInputRef} onChange={(e) => handleUploadInput(e, true)} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple />
      <input type="file" ref={fileInputRef} onChange={(e) => handleUploadInput(e, false)} className="hidden" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.mp4,.m4v,.3gp,.ts,.webm,.ogv,.json" multiple />
    </div>
  );
};

export default App;