import React, { useRef, useState, useEffect } from 'react';
import { Menu, Search, Mic, Video, Bell, Upload, Fish, User, FileVideo, FolderPlus } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resetHome: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => void;
  onPickFolder: () => void;
  isUploadLimitReached: boolean;
  userProfile?: UserProfile;
  enableGradient?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  searchTerm, 
  onSearchChange, 
  resetHome, 
  onUpload, 
  onPickFolder,
  isUploadLimitReached, 
  userProfile,
  enableGradient
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleUploadClick = () => {
    if (isUploadLimitReached) {
      alert("Please wait for current uploads to finish (Max 3 concurrent).");
      return;
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleFileSelect = (type: 'file' | 'folder') => {
      setIsDropdownOpen(false);
      if (type === 'file') {
        fileInputRef.current?.click();
      } else {
        onPickFolder();
      }
  }

  const displayName = userProfile?.name || 'V';
  const avatarUrl = userProfile?.avatarDataUrl;

  const headerBg = enableGradient 
    ? 'bg-black/30 backdrop-blur-2xl border-white/10 shadow-sm' 
    : 'bg-yt-black border-yt-dark';
    
  const searchBg = enableGradient
    ? 'bg-black/20 backdrop-blur-md border-white/10 focus:bg-black/40 shadow-inner'
    : 'bg-[#121212] border-yt-dark';

  const buttonClass = enableGradient
    ? 'bg-white/5 backdrop-blur-lg border border-white/10 shadow-sm hover:bg-white/15 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 text-white'
    : 'hover:bg-yt-dark';

  const dropdownClass = enableGradient
    ? 'bg-black/60 backdrop-blur-3xl border-white/10 shadow-2xl'
    : 'bg-yt-dark border-gray-700';

  return (
    <header className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 border-b transition-all duration-700 ${headerBg}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className={`p-2 rounded-full transition-all ${buttonClass}`}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        <div 
          onClick={resetHome}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="bg-white p-1 rounded-lg">
             <Fish className="w-5 h-5 text-black fill-current" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-white font-sans leading-none">
              BlackCod
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide leading-none">
              BY VCHS STUDIOS
            </span>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-1 max-w-2xl mx-4 items-center">
        <div className="flex flex-1">
          <input
            type="text"
            placeholder="Search your library"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full border text-white px-4 py-2 rounded-l-full focus:outline-none focus:border-blue-500 transition-colors ${searchBg} placeholder-gray-500`}
          />
          <button className={`px-5 py-2 rounded-r-full border border-l-0 transition-colors ${enableGradient ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-inner' : 'bg-yt-dark border-yt-dark hover:bg-[#3f3f3f]'}`}>
            <Search className="w-5 h-5 text-white" />
          </button>
        </div>
        <button className={`ml-4 p-2 rounded-full transition-all ${enableGradient ? buttonClass : 'bg-[#181818] hover:bg-yt-dark'}`}>
          <Mic className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleUploadClick}
            className={`p-2 rounded-full transition-all ${buttonClass} ${isUploadLimitReached ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'text-white'} ${isDropdownOpen ? (enableGradient ? 'bg-white/20' : 'bg-yt-dark') : ''}`}
            title={isUploadLimitReached ? "Upload limit reached" : "Upload Video or Folder"}
          >
            <Upload className="w-6 h-6" />
          </button>
          
          {isDropdownOpen && !isUploadLimitReached && (
             <div className={`absolute right-0 top-full mt-2 w-56 border rounded-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ${dropdownClass}`}>
                <button 
                    onClick={() => handleFileSelect('file')}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                    <FileVideo className="w-5 h-5 text-red-500" />
                    <div>
                        <span className="block text-sm font-bold text-white">Upload Files</span>
                        <span className="block text-xs text-gray-400">Videos & Metadata (.json)</span>
                    </div>
                </button>
                <div className={`h-px my-1 mx-2 ${enableGradient ? 'bg-white/10' : 'bg-gray-700'}`} />
                <button 
                    onClick={() => handleFileSelect('folder')}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                    <FolderPlus className="w-5 h-5 text-blue-400" />
                     <div>
                        <span className="block text-sm font-bold text-white">Upload Folder</span>
                        <span className="block text-xs text-gray-400">Import directory contents</span>
                    </div>
                </button>
             </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => onUpload(e, false)} 
            className="hidden" 
            accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.mp4,.m4v,.3gp,.ts,.webm,.ogv,.json"
            multiple 
          />
        </div>

        <button className={`p-2 rounded-full transition-all hidden sm:block ${buttonClass}`}>
          <Bell className="w-6 h-6 text-white" />
        </button>
        <button className={`p-2 rounded-full transition-all ${buttonClass}`} title={userProfile?.name}>
          {avatarUrl ? (
             <img src={avatarUrl} alt="User" className="w-8 h-8 rounded-full object-cover border border-white/20" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-black border border-white/20 rounded-full flex items-center justify-center text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};