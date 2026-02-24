import React, { useState, useRef, useEffect } from 'react';
import { LocalVideo } from '../types';
import { formatDuration, formatTimeAgo, formatBytes } from '../utils/videoUtils';

interface VideoGridProps {
  videos: LocalVideo[];
  onVideoSelect: (video: LocalVideo) => void;
  density?: 'compact' | 'comfortable' | 'spacious';
}

const VideoPreview = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
       vid.play().catch(() => {
         // Autoplay prevented or aborted
       });
    }
    return () => {
      if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        // vid.load() removed to prevent "The fetching process for the media resource was aborted" error
        // which occurs when interrupting Blob URL loading.
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover scale-105 animate-in fade-in duration-300"
    />
  );
};

const getPathDisplay = (path: string) => {
  if (!path) return 'Local Storage';
  const parts = path.split('/');
  const dirs = parts.slice(0, -1);
  
  if (dirs.length === 0) return 'Local Storage';
  
  if (dirs.length <= 3) {
    return dirs.join('\\');
  }
  return '...' + '\\' + dirs.slice(-3).join('\\');
};

interface VideoCardProps {
  video: LocalVideo;
  onVideoSelect: (v: LocalVideo) => void;
  density?: 'compact' | 'comfortable' | 'spacious';
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onVideoSelect, density = 'comfortable' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<number>(0);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Delay preview start to avoid flashing when scrolling quickly
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowPreview(true);
    }, 600);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPreview(false);
    window.clearTimeout(hoverTimeoutRef.current);
  };

  useEffect(() => {
    return () => window.clearTimeout(hoverTimeoutRef.current);
  }, []);

  const isCompact = density === 'compact';
  const isSpacious = density === 'spacious';
  const pathDisplay = getPathDisplay(video.file.webkitRelativePath);

  return (
    <div 
      className={`flex flex-col cursor-pointer group ${isCompact ? 'gap-1.5' : isSpacious ? 'gap-3' : 'gap-2'}`}
      onClick={() => onVideoSelect(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-yt-dark transition-all duration-200">
        
        {/* Static Thumbnail (Visible when not previewing) */}
        <div className={`w-full h-full transition-opacity duration-300 ${showPreview ? 'opacity-0' : 'opacity-100'}`}>
          {video.thumbnailUrl ? (
            <img 
              src={video.thumbnailUrl} 
              alt={video.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
              <span className="text-xs">No Preview</span>
            </div>
          )}
        </div>

        {/* Video Preview (Visible on hover after delay) */}
        {showPreview && <VideoPreview src={video.url} />}
        
        {/* Duration Badge (Hide when preview is playing) */}
        <div className={`absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs font-medium text-white transition-opacity duration-200 ${showPreview ? 'opacity-0' : 'opacity-100'}`}>
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3">
         <div className="flex-shrink-0">
           <div className={`${isCompact ? 'w-7 h-7 text-[10px]' : isSpacious ? 'w-10 h-10 text-sm' : 'w-9 h-9 text-xs'} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold`}>
             {pathDisplay.replace(/^\.\.\.\\/, '').charAt(0).toUpperCase()}
           </div>
         </div>
         <div className="flex flex-col min-w-0">
           <h3 className={`text-white font-semibold line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors ${isCompact ? 'text-xs' : isSpacious ? 'text-base' : 'text-sm'}`}>
             {video.title}
           </h3>
           <p className={`text-yt-gray mt-1 hover:text-white transition-colors truncate ${isCompact ? 'text-[10px]' : 'text-xs'}`} title={pathDisplay}>
             {pathDisplay} • {formatBytes(video.size)}
           </p>
           {!isCompact && (
             <p className="text-yt-gray text-xs">
               {formatTimeAgo(video.lastModified)}
             </p>
           )}
         </div>
      </div>
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({ videos, onVideoSelect, density = 'comfortable' }) => {
  // Determine grid class based on density level
  let gridClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"; // Comfortable (Default)
  let gapClass = "gap-x-4 gap-y-8";

  if (density === 'compact') {
    gridClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
    gapClass = "gap-x-3 gap-y-6";
  } else if (density === 'spacious') {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4";
    gapClass = "gap-x-6 gap-y-12";
  }

  return (
    <div className={`pt-6 px-4 pb-20 grid transition-all duration-200 ${gridClass} ${gapClass}`}>
      {videos.map((video) => (
        <VideoCard 
          key={video.id} 
          video={video} 
          onVideoSelect={onVideoSelect} 
          density={density as 'compact' | 'comfortable' | 'spacious'}
        />
      ))}
    </div>
  );
};