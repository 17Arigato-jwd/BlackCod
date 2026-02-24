import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LocalVideo, ViewState, AppConfig, Channel, ChannelConfig, UploadJob } from './types';
import { extractMetadata, isVideoFile } from './utils/videoUtils';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoGrid } from './components/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer';
import { MiniPlayer } from './components/MiniPlayer';
import { ChannelView } from './components/ChannelView';
import { FoldersView } from './components/FoldersView';
import { SettingsView } from './components/SettingsView';
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
  getCustomThumbnail,
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
  importChannelData
} from './utils/storageUtils';

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

  const isUploadLimitReached = uploadQueue.length >= 3;
  const hasVideos = videos.length > 0;
  const enableGradient = config.enableGradient;

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
             Promise.all(usableHandles.map(async ({ handle, name }) => {
                try {
                  const files = await getFilesRecursively(handle);
                  await processFiles(files, name, true, name); 
                } catch (e) {
                  console.error(e);
                  addNotification(`Failed to load folder: ${name}`);
                }
             })).finally(() => setIsRestoring(false));
          }
        }
      } catch (err) { console.error(err); } finally { setIsLibraryLoading(false); }
    };
    init();
  }, []);

  const handleResumeLoading = async () => {
     setHidePermissionBanner(true);
     setIsLibraryLoading(true);
     const remainingPerms: FileSystemDirectoryHandle[] = [];
     for (const handle of permissionRequiredHandles) {
       if (await verifyPermission(handle)) {
          getFilesRecursively(handle).then(files => processFiles(files, handle.name, true, handle.name));
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
         getFilesRecursively(handle).then(files => processFiles(files, handle.name, true, handle.name));
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
    const jobId = Date.now().toString() + Math.random().toString();
    const newJob: UploadJob = { id: jobId, name: sourceName, current: 0, total: videoFiles.length };
    setUploadQueue(prev => [...prev, newJob]);

    const processedVideos: LocalVideo[] = [];
    const CHUNK_SIZE = 5;
    
    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (!config.hiddenVideoIds.includes(id)) {
        let channelName = config.videoChannelOverrides?.[id] || forceChannelName || 'Uncategorized';
        if (channelName === 'Uncategorized' && file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 1) channelName = parts.slice(0, -1).join('/');
        }
        
        const customThumb = await getCustomThumbnail(id);
        const metadata = await extractMetadata(file);
        if (customThumb) metadata.thumbnailUrl = customThumb;

        processedVideos.push({
          id, file, title: config.customVideoTitles[id] || file.name.replace(/\.[^/.]+$/, ""),
          channelName, url: URL.createObjectURL(file), thumbnailUrl: metadata.thumbnailUrl,
          duration: metadata.duration, size: file.size, lastModified: file.lastModified
        });
      }

      setUploadQueue(prev => prev.map(job => job.id === jobId ? { ...job, current: i + 1 } : job));
      if (i % CHUNK_SIZE === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    setVideos(prev => {
       const newIds = new Set(processedVideos.map(v => v.id));
       return [...prev.filter(v => !newIds.has(v.id)), ...processedVideos];
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
    playbackTimeRef.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (searchTerm) filtered = filtered.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const sortMode = config.defaultSort || 'date';
    filtered.sort((a, b) => {
       if (sortMode === 'name') return a.title.localeCompare(b.title);
       if (sortMode === 'size') return b.size - a.size;
       return b.lastModified - a.lastModified;
    });

    switch (viewState) {
      case 'history': return config.history.map(id => videos.find(v => v.id === id)).filter((v): v is LocalVideo => !!v);
      case 'liked': return filtered.filter(v => config.likedVideoIds.includes(v.id));
      case 'channel': return filtered.filter(v => v.channelName === selectedChannel);
      default: return filtered;
    }
  }, [videos, searchTerm, config.defaultSort, viewState, selectedChannel, config.history, config.likedVideoIds]);

  const channels: Channel[] = Array.from(new Set(videos.map(v => v.channelName))).map((name: string) => ({
    name, videoCount: videos.filter(v => v.channelName === name).length
  }));

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
              <VideoPlayer video={selectedVideo} channelConfig={channelConfigs[selectedVideo.channelName]} suggestedVideos={videos} onVideoSelect={handleVideoSelect} isLiked={config.likedVideoIds.includes(selectedVideo.id)} rating={config.ratings[selectedVideo.id] || 0} onToggleLike={(id) => setConfig(toggleLike(id, !config.likedVideoIds.includes(id)))} onRate={(id, r) => setConfig(rateVideo(id, r))} onUpdateThumbnail={(id, url) => { saveCustomThumbnail(id, url); setVideos(prev => prev.map(v => v.id === id ? { ...v, thumbnailUrl: url } : v)); }} onUpdateVideo={(id, u) => setVideos(prev => prev.map(v => v.id === id ? { ...v, ...u } : v))} onChannelClick={(n) => { setSelectedChannel(n); setViewState('channel'); }} onRemoveVideo={(id) => { setConfig(hideVideo(id)); setVideos(v => v.filter(x => x.id !== id)); if (selectedVideo?.id === id) setSelectedVideo(null); }} onRenameVideo={(id, t) => { setConfig(renameVideo(id, t)); setVideos(v => v.map(x => x.id === id ? { ...x, title: t } : x)); }} onToggleMiniPlayer={() => setIsMiniPlayer(true)} enableGradient={enableGradient} autoplay={config.autoplay} startTime={playbackTimeRef.current} onTimeUpdate={t => playbackTimeRef.current = t} />
            ) : (
              <div>
                {viewState === 'settings' ? <SettingsView config={config} onUpdateConfig={setConfig} /> : 
                 viewState === 'channel' && selectedChannel ? <ChannelView channelName={selectedChannel} config={channelConfigs[selectedChannel] || { id: selectedChannel, category: 'Uncategorized', isSubscribed: false }} videos={videos.filter(v => v.channelName === selectedChannel)} allVideos={videos} onUpdateChannel={handleUpdateChannel} onEditCustomFolder={(id, n, c, i, v) => { handleUpdateChannel(id, { displayName: n, category: c, iconBlob: i || undefined }); setConfig(moveVideosToChannel(v, id)); }} onVideoSelect={handleVideoSelect} customCategories={config.customCategories} onAddCategory={c => setConfig(addCustomCategory(c))} enableGradient={enableGradient} density={config.uiDensity} /> :
                 viewState === 'folders' ? <FoldersView channels={channels} channelConfigs={channelConfigs} allVideos={videos} customCategories={config.customCategories} searchTerm={searchTerm} onToggleSubscribe={n => handleUpdateChannel(n, { isSubscribed: !channelConfigs[n]?.isSubscribed })} onNavigateChannel={n => { setSelectedChannel(n); setViewState('channel'); }} onUpdateChannelName={(id, n) => handleUpdateChannel(id, { displayName: n })} onRemoveChannel={n => { setConfig(moveVideosToChannel(videos.filter(v => v.channelName === n).map(v => v.id), 'Uncategorized')); setVideos(v => v.map(x => x.channelName === n ? { ...x, channelName: 'Uncategorized' } : x)); deleteChannelConfig(n); }} onAddFolder={handleDirectoryPick} onCreateCustomFolder={(n, c, i, v) => { handleUpdateChannel(n, { displayName: n.split('/').pop(), category: c, iconBlob: i || undefined, isSubscribed: true }); setConfig(moveVideosToChannel(v, n)); }} onEditCustomFolder={(id, n, c, i, v) => { handleUpdateChannel(id, { displayName: n, category: c, iconBlob: i || undefined }); setConfig(moveVideosToChannel(v, id)); }} isUploadLimitReached={isUploadLimitReached} enableGradient={enableGradient} density={config.uiDensity} onVideoSelect={handleVideoSelect} /> :
                 <VideoGrid videos={displayedVideos} onVideoSelect={handleVideoSelect} density={config.uiDensity} />}
              </div>
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

      {selectedVideo && isMiniPlayer && <MiniPlayer video={selectedVideo} currentTime={playbackTimeRef.current} onClose={() => { setSelectedVideo(null); setIsMiniPlayer(false); }} onExpand={() => setIsMiniPlayer(false)} onTimeUpdate={t => playbackTimeRef.current = t} enableGradient={enableGradient} />}
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