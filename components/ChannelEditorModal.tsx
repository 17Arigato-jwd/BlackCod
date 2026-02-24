import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, CheckSquare, Square, X, Save } from 'lucide-react';
import { LocalVideo } from '../types';
import { formatDuration } from '../utils/videoUtils';
import { ImageCropperModal } from './ImageCropperModal';

interface ChannelEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: {
    channelId?: string;
    name: string;
    category: string;
    iconUrl?: string;
    currentVideoIds: string[];
  };
  allVideos: LocalVideo[];
  customCategories: string[];
  onSave: (name: string, category: string, iconBlob: Blob | null, selectedVideoIds: string[]) => void;
}

const DEFAULT_CATEGORIES = ['None', 'Music', 'Gaming', 'Sports', 'Education', 'Entertainment', 'Tech', 'Movies', 'TV Shows', 'Vlogs', 'Other'];

export const ChannelEditorModal: React.FC<ChannelEditorModalProps> = ({
  isOpen, onClose, mode, initialData, allVideos, customCategories, onSave
}) => {
  const [folderName, setFolderName] = useState('');
  const [folderCategory, setFolderCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [folderIcon, setFolderIcon] = useState<Blob | null>(null);
  const [folderIconPreview, setFolderIconPreview] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  
  // Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<File | null>(null);
  
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFolderName(initialData.name);
        setFolderCategory(initialData.category);
        setFolderIconPreview(initialData.iconUrl || null);
        setSelectedVideoIds(new Set(initialData.currentVideoIds));
        setFolderIcon(null);
      } else {
        setFolderName('');
        setFolderCategory(DEFAULT_CATEGORIES[0]);
        setFolderIconPreview(null);
        setSelectedVideoIds(new Set());
        setFolderIcon(null);
      }
      setVideoSearchTerm('');
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingIcon(file);
      setIsCropperOpen(true);
      e.target.value = '';
    }
  };

  const handleIconCropComplete = (croppedBlob: Blob) => {
    setFolderIcon(croppedBlob);
    setFolderIconPreview(URL.createObjectURL(croppedBlob));
  };

  const toggleVideoSelection = (id: string) => {
    const next = new Set(selectedVideoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedVideoIds(next);
  };

  const handleFinish = () => {
    if (!folderName.trim()) {
      alert("Please enter a folder name");
      return;
    }
    
    if (mode === 'create' && selectedVideoIds.size === 0) {
      if (!confirm("Create folder without videos?")) return;
    }

    onSave(folderName, folderCategory, folderIcon, Array.from(selectedVideoIds));
    onClose();
  };

  const filteredVideos = allVideos.filter(v => v.title.toLowerCase().includes(videoSearchTerm.toLowerCase()));
  const allCategories = [...DEFAULT_CATEGORIES, ...(customCategories || [])];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-yt-black w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">
              {mode === 'create' ? 'Create Custom Folder' : 'Edit Folder'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
              {/* Icon Upload */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  onClick={() => iconInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-yt-dark border-2 border-dashed border-gray-600 hover:border-white flex items-center justify-center cursor-pointer overflow-hidden group transition-colors"
                >
                  {folderIconPreview ? (
                    <img src={folderIconPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-white" />
                  )}
                </div>
                <span className="text-xs text-gray-500">Folder Icon</span>
                <input type="file" ref={iconInputRef} onChange={handleIconSelect} className="hidden" accept="image/*" />
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Folder Name</label>
                  <input 
                    type="text" 
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="My Collection"
                    className="w-full bg-yt-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={folderCategory}
                    onChange={(e) => setFolderCategory(e.target.value)}
                    className="w-full bg-yt-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-white/10" />

            {/* 2. Video Selection Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Select Videos</h3>
                <span className="text-sm text-gray-400">{selectedVideoIds.size} selected</span>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search videos to add..."
                  value={videoSearchTerm}
                  onChange={(e) => setVideoSearchTerm(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Video List */}
              <div className="h-64 overflow-y-auto border border-white/10 rounded-xl bg-[#121212]">
                {filteredVideos.map(video => {
                  const isSelected = selectedVideoIds.has(video.id);
                  return (
                    <div 
                      key={video.id}
                      onClick={() => toggleVideoSelection(video.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${isSelected ? 'bg-yt-dark' : 'hover:bg-yt-dark/50'}`}
                    >
                      {/* Checkbox */}
                      <div className={`shrink-0 ${isSelected ? 'text-[var(--yt-brand)]' : 'text-gray-600'}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5 fill-current" /> : <Square className="w-5 h-5" />}
                      </div>

                      {/* Thumbnail */}
                      <div className="w-20 h-12 bg-gray-800 rounded overflow-hidden shrink-0">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">NO THUMB</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>{video.title}</p>
                        <p className="text-xs text-gray-500 truncate">{formatDuration(video.duration)} • {video.channelName}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredVideos.length === 0 && (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No videos found matching "{videoSearchTerm}"
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-yt-black">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleFinish}
              className="px-6 py-2 rounded-full font-bold text-sm text-white transition-colors shadow-lg"
              style={{ backgroundColor: 'var(--yt-brand)' }}
            >
              {mode === 'create' ? 'Create Folder' : 'Save Changes'}
            </button>
          </div>
      </div>

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