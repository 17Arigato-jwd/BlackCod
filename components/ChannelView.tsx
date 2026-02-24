import React, { useRef, useState } from 'react';
import { ChannelConfig, LocalVideo } from '../types';
import { VideoGrid } from './VideoGrid';
import { Camera, Edit2 } from 'lucide-react';
import { ChannelEditorModal } from './ChannelEditorModal';
import { ImageCropperModal } from './ImageCropperModal';

interface ChannelViewProps {
  channelName: string;
  config: ChannelConfig;
  videos: LocalVideo[]; // These are filtered for current channel
  allVideos: LocalVideo[]; // All videos (needed for adding to folder)
  onUpdateChannel: (id: string, updates: Partial<ChannelConfig>) => void;
  onEditCustomFolder: (id: string, name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => void;
  onVideoSelect: (video: LocalVideo) => void;
  customCategories: string[];
  onAddCategory: (cat: string) => void;
  enableGradient?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
}

const DEFAULT_CATEGORIES = ['None', 'Music', 'Gaming', 'Sports', 'Education', 'Entertainment', 'Tech', 'Movies', 'TV Shows', 'Vlogs', 'Other'];

export const ChannelView: React.FC<ChannelViewProps> = ({ 
  channelName, 
  config, 
  videos,
  allVideos,
  onUpdateChannel,
  onEditCustomFolder,
  onVideoSelect,
  customCategories,
  onAddCategory,
  enableGradient,
  density = 'comfortable'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<File | null>(null);
  
  const allCategories = [...DEFAULT_CATEGORIES, ...(customCategories || [])];
  const isUncategorized = channelName === 'Uncategorized';

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingIcon(file);
      setIsCropperOpen(true);
      e.target.value = '';
    }
  };

  const handleIconCropComplete = (croppedBlob: Blob) => {
    onUpdateChannel(channelName, { 
      iconBlob: croppedBlob, 
      iconUrl: URL.createObjectURL(croppedBlob) 
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__NEW__') {
      const newCat = prompt("Enter new category name:");
      if (newCat && newCat.trim()) {
        onAddCategory(newCat.trim());
        onUpdateChannel(channelName, { category: newCat.trim() });
      }
    } else {
      onUpdateChannel(channelName, { category: val });
    }
  };

  const handleModalSave = (name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => {
    onEditCustomFolder(channelName, name, category, iconBlob, selectedVideoIds);
  };

  const bannerBg = enableGradient
    ? "bg-transparent"
    : "bg-gradient-to-r from-gray-900 via-black to-gray-900";
    
  const inputClass = enableGradient
    ? "bg-black/30 text-white border border-white/20 backdrop-blur-md"
    : "bg-yt-dark text-white border border-gray-700";

  return (
    <div className="pb-20">
      {/* Banner Area */}
      <div className={`h-48 md:h-64 w-full relative transition-all duration-700 ${bannerBg}`}>
        <div className={`absolute bottom-0 left-0 w-full h-full ${enableGradient ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-black/20'}`} />
      </div>

      {/* Channel Header */}
      <div className="px-8 -mt-8 md:-mt-12 flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 relative z-10">
        <div className="relative group">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-yt-black bg-yt-dark flex items-center justify-center overflow-hidden shadow-2xl">
            {config.iconUrl ? (
              <img src={config.iconUrl} alt={channelName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white">{channelName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!isUncategorized && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-yt-dark p-2 rounded-full hover:bg-white hover:text-black transition-colors border border-yt-black"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleIconSelect} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1 text-center md:text-left space-y-2 pb-2">
          <div className="flex items-center gap-2 justify-center md:justify-start">
             <h1 className="text-3xl font-bold text-white drop-shadow-md">{config.displayName || channelName}</h1>
             {!isUncategorized && (
               <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Edit Channel Settings"
               >
                  <Edit2 className="w-5 h-5" />
               </button>
             )}
          </div>
          
          <div className="text-yt-gray text-sm flex flex-col md:flex-row gap-2 md:gap-4 items-center md:items-start">
             <span className={enableGradient ? 'text-gray-300' : ''}>@{channelName.replace(/\s+/g, '').toLowerCase()}</span>
             <span className={enableGradient ? 'text-gray-300' : ''}>{videos.length} videos</span>
             
             {/* Category Selector */}
             {!isUncategorized && (
               <div className="flex items-center gap-2">
                 <span className={enableGradient ? 'text-gray-300' : 'text-gray-500'}>Category:</span>
                 <select 
                   value={config.category || 'None'} 
                   onChange={handleCategoryChange}
                   className={`text-xs p-1 rounded focus:outline-none max-w-[150px] transition-colors duration-700 ${inputClass}`}
                 >
                   {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                   <option value="__NEW__" className="font-bold text-blue-400">+ Add Custom...</option>
                 </select>
               </div>
             )}
          </div>
        </div>

        <button 
          onClick={() => onUpdateChannel(channelName, { isSubscribed: !config.isSubscribed })}
          className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-700 mb-4 shadow-lg ${
            config.isSubscribed 
              ? (enableGradient ? 'bg-white/10 border border-white/20 backdrop-blur-md text-white hover:bg-white/20' : 'bg-yt-dark text-white hover:bg-gray-800 border border-gray-600')
              : (enableGradient ? 'text-black hover:bg-white/90 shadow-xl' : 'bg-white text-black hover:bg-gray-200')
          }`}
          style={!config.isSubscribed && enableGradient ? { backgroundColor: 'var(--yt-brand)', color: 'white' } : {}}
        >
          {config.isSubscribed ? 'Saved to Personal Library' : 'Save to Personal Library'}
        </button>
      </div>

      <div className={`border-t pt-6 transition-colors duration-700 ${enableGradient ? 'border-white/10' : 'border-yt-dark'}`}>
        <h2 className="text-xl font-bold px-8 mb-4">Videos</h2>
        <div className="px-4">
           {videos.length > 0 ? (
             <VideoGrid videos={videos} onVideoSelect={onVideoSelect} density={density} />
           ) : (
             <div className="text-center text-gray-500 py-10">No videos in this channel.</div>
           )}
        </div>
      </div>

      {!isUncategorized && (
        <ChannelEditorModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode="edit"
          initialData={{
            channelId: channelName,
            name: config.displayName || channelName,
            category: config.category || 'None',
            iconUrl: config.iconUrl,
            currentVideoIds: videos.map(v => v.id)
          }}
          allVideos={allVideos}
          customCategories={customCategories}
          onSave={handleModalSave}
        />
      )}
      
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageFile={pendingIcon}
        aspectRatio={1}
        onCropComplete={handleIconCropComplete}
      />
    </div>
  );
};