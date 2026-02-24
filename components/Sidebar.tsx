import React from 'react';
import { Home, Compass, FolderOpen, Clock, ThumbsUp, Library, Settings, Loader2, Film } from 'lucide-react';
import { ViewState, UploadJob } from '../types';

interface SidebarProps {
  isOpen: boolean;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  uploadQueue: UploadJob[];
  enableGradient?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentView, onNavigate, uploadQueue, enableGradient, density = 'comfortable' }) => {
  const items = [
    { icon: Home, label: 'Home', id: 'home' as ViewState },
    { icon: Film, label: 'All Videos', id: 'all_videos' as ViewState },
    { icon: FolderOpen, label: 'Folders', id: 'folders' as ViewState }, 
    { divider: true },
    { icon: Library, label: 'Library', id: 'library' as ViewState },
    { icon: Clock, label: 'History', id: 'history' as ViewState },
    { icon: ThumbsUp, label: 'Liked Videos', id: 'liked' as ViewState },
  ];

  // Styles
  const sidebarBg = enableGradient
    ? 'bg-black/30 backdrop-blur-2xl border-white/10'
    : 'bg-yt-black border-yt-dark';

  const activeItemClass = enableGradient
    ? 'bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg text-white'
    : 'bg-yt-dark font-medium text-white';

  const hoverItemClass = enableGradient
    ? 'hover:bg-white/5'
    : 'hover:bg-yt-dark';

  const dividerClass = enableGradient ? 'border-white/10' : 'border-yt-dark';

  const popupClass = enableGradient
    ? 'bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl'
    : 'bg-yt-dark border border-white/10';

  // Density adjustments
  const itemPadding = density === 'compact' ? 'py-1.5' : density === 'spacious' ? 'py-3.5' : 'py-2.5';
  const miniItemPadding = density === 'compact' ? 'py-2' : density === 'spacious' ? 'py-6' : 'py-4';

  const renderItem = (item: any, idx: number) => (
    <div 
      key={idx}
      onClick={() => !item.disabled && onNavigate(item.id)}
      className={`flex items-center px-3 ${itemPadding} rounded-lg cursor-pointer mb-1 transition-all ${currentView === item.id ? activeItemClass : hoverItemClass} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {item.icon && <item.icon className={`w-6 h-6 mr-5 ${currentView === item.id ? 'text-white fill-current' : 'text-white'}`} />}
      <span className={`text-sm ${currentView === item.id ? 'text-white' : 'text-yt-text'}`}>{item.label}</span>
    </div>
  );

  const renderMiniItem = (item: any, idx: number) => (
    <div 
      key={idx} 
      onClick={() => !item.disabled && onNavigate(item.id)}
      className={`flex flex-col items-center justify-center ${miniItemPadding} px-1 rounded-lg cursor-pointer mx-1 transition-all ${item.id === currentView ? (enableGradient ? 'bg-white/10 border border-white/20 shadow-lg backdrop-blur-lg' : 'bg-yt-dark') : hoverItemClass} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {item.icon && <item.icon className="w-6 h-6 mb-1 text-white" />}
      <span className="text-[10px] text-yt-text text-center truncate w-full">{item.label}</span>
    </div>
  );

  const renderProgress = () => {
    if (uploadQueue.length === 0) return null;

    const totalFiles = uploadQueue.reduce((acc, job) => acc + job.total, 0);
    const totalCurrent = uploadQueue.reduce((acc, job) => acc + job.current, 0);
    const percentage = totalFiles > 0 ? (totalCurrent / totalFiles) * 100 : 0;
    
    // Mini Sidebar Progress (Circular Theme-aware)
    if (!isOpen) {
       const radius = 16;
       const circumference = 2 * Math.PI * radius;
       const offset = circumference - (percentage / 100) * circumference;

       return (
         <div className="mx-2 mb-4 flex justify-center relative group">
            <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      stroke={enableGradient ? "rgba(255,255,255,0.1)" : "#333"}
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      stroke="var(--yt-brand)"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-[var(--yt-brand)] animate-spin" />
                </div>
            </div>
            
            {/* Tooltip for mini mode */}
            <div className={`absolute left-full top-0 ml-4 p-3 rounded-xl shadow-xl z-50 w-48 ${popupClass}`}>
               <h4 className="text-xs font-bold text-white mb-1">Processing...</h4>
               <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[var(--yt-brand)]" style={{ width: `${percentage}%` }} />
               </div>
               <p className="text-[10px] text-gray-400">{totalCurrent} / {totalFiles} files</p>
            </div>
         </div>
       );
    }

    // Expanded Sidebar Progress
    return (
      <div className={`mx-2 mb-2 p-3 rounded-xl shadow-lg relative group ${enableGradient ? 'bg-black/20 border border-white/10 backdrop-blur-md' : 'bg-[#1e1e1e] border border-blue-500/30'}`}>
        
        {/* Main Status */}
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--yt-brand)]" />
          <div className="flex-1 min-w-0">
             <p className="text-xs font-bold text-white truncate">
               Processing {uploadQueue.length} {uploadQueue.length === 1 ? 'item' : 'items'}...
             </p>
             <p className="text-[10px] text-gray-400">{totalCurrent} / {totalFiles} files</p>
          </div>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: 'var(--yt-brand)'
            }}
          />
        </div>

        {/* Hover Detail Popup */}
        <div className={`absolute bottom-full left-0 w-full p-3 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 rounded-xl ${popupClass}`}>
          <h4 className="text-xs font-bold text-white mb-2 pb-2 border-b border-white/10">Active Uploads</h4>
          <div className="space-y-3">
            {uploadQueue.map((job) => (
              <div key={job.id}>
                <div className="flex justify-between text-[10px] text-gray-300 mb-1">
                  <span className="truncate max-w-[70%]">{job.name}</span>
                  <span>{Math.round((job.current / job.total) * 100)}%</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                   <div 
                     className="h-full transition-all duration-300"
                     style={{ 
                        width: `${(job.current / job.total) * 100}%`,
                        backgroundColor: 'var(--yt-brand)'
                     }}
                   />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  if (!isOpen) {
    // Mini Sidebar
    return (
      <aside className={`hidden sm:flex flex-col w-[72px] fixed top-14 left-0 bottom-0 z-40 pt-2 pb-4 overflow-y-auto overflow-x-hidden scrollbar-hide border-r transition-colors duration-700 ${sidebarBg}`}>
         {items.filter(i => !i.divider).slice(0, 4).map(renderMiniItem)}
         <div className="mt-auto pb-4 flex flex-col items-center gap-2">
            {renderProgress()}
            {renderMiniItem({ icon: Settings, label: 'Settings', id: 'settings' }, 99)}
         </div>
      </aside>
    );
  }

  // Full Sidebar
  return (
    <aside className={`w-60 fixed top-14 left-0 bottom-0 z-40 flex flex-col border-r transition-colors duration-700 ${sidebarBg}`}>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        {items.map((item, idx) => (
          item.divider ? (
            <hr key={idx} className={`my-3 ${dividerClass}`} />
          ) : renderItem(item, idx)
        ))}
        <hr className={`my-3 ${dividerClass}`} />
        <div className="px-4 py-2">
          <p className="text-sm font-semibold text-yt-text">BlackCod Files</p>
          <p className="text-xs text-yt-gray mt-1">Managed by VCHS Studios</p>
        </div>
      </div>
      
      {/* Bottom Progress & Settings Section */}
      <div className={`p-2 border-t ${dividerClass} ${enableGradient ? 'bg-transparent' : 'bg-yt-black'}`}>
        {renderProgress()}
        <div className="mt-1">
          {renderItem({ icon: Settings, label: 'Settings', id: 'settings' }, 99)}
        </div>
      </div>
    </aside>
  );
};