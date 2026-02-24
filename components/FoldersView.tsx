import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChannelConfig, Channel, LocalVideo } from '../types';
import { FolderPlus, Edit2, Trash2, Bookmark, BookmarkCheck, ChevronDown, Upload, Search, ChevronRight, Folder, Home, FolderOpen, ArrowRight } from 'lucide-react';
import { ChannelEditorModal } from './ChannelEditorModal';
import { VideoGrid } from './VideoGrid';

interface FoldersViewProps {
  channels: Channel[];
  channelConfigs: Record<string, ChannelConfig>;
  allVideos: LocalVideo[];
  customCategories: string[];
  searchTerm: string; // Passed from parent
  onToggleSubscribe: (id: string) => void;
  onNavigateChannel: (id: string) => void;
  onUpdateChannelName: (id: string, newName: string) => void;
  onRemoveChannel: (id: string) => void;
  onAddFolder: () => void;
  onCreateCustomFolder: (name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => void;
  onEditCustomFolder: (id: string, name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => void;
  isUploadLimitReached: boolean;
  enableGradient?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  onVideoSelect: (video: LocalVideo) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({ 
  channels, 
  channelConfigs, 
  allVideos,
  customCategories,
  searchTerm,
  onToggleSubscribe, 
  onNavigateChannel,
  onUpdateChannelName,
  onRemoveChannel,
  onAddFolder,
  onCreateCustomFolder,
  onEditCustomFolder,
  isUploadLimitReached, 
  enableGradient,
  density = 'comfortable',
  onVideoSelect
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Derive visible content based on current path and search
  const { visibleFolders, visibleVideos } = useMemo(() => {
    // If Searching, switch to flat view of matching folders/videos
    if (searchTerm.trim()) {
        const lowerSearch = searchTerm.toLowerCase();
        
        // Filter all channels matching name/displayname
        const matchedFolders = channels.filter(ch => {
            const config = channelConfigs[ch.name];
            const displayName = config?.displayName || ch.name;
            return displayName.toLowerCase().includes(lowerSearch);
        }).map(ch => {
            const config = channelConfigs[ch.name] || { id: ch.name, category: 'Uncategorized', isSubscribed: false };
            return { path: ch.name, config, videoCount: ch.videoCount };
        });

        // Filter all videos matching title
        const matchedVideos = allVideos.filter(v => v.title.toLowerCase().includes(lowerSearch));

        return { visibleFolders: matchedFolders, visibleVideos: matchedVideos };
    }

    // Default: Hierarchical View
    const folderSet = new Set<string>();
    
    // 1. Identify direct children folders from channel list
    channels.forEach(ch => {
      if (ch.name.startsWith(currentPath)) {
        // e.g. Path="", Channel="Gaming/Minecraft". Rel="Gaming/Minecraft". Part="Gaming".
        // e.g. Path="Gaming", Channel="Gaming/Minecraft". Rel="/Minecraft". Part="Minecraft".
        let relativePath = ch.name.substring(currentPath.length);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
        
        if (relativePath.length > 0) {
           const firstPart = relativePath.split('/')[0];
           if (firstPart) {
             const fullFolderPath = currentPath ? `${currentPath}/${firstPart}` : firstPart;
             folderSet.add(fullFolderPath);
           }
        }
      }
    });

    // 2. Identify videos directly in this folder path
    const directVideos = allVideos.filter(v => v.channelName === (currentPath || 'Uncategorized') && (currentPath !== '' || v.channelName === 'Uncategorized'));
    
    const folders = Array.from(folderSet).map(path => {
       const config = channelConfigs[path] || { id: path, displayName: path.split('/').pop(), category: 'Uncategorized', isSubscribed: false };
       const videoCount = allVideos.filter(v => v.channelName.startsWith(path)).length;
       return { path, config, videoCount };
    });

    return { visibleFolders: folders, visibleVideos: directVideos };
  }, [channels, channelConfigs, allVideos, currentPath, searchTerm]);

  // Initialize Modal for Creating
  const handleCreateCustomClick = () => {
    setIsDropdownOpen(false);
    setModalMode('create');
    setEditingChannelId(null);
    setIsModalOpen(true);
  };

  // Initialize Modal for Editing
  const handleEditClick = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    setModalMode('edit');
    setEditingChannelId(channelId);
    setIsModalOpen(true);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the folder "${id}"? All videos will be moved to Uncategorized.`)) {
      onRemoveChannel(id);
    }
  };

  const handleUploadFolderClick = () => {
    setIsDropdownOpen(false);
    if (isUploadLimitReached) {
      alert("Please wait for current uploads to finish (Max 3 concurrent).");
      return;
    }
    onAddFolder();
  };

  const handleModalSave = (name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => {
    if (modalMode === 'create') {
        // If creating inside a subfolder, prepend current path
        const fullName = currentPath ? `${currentPath}/${name}` : name;
        onCreateCustomFolder(fullName, category, iconBlob, selectedVideoIds);
    } else if (modalMode === 'edit' && editingChannelId) {
        onEditCustomFolder(editingChannelId, name, category, iconBlob, selectedVideoIds);
    }
  };

  // Prepare initial data for modal if in edit mode
  const initialModalData = modalMode === 'edit' && editingChannelId ? {
    channelId: editingChannelId,
    name: channelConfigs[editingChannelId]?.displayName || editingChannelId.split('/').pop() || editingChannelId,
    category: channelConfigs[editingChannelId]?.category || 'None',
    iconUrl: channelConfigs[editingChannelId]?.iconUrl,
    currentVideoIds: allVideos.filter(v => v.channelName === editingChannelId).map(v => v.id)
  } : undefined;

  const cardClass = enableGradient
    ? 'bg-black/30 backdrop-blur-2xl border border-white/10 hover:bg-black/40 shadow-xl'
    : 'bg-yt-dark hover:bg-[#3f3f3f]';

  const btn3d = enableGradient
    ? 'bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg hover:bg-white/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-700 text-white'
    : 'hover:bg-gray-700 text-gray-300 hover:text-white';
  
  const mainBtnClass = enableGradient
    ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-lg hover:bg-white/20 hover:scale-105 active:scale-95'
    : 'bg-white text-black hover:bg-gray-200';

  const dropdownClass = enableGradient
    ? 'bg-black/60 backdrop-blur-3xl border-white/10 shadow-2xl'
    : 'bg-yt-dark border-gray-700';

  // Density styles
  const containerPadding = density === 'compact' ? 'p-4' : density === 'spacious' ? 'p-10' : 'p-8';
  const gridGap = density === 'compact' ? 'gap-2' : density === 'spacious' ? 'gap-4' : 'gap-3';
  const cardPadding = density === 'compact' ? 'p-3' : density === 'spacious' ? 'p-6' : 'p-4';

  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split('/');
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join('/')
    }));
  }, [currentPath]);

  return (
    <div className={`${containerPadding} pb-20 relative transition-all duration-300`}>
      
      {/* Header Area */}
      <div className="flex flex-col gap-4 mb-6">
        
        {/* Top Row: Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <Folder className="w-6 h-6 text-[var(--yt-brand)]" />
             {searchTerm ? `Searching "${searchTerm}"` : 'Managed Folders'}
           </h1>

           <div className="flex items-center gap-3">
              {/* Add Button */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-700 ${
                    isUploadLimitReached 
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-75' 
                      : mainBtnClass
                  }`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Folder</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && !isUploadLimitReached && (
                  <div className={`absolute right-0 mt-2 w-56 border rounded-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ${dropdownClass}`}>
                    <button 
                      onClick={handleUploadFolderClick}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${enableGradient ? 'hover:bg-white/10' : 'hover:bg-[#3f3f3f]'}`}
                    >
                      <Upload className="w-5 h-5 text-blue-400" />
                      <div>
                        <span className="block text-sm font-bold text-white">Upload Folder</span>
                        <span className="block text-xs text-gray-400">Import from disk</span>
                      </div>
                    </button>
                    <div className={`h-px my-1 mx-2 ${enableGradient ? 'bg-white/10' : 'bg-gray-700'}`} />
                    <button 
                      onClick={handleCreateCustomClick}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${enableGradient ? 'hover:bg-white/10' : 'hover:bg-[#3f3f3f]'}`}
                    >
                      <FolderPlus className="w-5 h-5 text-green-400" />
                      <div>
                        <span className="block text-sm font-bold text-white">New Sub-Folder</span>
                        <span className="block text-xs text-gray-400">{currentPath ? `Inside "${currentPath.split('/').pop()}"` : 'At Root Level'}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Breadcrumbs (Hide when searching as results are flat) */}
        {!searchTerm && (
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-400">
             <button 
               onClick={() => setCurrentPath('')}
               className={`flex items-center gap-1 hover:text-white transition-colors ${currentPath === '' ? 'text-white font-bold' : ''}`}
             >
               <Home className="w-4 h-4" />
               Root
             </button>
             {breadcrumbs.map((crumb, idx) => (
               <React.Fragment key={crumb.path}>
                 <ChevronRight className="w-4 h-4 text-gray-600" />
                 <button 
                   onClick={() => setCurrentPath(crumb.path)}
                   className={`hover:text-white transition-colors ${idx === breadcrumbs.length - 1 ? 'text-white font-bold' : ''}`}
                 >
                   {crumb.name}
                 </button>
               </React.Fragment>
             ))}
          </div>
        )}

      </div>
      
      {/* Content Area */}
      <div className="space-y-8">
        
        {/* Folders List (Full Width) */}
        {visibleFolders.length > 0 && (
          <div className={`flex flex-col ${gridGap} transition-all duration-300`}>
            {visibleFolders.map(({ path, config, videoCount }) => {
              const displayName = config.displayName || path.split('/').pop() || path;
              const isUncategorized = path === 'Uncategorized';

              // Thumbnail Selection Logic
              let displayThumb = config.iconUrl;
              if (!displayThumb) {
                 // Deterministic "random" selection of a video thumbnail from this folder
                 const folderVideos = allVideos.filter(v => v.channelName === path || v.channelName.startsWith(path + '/'));
                 const videosWithThumbs = folderVideos.filter(v => v.thumbnailUrl);
                 
                 if (videosWithThumbs.length > 0) {
                    // Create a simple hash from path string to pick a stable random video
                    const hash = path.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const index = hash % videosWithThumbs.length;
                    displayThumb = videosWithThumbs[index].thumbnailUrl || undefined;
                 }
              }

              return (
                <div key={path} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between ${cardPadding} rounded-xl transition-colors duration-700 gap-4 w-full ${cardClass}`}>
                  <div 
                    className="flex items-center gap-4 cursor-pointer flex-1 w-full group overflow-hidden"
                    onClick={() => {
                        if (searchTerm) {
                            setCurrentPath(path);
                        } else {
                            setCurrentPath(path);
                        }
                    }}
                  >
                    {displayThumb ? (
                      <img src={displayThumb} alt={displayName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                        <Folder className="w-8 h-8 fill-white/20" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors">{displayName}</h3>
                      <p className="text-yt-gray text-xs flex items-center gap-2">
                          {searchTerm && <span className="text-gray-500">{path}</span>}
                          <span>{videoCount} videos</span>
                          <span>•</span>
                          <span>{config.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigateChannel(path); }}
                      className={`p-2 rounded-full transition-all ${btn3d}`}
                      title="Visit Channel Page"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {!isUncategorized && (
                      <>
                        <button 
                          onClick={(e) => handleEditClick(e, path)}
                          className={`p-2 rounded-full transition-all ${btn3d}`}
                          title="Edit Folder"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={(e) => handleRemove(e, path)}
                          className={`p-2 rounded-full transition-all ${enableGradient ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'hover:bg-red-900/50 text-gray-300 hover:text-red-500'}`}
                          title="Remove Folder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className={`h-6 w-px mx-2 ${enableGradient ? 'bg-white/10' : 'bg-gray-700'}`}></div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleSubscribe(path); }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-700 whitespace-nowrap ${
                              config.isSubscribed 
                              ? (enableGradient ? 'bg-blue-600/50 border border-blue-400/30 backdrop-blur-md text-white shadow-lg hover:bg-blue-600/70' : 'bg-blue-600 text-white')
                              : (enableGradient ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white/10 text-white hover:bg-white/20')
                          }`}
                        >
                          {config.isSubscribed ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          {config.isSubscribed ? 'Saved' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Folder State */}
        {visibleFolders.length === 0 && visibleVideos.length === 0 && (
           <div className="text-center py-20 text-gray-500 bg-black/20 rounded-xl border border-white/5">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">{searchTerm ? 'No matches found' : 'This folder is empty'}</p>
              <p className="text-sm">{searchTerm ? 'Try a different search term.' : 'Upload videos or create sub-folders.'}</p>
           </div>
        )}

        {/* Videos in Current Folder */}
        {visibleVideos.length > 0 && (
           <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                 Videos
                 <span className="text-sm font-normal text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">{visibleVideos.length}</span>
              </h2>
              <VideoGrid videos={visibleVideos} onVideoSelect={onVideoSelect} density={density} />
           </div>
        )}

      </div>

      <ChannelEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialData={initialModalData}
        allVideos={allVideos}
        customCategories={customCategories}
        onSave={handleModalSave}
      />
    </div>
  );
};