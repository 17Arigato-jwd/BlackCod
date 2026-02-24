import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCcw, Info, Fish, User, Database, FileText, ChevronRight, Eye, Code, Save, Camera, X, Download, Palette, Plus, Zap, Folder, HardDrive, AlertTriangle, Upload, HelpCircle, ArrowRight, Laptop, Film, Settings as SettingsIcon, LayoutGrid, PlayCircle, ArrowUpDown, FolderMinus, Loader2, Edit2, Check } from 'lucide-react';
import { AppConfig, ChannelConfig, UserProfile } from '../types';
import { loadChannels, saveConfig, downloadSystemFile, saveFileToFolder, defaultConfig, defaultChannelData, getVideoExportData, importVideoData, loadChannelHandles, removeChannelHandle, removeVideoChannelOverrides, moveVideosToChannel, importChannelData } from '../utils/storageUtils';
import { ThemePickerModal } from './ThemePickerModal';
import { ImageCropperModal } from './ImageCropperModal';

interface SettingsViewProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

const THEME_OPTIONS = [
  { id: 'default', name: 'Default', color: '#272727', border: '#ff0000' },
  { id: 'orange', name: 'Amber', color: '#2e1600', border: '#f97316' },
  { id: 'blue', name: 'Ocean', color: '#00162e', border: '#3b82f6' },
  { id: 'green', name: 'Forest', color: '#002e0d', border: '#22c55e' },
  { id: 'purple', name: 'Void', color: '#24002e', border: '#a855f7' },
  { id: 'pink', name: 'Neon', color: '#2e001d', border: '#ec4899' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'data' | 'credits'>('general');
  
  // Profile State
  const [username, setUsername] = useState(config.userProfile?.name || 'User');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(config.userProfile?.avatarDataUrl || null);
  const [selectedTheme, setSelectedTheme] = useState(config.themeColor || 'default');
  const [customColor, setCustomColor] = useState(config.customThemeColor || '#3b82f6');
  const [enableGradient, setEnableGradient] = useState(config.enableGradient || false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Preferences State
  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable' | 'spacious'>(config.uiDensity || 'comfortable');
  const [autoplay, setAutoplay] = useState<boolean>(config.autoplay !== false); // default to true

  // Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Data View State
  const [channelData, setChannelData] = useState<Record<string, ChannelConfig> | null>(null);
  const [savedHandles, setSavedHandles] = useState<string[]>([]);
  const [videoData, setVideoData] = useState<any>(getVideoExportData());
  const [viewingData, setViewingData] = useState<{title: string, content: string} | null>(null);
  const [editingData, setEditingData] = useState<{title: string, content: string, type: 'config' | 'channel' | 'video'} | null>(null);
  const [showBackupHelp, setShowBackupHelp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  useEffect(() => {
    loadChannels().then(setChannelData);
    loadChannelHandles().then(handles => setSavedHandles(Object.keys(handles)));
    setVideoData(getVideoExportData());
  }, [config]);

  const handleSaveGeneral = () => {
    const newConfig = {
      ...config,
      userProfile: {
        name: username,
        avatarDataUrl: avatarPreview || undefined
      },
      themeColor: selectedTheme,
      customThemeColor: customColor,
      enableGradient: enableGradient,
      uiDensity,
      autoplay
    };
    saveConfig(newConfig);
    onUpdateConfig(newConfig);
    alert("Settings saved!");
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAvatarFile(file);
      setIsCropperOpen(true);
      e.target.value = ''; // Reset input
    }
  };

  const handleAvatarCropComplete = (croppedBlob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Watch History?',
      message: 'This will remove the list of videos you have recently watched. This action cannot be undone.',
      type: 'warning',
      onConfirm: () => {
        const newConfig = { ...config, history: [] };
        saveConfig(newConfig);
        onUpdateConfig(newConfig);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Factory Reset?',
      message: 'WARNING: This will wipe ALL application data including settings, history, likes, and channel customizations. Your video files will NOT be deleted.',
      type: 'danger',
      onConfirm: () => {
        localStorage.removeItem('localtube_config');
        localStorage.removeItem('localtube_channel_data');
        import('idb-keyval').then(({ clear }) => {
           clear().then(() => window.location.reload());
        });
      }
    });
  };

  const handleResetChannelData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Channel Data?',
      message: 'This will reset all channel icons, categories, and custom folder structures to default. This action cannot be undone.',
      type: 'danger',
      onConfirm: () => {
        import('idb-keyval').then(async ({ set }) => {
            await set('localtube_channel_data', defaultChannelData);
            setChannelData(defaultChannelData);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            window.location.reload();
        });
      }
    });
  };

  const handleRemoveHandle = (name: string) => {
    setConfirmModal({
        isOpen: true,
        title: `Forget "${name}"?`,
        message: 'This folder will no longer load at startup. Videos currently loaded from this folder will remain until you refresh.',
        type: 'warning',
        onConfirm: async () => {
            await removeChannelHandle(name);
            // Sync Folder List in Config
            const newFolders = (config.startupFolderNames || []).filter(h => h !== name);
            const newConfig = { ...config, startupFolderNames: newFolders };
            saveConfig(newConfig);
            onUpdateConfig(newConfig);
            setSavedHandles(prev => prev.filter(h => h !== name));
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handleResetConfig = () => {
     setConfirmModal({
        isOpen: true,
        title: 'Reset Configuration?',
        message: 'This will reset your settings, theme, watch history, and likes to their default values. This action cannot be undone.',
        type: 'danger',
        onConfirm: () => {
            saveConfig(defaultConfig);
            onUpdateConfig(defaultConfig);
            
            setUsername(defaultConfig.userProfile?.name || 'User');
            setAvatarPreview(null);
            setSelectedTheme(defaultConfig.themeColor || 'default');
            setCustomColor(defaultConfig.customThemeColor || '#3b82f6');
            setEnableGradient(defaultConfig.enableGradient || false);
            setUiDensity(defaultConfig.uiDensity || 'comfortable');
            setAutoplay(defaultConfig.autoplay !== false);
            
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            window.location.reload();
        }
     });
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // Detection Logic - PRIORITY MATTERS
        // 1. Config (has userProfile)
        const isConfigFile = file.name.includes('.config') || (data.userProfile !== undefined);
        
        // 2. Channel (has category/displayName map)
        const isChannelFile = !isConfigFile && (file.name.includes('.channel') || (Object.values(data).some((v: any) => v && typeof v === 'object' && v.category)));
        
        // 3. Video (has customVideoTitles)
        const isVideoFile = !isConfigFile && !isChannelFile && (file.name.includes('.video') || (data.customVideoTitles !== undefined || data.ratings !== undefined));

        if (isConfigFile) {
           const backupProfile = data.userProfile as UserProfile | undefined;
           const profileName = backupProfile?.name || "Unknown User";
           
           setConfirmModal({
             isOpen: true,
             title: 'Restore Configuration?',
             message: `This will replace your entire configuration with data from the backup file for user "${profileName}". This includes your profile, theme, managed folder list, and preferences. The app will reload to apply changes.`,
             type: 'warning',
             onConfirm: () => {
               setConfirmModal(prev => ({ ...prev, isOpen: false }));
               setIsRestoring(true);
               setRestoreProgress(30);
               
               setTimeout(() => {
                   setRestoreProgress(90);
                   saveConfig(data);
                   setRestoreProgress(100);
                   window.location.reload();
               }, 800);
             }
           });
        } else if (isVideoFile) {
            setConfirmModal({
                isOpen: true,
                title: 'Apply Video Data?',
                message: 'This will replace custom titles, ratings, and video overrides with the data from the file. Current videos will be updated.',
                type: 'warning',
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setIsRestoring(true);
                    setRestoreProgress(20);
                    
                    setTimeout(async () => {
                        setRestoreProgress(60);
                        const newConfig = importVideoData(data);
                        setRestoreProgress(100);
                        onUpdateConfig(newConfig);
                        setTimeout(() => setIsRestoring(false), 500);
                        window.location.reload();
                    }, 500);
                }
            });
        } else if (isChannelFile) {
           setConfirmModal({
             isOpen: true,
             title: 'Restore Channel Metadata?',
             message: 'This will replace all channel icons, display names, and categories with the data from this file. The app will reload to apply changes.',
             type: 'warning',
             onConfirm: async () => {
               setConfirmModal(prev => ({ ...prev, isOpen: false }));
               setIsRestoring(true);
               setRestoreProgress(30);
               
               setTimeout(async () => {
                   setRestoreProgress(80);
                   await importChannelData(data);
                   setRestoreProgress(100);
                   window.location.reload();
               }, 800);
             }
           });
        } else {
          alert("Unrecognized file format. Please upload a valid .config.json, .channel.json, or .video.json file.");
        }
      } catch (error) {
        alert("Failed to parse the file. Ensure it is a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleEditSave = async () => {
    if (!editingData || !editorRef.current) return;
    try {
      const content = editorRef.current.value;
      const data = JSON.parse(content);
      
      if (editingData.type === 'config') {
        saveConfig(data);
      } else if (editingData.type === 'channel') {
        await importChannelData(data);
      } else if (editingData.type === 'video') {
        importVideoData(data);
      }
      
      // Reload application to reflect changes
      window.location.reload();
    } catch (err) {
      alert("Invalid JSON format. Please check for syntax errors.");
    }
  };

  const glassCard = config.enableGradient 
    ? "bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl" 
    : "bg-yt-dark";

  const btn3d = config.enableGradient
    ? "bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg hover:bg-white/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-700 text-white"
    : "hover:bg-white/10 text-white";

  const inputClass = config.enableGradient
    ? "bg-black/40 border border-white/10 text-white focus:border-blue-500"
    : "bg-yt-dark border border-gray-700 text-white focus:border-blue-500";

  const renderGeneralTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Profile Section */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-yt-dark border-4 border-yt-dark shadow-xl transition-all">
             {avatarPreview ? (
               <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                 <User className="w-16 h-16 text-white" />
               </div>
             )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 rounded-full text-white transition-colors shadow-lg border-2 border-yt-black hover:brightness-110"
            style={{ backgroundColor: 'var(--yt-brand)' }}
          >
            <Camera className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarFileSelect} 
            className="hidden" 
            accept="image/*"
          />
        </div>
        
        <div className="w-full max-w-md space-y-2">
           <label className="text-sm font-bold text-gray-400 uppercase">Display Name</label>
           <input 
             type="text" 
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             className={`w-full rounded-lg px-4 py-3 focus:outline-none transition-all duration-700 ${inputClass}`}
             placeholder="Enter your name"
           />
        </div>
      </div>

      <hr className={`border-t ${config.enableGradient ? 'border-white/10' : 'border-gray-800'}`} />

      {/* 2. Preferences & Playback */}
      <div className="space-y-6">
         <h3 className="text-lg font-bold text-white px-2">Preferences</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* UI Density */}
            <div className={`p-4 rounded-xl ${glassCard}`}>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <LayoutGrid className="w-4 h-4 text-blue-400" />
                Interface Density
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setUiDensity('compact')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${uiDensity === 'compact' ? 'bg-[var(--yt-brand)] text-white shadow-lg' : 'bg-black/20 text-gray-400 hover:bg-white/5'}`}
                >
                  Compact
                </button>
                <button 
                  onClick={() => setUiDensity('comfortable')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${uiDensity === 'comfortable' ? 'bg-[var(--yt-brand)] text-white shadow-lg' : 'bg-black/20 text-gray-400 hover:bg-white/5'}`}
                >
                  Comfortable
                </button>
                <button 
                  onClick={() => setUiDensity('spacious')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${uiDensity === 'spacious' ? 'bg-[var(--yt-brand)] text-white shadow-lg' : 'bg-black/20 text-gray-400 hover:bg-white/5'}`}
                >
                  Spacious
                </button>
              </div>
            </div>

            {/* Autoplay */}
            <div 
              onClick={() => setAutoplay(!autoplay)}
              className={`p-4 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${glassCard} hover:bg-white/5`}
            >
              <div className="flex items-center gap-3">
                  <PlayCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Autoplay Videos</h3>
                    <p className="text-xs text-gray-400">Start videos automatically</p>
                  </div>
              </div>
              <div 
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300`}
                style={{ backgroundColor: autoplay ? 'var(--yt-brand)' : '#4b5563' }}
              >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${autoplay ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
         </div>
      </div>

      <hr className={`border-t ${config.enableGradient ? 'border-white/10' : 'border-gray-800'}`} />

      {/* 3. Appearance */}
      <div className="space-y-4">
          <h3 className="text-lg font-bold text-white px-2">Appearance</h3>
          
          <div className="space-y-3">
             <label className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2 px-2">
               Theme Colors
             </label>
             <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {THEME_OPTIONS.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${selectedTheme === theme.id ? 'ring-2 ring-white scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                  >
                    <div className="absolute inset-0" style={{ backgroundColor: theme.color }}></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ backgroundColor: theme.border }}></div>
                    {selectedTheme === theme.id && (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                         <div className="w-2 h-2 rounded-full bg-white shadow-lg"></div>
                       </div>
                    )}
                  </button>
                ))}

                <div className="relative">
                   <button
                     onClick={() => setIsColorPickerOpen(true)}
                     className={`w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 flex flex-col items-center justify-center border-2 border-dashed ${selectedTheme === 'custom' ? 'border-white bg-white/10' : 'border-gray-600 hover:border-gray-400 hover:bg-white/5'}`}
                     style={selectedTheme === 'custom' ? { backgroundColor: customColor + '20' } : {}}
                   >
                      {selectedTheme === 'custom' ? (
                         <div className="w-6 h-6 rounded-full border border-white" style={{ backgroundColor: customColor }} />
                      ) : (
                         <Plus className="w-6 h-6 text-gray-400" />
                      )}
                      <span className="text-[10px] mt-1 text-gray-400 font-medium">Custom</span>
                   </button>
                </div>
             </div>
          </div>

          <div 
             onClick={() => setEnableGradient(!enableGradient)}
             className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors duration-700 ${config.enableGradient ? 'bg-black/40 border border-white/10 hover:bg-black/50' : 'bg-yt-dark border border-gray-700 hover:bg-gray-800'}`}
           >
              <div className="flex items-center gap-3">
                 <div 
                   className={`p-2 rounded-lg text-white`}
                   style={{ backgroundColor: enableGradient ? 'var(--yt-brand)' : '#374151' }}
                 >
                    <Zap className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="font-bold text-sm text-white">Gradient Background</h3>
                    <p className="text-xs text-gray-500">Enable vivid background effects</p>
                 </div>
              </div>
              <div 
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-700`}
                style={{ backgroundColor: enableGradient ? 'var(--yt-brand)' : '#4b5563' }}
              >
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${enableGradient ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
           </div>
      </div>

      <div className="pt-4 flex justify-center">
        <button 
          onClick={handleSaveGeneral}
          className={`px-12 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all duration-700 ${config.enableGradient ? 'text-white hover:brightness-110 active:scale-95' : 'bg-white text-black hover:bg-gray-200'}`}
          style={config.enableGradient ? { 
            background: `linear-gradient(to right, var(--yt-brand), black)`,
            border: '1px solid rgba(255,255,255,0.2)' 
          } : {}}
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>

      <ThemePickerModal 
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        initialColor={customColor}
        onSelect={(newColor) => {
          setCustomColor(newColor);
          setSelectedTheme('custom');
        }}
      />
      
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageFile={pendingAvatarFile}
        aspectRatio={1}
        onCropComplete={handleAvatarCropComplete}
      />
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Startup Folders Management */}
      <div className={`rounded-xl p-6 transition-colors duration-700 ${glassCard}`}>
         <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-400" />
                Startup Folders
            </h2>
            <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded max-w-xs">
               <AlertTriangle className="w-4 h-4 shrink-0" />
               <p>Note: Only folder names are saved in config. Actual folder paths are stored in the browser database for security and cannot be exported.</p>
            </div>
         </div>
         <div className="space-y-2">
            {(config.startupFolderNames && config.startupFolderNames.length > 0) ? (
               config.startupFolderNames.map((folderName) => {
                  const hasHandle = savedHandles.includes(folderName);
                  return (
                      <div key={folderName} className={`flex items-center justify-between p-3 rounded-lg border ${hasHandle ? 'bg-black/20 border-white/5' : 'bg-red-900/10 border-red-900/30'}`}>
                         <div className="flex items-center gap-3">
                            {hasHandle ? <HardDrive className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                            <div>
                                <span className="font-medium text-sm text-white block">{folderName}</span>
                                <span className="text-xs text-gray-500">{hasHandle ? 'Active & Persisted' : 'Missing Permissions or Handle'}</span>
                            </div>
                         </div>
                         <button 
                            onClick={() => handleRemoveHandle(folderName)}
                            className={`p-2 rounded text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors`}
                            title="Forget Folder"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                  );
               })
            ) : (
               <div className="text-center text-gray-500 text-sm py-4">No folders saved for startup. Add folders via the "+" button in Home.</div>
            )}
         </div>
      </div>

      {/* Configuration Files */}
      <div className={`rounded-xl p-6 transition-colors duration-700 ${glassCard} relative overflow-hidden`}>
        {isRestoring && (
           <div className="absolute top-0 left-0 w-full h-full bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--yt-brand)]" />
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-[var(--yt-brand)] transition-all duration-300"
                   style={{ width: `${restoreProgress}%` }}
                 />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white">Applying Backup...</span>
           </div>
        )}

        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-bold flex items-center gap-2">
             <FileText className="w-5 h-5 text-yellow-500" />
             System Files (Export)
           </h2>
           <div className="flex gap-2">
             <button
               onClick={() => setShowBackupHelp(true)}
               className={`p-2 rounded-full ${btn3d}`}
               title="Help: Backup & Restore"
             >
               <Info className="w-5 h-5 text-blue-400" />
             </button>
             <button
               onClick={() => restoreInputRef.current?.click()}
               className={`p-2 rounded-full ${btn3d}`}
               title="Upload downloaded .config, .channel or .video files"
             >
               <Upload className="w-5 h-5 text-green-400" />
             </button>
             <input type="file" ref={restoreInputRef} onChange={handleRestoreFile} className="hidden" accept=".json" />
           </div>
        </div>
        
        <div className="space-y-3">
          {/* Config File */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-mono text-sm text-white">.config</p>
                <p className="text-xs text-gray-500">Settings & Managed Folders</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => downloadSystemFile('.config.json', JSON.stringify(config, null, 2))}
                className={`p-2 rounded text-green-400 hover:text-green-300 ${btn3d}`}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewingData({ title: '.config', content: JSON.stringify(config, null, 2) })}
                className={`p-2 rounded text-blue-400 hover:text-blue-300 ${btn3d}`}
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setEditingData({ title: '.config', content: JSON.stringify(config, null, 2), type: 'config' })}
                className={`p-2 rounded text-yellow-400 hover:text-yellow-300 ${btn3d}`}
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleResetConfig}
                className={`p-2 rounded text-red-500 hover:text-red-400 ${btn3d}`}
                title="Reset to Default"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Channel File */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-mono text-sm text-white">.channel</p>
                <p className="text-xs text-gray-500">Channel Metadata ({Object.keys(channelData || {}).length} entries)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => downloadSystemFile('.channel.json', JSON.stringify(channelData, null, 2))}
                className={`p-2 rounded text-green-400 hover:text-green-300 ${btn3d}`}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewingData({ title: '.channel', content: JSON.stringify(channelData, null, 2) })}
                className={`p-2 rounded text-blue-400 hover:text-blue-300 ${btn3d}`}
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setEditingData({ title: '.channel', content: JSON.stringify(channelData, null, 2), type: 'channel' })}
                className={`p-2 rounded text-yellow-400 hover:text-yellow-300 ${btn3d}`}
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleResetChannelData}
                className={`p-2 rounded text-red-500 hover:text-red-400 ${btn3d}`}
                title="Reset to Default"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Data File */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-mono text-sm text-white">.video</p>
                <p className="text-xs text-gray-500">Titles, Ratings & Overrides ({Object.keys(videoData.customVideoTitles || {}).length} titles)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => downloadSystemFile('.video.json', JSON.stringify(videoData, null, 2))}
                className={`p-2 rounded text-green-400 hover:text-green-300 ${btn3d}`}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewingData({ title: '.video', content: JSON.stringify(videoData, null, 2) })}
                className={`p-2 rounded text-blue-400 hover:text-blue-300 ${btn3d}`}
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setEditingData({ title: '.video', content: JSON.stringify(videoData, null, 2), type: 'video' })}
                className={`p-2 rounded text-yellow-400 hover:text-yellow-300 ${btn3d}`}
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Danger Zone */}
      <div className={`rounded-xl p-6 border border-red-900/30 transition-colors duration-700 ${glassCard}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
          <RefreshCcw className="w-5 h-5" />
          Reset Actions
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Clear Watch History</h3>
              <p className="text-sm text-yt-gray">Remove the list of videos you've recently watched.</p>
            </div>
            <button 
              onClick={handleClearHistory}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${btn3d}`}
            >
              Clear History
            </button>
          </div>

          <div className="h-px bg-white/10 my-2" />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Factory Reset</h3>
              <p className="text-sm text-yt-gray">Wipe all app data (does not delete videos).</p>
            </div>
            <button 
              onClick={handleResetData}
              className="px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreditsTab = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in slide-in-from-bottom-4 duration-500 text-center space-y-6">
       <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
          <Fish className="w-12 h-12 text-black" />
       </div>
       <div>
         <h1 className="text-4xl font-bold mb-2">BlackCod</h1>
         <p className="text-gray-400 tracking-widest text-sm font-medium uppercase">By VCHS Studios</p>
       </div>
       <div className={`p-6 rounded-xl max-w-md w-full border border-white/5 transition-colors duration-700 ${glassCard}`}>
         <div className="space-y-4 text-sm text-gray-300">
           <p>
             <strong className="text-white block mb-1">Concept & Design</strong>
             Designed to bring the online streaming experience to your offline collection.
           </p>
           <p>
             <strong className="text-white block mb-1">Tech Stack</strong>
             React, TailwindCSS, Lucide Icons, IndexedDB
           </p>
           <p>
             <strong className="text-white block mb-1">Version</strong>
             1.1.3
           </p>
         </div>
       </div>
       <p className="text-xs text-gray-500">© 2025 VCHS Studios. All rights reserved.</p>
    </div>
  );

  return (
    <div className="relative min-h-full pb-24">
      {/* Header */}
      <div className={`sticky top-0 z-10 px-8 py-6 transition-colors duration-700 ${config.enableGradient ? 'bg-black/30 backdrop-blur-md border-b border-white/10' : 'bg-yt-black/95 backdrop-blur-sm border-b border-yt-dark'}`}>
         <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'data' && renderDataTab()}
        {activeTab === 'credits' && renderCreditsTab()}
      </div>

      {/* Page Selector (Bottom Nav) */}
      <div className={`fixed bottom-0 left-0 right-0 sm:left-60 p-4 z-20 transition-all duration-700 ${config.enableGradient ? 'bg-transparent' : 'bg-yt-dark border-t border-white/10'}`}>
        <div className={`max-w-xl mx-auto flex p-1 rounded-full backdrop-blur-md ${config.enableGradient ? 'bg-black/40 border border-white/10 shadow-xl' : 'bg-black/50'}`}>
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'general' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'data' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
          >
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Data</span>
          </button>
          <button 
            onClick={() => setActiveTab('credits')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'credits' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Credits</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className={`w-full max-w-md bg-[#181818] rounded-2xl overflow-hidden shadow-2xl border ${confirmModal.type === 'danger' ? 'border-red-900/50' : 'border-white/10'} flex flex-col`}>
              <div className="p-6 text-center space-y-4">
                 <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${confirmModal.type === 'danger' ? 'bg-red-900/20 text-red-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                    <AlertTriangle className="w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-bold text-white">{confirmModal.title}</h2>
                 <p className="text-gray-400 text-sm leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex border-t border-white/5 bg-[#121212]">
                 <button 
                   onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                   className="flex-1 py-4 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <div className="w-px bg-white/5"></div>
                 <button 
                   onClick={confirmModal.onConfirm}
                   className={`flex-1 py-4 font-bold hover:bg-white/5 transition-colors ${confirmModal.type === 'danger' ? 'text-red-500' : 'text-[var(--yt-brand)]'}`}
                 >
                   Confirm
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Data Viewer Modal */}
      {viewingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1e1e1e] w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252525]">
              <h3 className="font-mono text-white">{viewingData.title}</h3>
              <button onClick={() => setViewingData(null)} className="p-1 hover:bg-white/10 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-4 overflow-auto text-xs text-green-400 font-mono flex-1">
              {viewingData.content}
            </pre>
          </div>
        </div>
      )}

      {/* Data Editor Modal */}
      {editingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252525]">
              <h3 className="font-mono text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-yellow-500" />
                Editing {editingData.title}
              </h3>
              <button onClick={() => setEditingData(null)} className="p-1 hover:bg-white/10 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-[#0a0a0a] overflow-hidden flex flex-col">
              <textarea
                ref={editorRef}
                className="flex-1 w-full h-full bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none p-4 rounded-lg border border-white/5 focus:border-white/20 transition-colors"
                defaultValue={editingData.content}
                spellCheck={false}
                placeholder="Paste JSON content here..."
              />
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 text-xs text-yellow-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Warning: Incorrect JSON syntax may corrupt your data.</span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingData(null)}
                    className="px-6 py-2 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEditSave}
                    className="px-6 py-2 rounded-full font-bold text-sm text-black bg-white hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    Save & Reload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Help Modal */}
      {showBackupHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#181818] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HardDrive className="w-6 h-6 text-blue-400" />
                Backup & Restore Guide
              </h2>
              <button onClick={() => setShowBackupHelp(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-10">
              {/* Step 1: Export */}
              <div className="flex flex-col md:flex-row gap-6 items-center">
                 <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30 text-blue-400 text-2xl font-bold">
                   1
                 </div>
                 <div className="flex-1 space-y-4 text-center md:text-left">
                   <h3 className="text-lg font-bold text-white">Export Data</h3>
                   <p className="text-sm text-gray-400">Click the <span className="text-green-400 font-bold">Download</span> button to save your .config, .channel or .video files to your computer.</p>
                   
                   {/* Visual Image */}
                   <div className="bg-black/40 rounded-lg p-4 border border-white/10 flex items-center justify-center gap-4">
                      <div className="bg-yt-dark p-3 rounded border border-gray-600">
                        <FileText className="w-8 h-8 text-white" />
                        <div className="text-[8px] text-gray-400 mt-1">.config</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-500 animate-pulse" />
                      <div className="bg-blue-900/30 p-3 rounded border border-blue-500/50">
                         <Folder className="w-8 h-8 text-blue-400" />
                         <div className="text-[8px] text-blue-300 mt-1">Your PC</div>
                      </div>
                   </div>
                 </div>
              </div>

              {/* Step 2: Transfer */}
              <div className="flex flex-col md:flex-row gap-6 items-center">
                 <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30 text-purple-400 text-2xl font-bold">
                   2
                 </div>
                 <div className="flex-1 space-y-4 text-center md:text-left">
                   <h3 className="text-lg font-bold text-white">Transfer (Optional)</h3>
                   <p className="text-sm text-gray-400">You can move these files to a USB drive or cloud storage to transfer your settings to another device.</p>
                   
                   {/* Visual Image */}
                   <div className="bg-black/40 rounded-lg p-4 border border-white/10 flex items-center justify-center gap-4">
                      <Laptop className="w-8 h-8 text-gray-400" />
                      <ArrowRight className="w-5 h-5 text-gray-500" />
                      <div className="bg-white/10 p-2 rounded-full">
                         <HardDrive className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-500" />
                      <Laptop className="w-8 h-8 text-white" />
                   </div>
                 </div>
              </div>

              {/* Step 3: Restore */}
              <div className="flex flex-col md:flex-row gap-6 items-center">
                 <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 border border-green-500/30 text-green-400 text-2xl font-bold">
                   3
                 </div>
                 <div className="flex-1 space-y-4 text-center md:text-left">
                   <h3 className="text-lg font-bold text-white">Restore Data</h3>
                   <p className="text-sm text-gray-400">Click the <span className="text-green-400 font-bold inline-flex items-center gap-1"><Upload className="w-3 h-3"/> Upload</span> button in the top right of the System Files section and select your file.</p>
                   
                   {/* Visual Image */}
                   <div className="bg-black/40 rounded-lg p-4 border border-white/10 flex items-center justify-center gap-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent animate-pulse" />
                      <div className="bg-blue-900/30 p-3 rounded border border-blue-500/50">
                         <Folder className="w-8 h-8 text-blue-400" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-500" />
                      <div className="bg-yt-dark p-3 rounded border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                         <Upload className="w-8 h-8 text-green-400" />
                         <div className="text-[8px] text-green-400 mt-1">Import</div>
                      </div>
                   </div>
                 </div>
              </div>

            </div>

            <div className="p-6 border-t border-white/10 bg-[#121212]">
               <button 
                 onClick={() => setShowBackupHelp(false)}
                 className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
               >
                 Got it
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};