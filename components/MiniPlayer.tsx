import React, { useRef, useEffect, useState } from 'react';
import { X, Maximize2, Grip } from 'lucide-react';
import { LocalVideo } from '../types';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface MiniPlayerProps {
  video: LocalVideo;
  currentTime: number;
  onClose: () => void;
  onExpand: () => void;
  onTimeUpdate: (time: number) => void;
  enableGradient?: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ 
  video, currentTime, onClose, onExpand, onTimeUpdate, enableGradient 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // Size State (Default 320 width, height calculated by ratio)
  const [size, setSize] = useState({ width: 320, height: 180 });
  
  // Drag State
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 210 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      const ratio = v.videoWidth / v.videoHeight;
      setAspectRatio(ratio);
      // Adjust height based on current width and new ratio
      // Ensure we don't accidentally make it too huge or small immediately, but 320 width is safe anchor
      setSize(prev => ({ ...prev, height: prev.width / ratio }));
    }
  };

  // Snap to corner logic
  const snapToCorner = (currentX: number, currentY: number, currentW: number, currentH: number) => {
    const margin = 20;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    // Define corners
    const corners = [
      { x: margin, y: margin }, // Top-Left
      { x: windowW - currentW - margin, y: margin }, // Top-Right
      { x: margin, y: windowH - currentH - margin }, // Bottom-Left
      { x: windowW - currentW - margin, y: windowH - currentH - margin } // Bottom-Right
    ];

    // Find closest
    let closest = corners[0];
    let minDist = Infinity;

    corners.forEach(c => {
      const dist = Math.hypot(c.x - currentX, c.y - currentY);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    });

    setPosition(closest);
  };

  // Dragging Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setPosition({ x: newX, y: newY });
      setHasMoved(true);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Snap after drag ends
        snapToCorner(position.x, position.y, size.width, size.height);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, size]);

  // Resizing Effect
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - resizeStart.x;
      // Use dynamic aspect ratio
      const newWidth = Math.max(200, Math.min(800, resizeStart.w + deltaX));
      const newHeight = newWidth / aspectRatio;

      setSize({ width: newWidth, height: newHeight });
    };

    const handleResizeUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Re-snap to ensure it stays on screen if resizing pushed it out
        snapToCorner(position.x, position.y, size.width, size.height);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };
  }, [isResizing, resizeStart, position, size, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking the header bar or non-interactive areas
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsDragging(true);
        setHasMoved(false);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ 
      x: e.clientX, 
      y: e.clientY, 
      w: size.width, 
      h: size.height 
    });
  };

  const handleContainerClick = () => {
    if (!hasMoved && !isResizing) {
      onExpand();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed z-[100] shadow-2xl rounded-xl overflow-hidden transition-all duration-300 ease-out border border-white/10 group select-none ${isDragging ? 'scale-105 cursor-grabbing' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: '#000',
        touchAction: 'none'
      }}
    >
       {/* Drag Overlay (Transparent) */}
       <div 
         className={`absolute inset-0 z-20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
         onMouseDown={handleMouseDown}
         onClick={handleContainerClick}
       />

       {/* Close / Expand Controls (Visible on Hover) */}
       <div className="absolute top-0 left-0 right-0 p-2 z-30 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <button 
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="p-1.5 bg-black/60 rounded-full text-white hover:bg-white hover:text-black transition-colors pointer-events-auto"
            title="Expand"
          >
             <Maximize2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors pointer-events-auto"
            title="Close"
          >
             <X className="w-4 h-4" />
          </button>
       </div>

       {/* Video Player */}
       <div className="w-full h-full pointer-events-none">
          <CustomVideoPlayer 
            src={video.url} 
            poster={video.thumbnailUrl || undefined}
            autoPlay={true}
            startTime={currentTime}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={handleMetadata}
            enableGradient={enableGradient}
            isMiniMode={true}
          />
       </div>

       {/* Title Bar (Bottom) */}
       <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none pr-8">
          <p className="text-white text-xs font-bold truncate">{video.title}</p>
          <p className="text-gray-400 text-[10px] truncate">{video.channelName}</p>
       </div>

       {/* Resize Handle (Bottom Right) */}
       <div 
         className="absolute bottom-0 right-0 w-6 h-6 z-40 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
         onMouseDown={handleResizeStart}
       >
          <Grip className="w-4 h-4 text-white/50 rotate-45" />
       </div>
    </div>
  );
};