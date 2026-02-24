import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Captions, ChevronRight, ChevronLeft, FastForward, Rewind, Check, PictureInPicture
} from 'lucide-react';
import { formatDuration } from '../utils/videoUtils';
import { LoadingAnimation } from './LoadingAnimation';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  startTime?: number;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onToggleMiniPlayer?: () => void;
  enableGradient?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  title?: string;
  isMiniMode?: boolean;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  src, poster, autoPlay = false, startTime = 0, onEnded, onTimeUpdate, onLoadedMetadata, onToggleMiniPlayer, enableGradient = false, title, isMiniMode = false
}) => {
  const innerVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Smart Seek State
  const [pendingSeek, setPendingSeek] = useState(0);
  const seekTimeoutRef = useRef<number>(0);
  
  // Settings Menu State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'speed' | 'quality'>('main');
  const [qualityLabel, setQualityLabel] = useState('Source');

  const controlsTimeoutRef = useRef<number>(0);

  // Set initial time if provided
  useEffect(() => {
    if (innerVideoRef.current && startTime > 0 && Math.abs(innerVideoRef.current.currentTime - startTime) > 1) {
      innerVideoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  // Styles based on mode
  const theme = {
    // Gradient Mode: Floating Pill, Standard: Full width gradient fade
    controlBar: enableGradient 
      ? "bottom-4 left-4 right-4 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" 
      : "bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent",
    progressBarBg: enableGradient ? "bg-white/20" : "bg-white/30",
    progressBarFill: enableGradient ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" : "bg-[var(--yt-brand)]",
    iconColor: "text-white hover:scale-110 transition-transform",
    menuBg: enableGradient 
      ? "bg-black/60 backdrop-blur-2xl border border-white/10 text-white" 
      : "bg-[#1e1e1e]/95 text-white border border-gray-700",
    activeItem: enableGradient ? "bg-white/20" : "bg-white/10"
  };

  // --- Smart Seek Logic ---

  const handleSmartSeek = (seconds: number) => {
    if (seekTimeoutRef.current) {
      window.clearTimeout(seekTimeoutRef.current);
    }
    setPendingSeek(prev => prev + seconds);
    seekTimeoutRef.current = window.setTimeout(() => {
      // Logic handled by pendingSeekRef in triggerSeekAccumulation mostly
    }, 800);
  };

  // We actually need a Ref to track the accumulation for the Timeout execution context
  const pendingSeekRef = useRef(0);

  const triggerSeekAccumulation = (seconds: number) => {
     window.clearTimeout(seekTimeoutRef.current);
     
     // Update both Ref (for logic) and State (for UI)
     pendingSeekRef.current += seconds;
     setPendingSeek(pendingSeekRef.current);

     seekTimeoutRef.current = window.setTimeout(() => {
        if (innerVideoRef.current) {
           innerVideoRef.current.currentTime += pendingSeekRef.current;
        }
        // Reset
        pendingSeekRef.current = 0;
        setPendingSeek(0);
     }, 600); // 600ms wait time
  };

  // --- Event Handlers ---

  const togglePlay = useCallback(() => {
    if (innerVideoRef.current) {
      if (innerVideoRef.current.paused) {
        innerVideoRef.current.play();
        setIsPlaying(true);
      } else {
        innerVideoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const handleTimeUpdate = () => {
    if (innerVideoRef.current) {
      const curr = innerVideoRef.current.currentTime;
      setCurrentTime(curr);
      if (onTimeUpdate) onTimeUpdate(curr);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (innerVideoRef.current) {
      innerVideoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (innerVideoRef.current) {
      innerVideoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (innerVideoRef.current) {
      const newMuted = !isMuted;
      innerVideoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) setVolume(0);
      else setVolume(1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const changeSpeed = (rate: number) => {
    if (innerVideoRef.current) {
      innerVideoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setActiveMenu('main'); 
    }
  };

  // --- Effects ---

  useEffect(() => {
    const video = innerVideoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWait = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsLoading(false);
    };
    const onLoadedMeta = (e: any) => {
      setIsLoading(false);
      setDuration(video.duration);
      if (video.videoHeight) {
         setQualityLabel(`${video.videoHeight}p`);
      }
      if (onLoadedMetadata) onLoadedMetadata(e);
      // Ensure we jump to start time if set
      if (startTime > 0 && Math.abs(video.currentTime - startTime) > 1) {
         video.currentTime = startTime;
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWait);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('loadedmetadata', onLoadedMeta);

    if (autoPlay) {
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWait);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, [src, autoPlay, onLoadedMetadata]);

  // Keybinds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMiniMode) return; // Disable keybinds in mini mode
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'i':
          if (onToggleMiniPlayer) onToggleMiniPlayer();
          break;
        case 'arrowright':
          e.preventDefault();
          triggerSeekAccumulation(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          triggerSeekAccumulation(-10);
          break;
        case 'l':
          triggerSeekAccumulation(10);
          break;
        case 'j':
          triggerSeekAccumulation(-10);
          break;
        case 'm':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, isMiniMode, onToggleMiniPlayer]);

  // --- Render Functions ---

  const renderSeekOverlay = () => {
     if (pendingSeek === 0) return null;

     const isForward = pendingSeek > 0;
     const absSeconds = Math.abs(pendingSeek);
     
     // Base container
     const baseClass = "absolute top-0 bottom-0 w-1/2 z-20 flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in duration-200";
     
     // Dynamic Styles based on mode and direction
     let styleClass = "";
     let maskImageStyle = {};

     if (enableGradient) {
        // Gradient Mode: Frosted Glass that Fades to Transparent using Mask Image
        if (isForward) {
           styleClass = "right-0 bg-white/10 backdrop-blur-2xl";
           maskImageStyle = {
             WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)',
             maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)'
           };
        } else {
           styleClass = "left-0 bg-white/10 backdrop-blur-2xl";
           maskImageStyle = {
             WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)',
             maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)'
           };
        }
     } else {
        // Normal Mode: Dark gradient fading from edge
        if (isForward) {
           styleClass = "right-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent";
        } else {
           styleClass = "left-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent";
        }
     }

     return (
        <div 
          className={`${baseClass} ${styleClass}`}
          style={enableGradient ? maskImageStyle : {}}
        >
           <div className="flex flex-col items-center animate-pulse drop-shadow-md">
                {isForward ? <FastForward className="w-12 h-12" /> : <Rewind className="w-12 h-12" />}
                <span className="font-bold text-lg mt-2">{absSeconds} seconds</span>
                <span className="text-xs uppercase tracking-widest opacity-80">{isForward ? 'Fast Forward' : 'Rewind'}</span>
           </div>
        </div>
     );
  };

  const renderSettingsMenu = () => {
    if (!isSettingsOpen) return null;

    return (
      <div className={`absolute bottom-20 right-0 w-64 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50 ${theme.menuBg}`}>
        
        {/* Main Menu */}
        {activeMenu === 'main' && (
          <div className="py-2">
            <button 
              onClick={() => setActiveMenu('speed')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
               <div className="flex items-center gap-3">
                 <Play className="w-4 h-4" />
                 <span className="text-sm font-medium">Playback Speed</span>
               </div>
               <div className="flex items-center gap-2 text-gray-400">
                 <span className="text-xs">{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
                 <ChevronRight className="w-4 h-4" />
               </div>
            </button>
            <button 
              onClick={() => setActiveMenu('quality')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
               <div className="flex items-center gap-3">
                 <Settings className="w-4 h-4" />
                 <span className="text-sm font-medium">Quality</span>
               </div>
               <div className="flex items-center gap-2 text-gray-400">
                 <span className="text-xs">{qualityLabel}</span>
                 <ChevronRight className="w-4 h-4" />
               </div>
            </button>
          </div>
        )}

        {/* Speed Menu */}
        {activeMenu === 'speed' && (
          <div className="py-2">
             <button 
               onClick={() => setActiveMenu('main')}
               className="w-full px-4 py-2 flex items-center gap-2 border-b border-white/10 mb-1 hover:bg-white/5"
             >
               <ChevronLeft className="w-4 h-4" />
               <span className="text-sm font-bold">Playback Speed</span>
             </button>
             {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
               <button
                 key={rate}
                 onClick={() => changeSpeed(rate)}
                 className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-sm"
               >
                 {playbackRate === rate && <Check className="w-4 h-4 text-[var(--yt-brand)]" />}
                 <span className={playbackRate === rate ? '' : 'ml-7'}>
                   {rate === 1 ? 'Normal' : rate}
                 </span>
               </button>
             ))}
          </div>
        )}

        {/* Quality Menu (Visual Only) */}
        {activeMenu === 'quality' && (
          <div className="py-2">
             <button 
               onClick={() => setActiveMenu('main')}
               className="w-full px-4 py-2 flex items-center gap-2 border-b border-white/10 mb-1 hover:bg-white/5"
             >
               <ChevronLeft className="w-4 h-4" />
               <span className="text-sm font-bold">Quality</span>
             </button>
             <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-sm">
                <Check className="w-4 h-4 text-[var(--yt-brand)]" />
                <span>{qualityLabel} (Source)</span>
             </button>
             <div className="px-4 py-2 text-xs text-gray-500 italic">
               Quality selection is not available for local files.
             </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={() => setIsSettingsOpen(false)}
      onDoubleClick={(e) => {
         const rect = containerRef.current?.getBoundingClientRect();
         if (rect) {
            const x = e.clientX - rect.left;
            if (x < rect.width * 0.3) {
               triggerSeekAccumulation(-10);
            } else if (x > rect.width * 0.7) {
               triggerSeekAccumulation(10);
            } else {
               toggleFullscreen();
            }
         }
      }}
    >
       {/* Video Element */}
       <video
         ref={innerVideoRef}
         src={src}
         poster={poster}
         className="w-full h-full object-contain bg-black"
         onClick={(e) => { e.stopPropagation(); togglePlay(); }}
         onTimeUpdate={handleTimeUpdate}
         onEnded={onEnded}
         playsInline
       />

       {/* Smart Seek Overlay */}
       {renderSeekOverlay()}

       {/* Loading Overlay */}
       {(isLoading || isBuffering) && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
            <LoadingAnimation text={isBuffering ? "Buffering" : "Loading"} size={isMiniMode ? "sm" : "lg"} enableGradient={enableGradient} />
         </div>
       )}

       {/* Play/Pause Overlay Animation (Optional big center icon) */}
       {!isPlaying && !isLoading && !isBuffering && pendingSeek === 0 && !isMiniMode && (
         <div 
           className="absolute inset-0 flex items-center justify-center z-10 bg-black/10 cursor-pointer"
           onClick={togglePlay}
         >
           <div className={`p-6 rounded-full ${enableGradient ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-black/60'}`}>
             <Play className="w-12 h-12 text-white fill-white translate-x-1" />
           </div>
         </div>
       )}

       {/* Title Overlay (Visible on hover) */}
       {title && !isMiniMode && (
         <div className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
           <h2 className="text-white font-bold text-lg drop-shadow-md">{title}</h2>
         </div>
       )}

       {/* Controls Container */}
       <div 
         className={`absolute transition-all duration-300 z-30 ${isMiniMode ? 'bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent' : theme.controlBar} ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
         onClick={(e) => e.stopPropagation()} 
       >
          {/* Progress Bar Container */}
          <div className={`relative w-full group/progress cursor-pointer flex items-center ${isMiniMode ? 'h-1 mb-2' : 'h-1.5 mb-4'}`}>
             {/* Background Track */}
             <div className={`w-full h-full rounded-full ${theme.progressBarBg}`}></div>
             
             {/* Played Track */}
             <div 
               className={`absolute top-0 left-0 h-full rounded-full ${theme.progressBarFill}`}
               style={{ width: `${(currentTime / duration) * 100}%` }}
             >
               {/* Scrubber Knob */}
               {!isMiniMode && (
                 <div className={`absolute right-[-6px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${enableGradient ? 'bg-white shadow-[0_0_10px_white]' : 'bg-[var(--yt-brand)]'} scale-0 group-hover/progress:scale-100 transition-transform`} />
               )}
             </div>

             {/* Input Range (Invisible but functional) */}
             <input 
               type="range" 
               min={0} 
               max={duration || 100} 
               value={currentTime} 
               onChange={handleSeek}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
             />
          </div>

          <div className="flex items-center justify-between">
             {/* Left Controls */}
             <div className="flex items-center gap-4">
               <button onClick={togglePlay} className={theme.iconColor}>
                 {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
               </button>

               {!isMiniMode && (
                 <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className={theme.iconColor}>
                      {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                      <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.05} 
                        value={isMuted ? 0 : volume} 
                        onChange={handleVolumeChange}
                        className="w-20 h-1 accent-white cursor-pointer ml-2"
                      />
                    </div>
                 </div>
               )}

               <div className={`font-medium text-white/90 font-mono tracking-wide ${isMiniMode ? 'text-[10px]' : 'text-xs md:text-sm'}`}>
                 {formatDuration(currentTime)} / {formatDuration(duration)}
               </div>
             </div>

             {/* Right Controls */}
             {!isMiniMode && (
               <div className="flex items-center gap-4 relative">
                  {onToggleMiniPlayer && (
                    <button onClick={onToggleMiniPlayer} className={theme.iconColor} title="Miniplayer (i)">
                      <PictureInPicture className="w-5 h-5" />
                    </button>
                  )}

                  <button className={`${theme.iconColor} opacity-70 hover:opacity-100`} title="Closed Captions (Unavailable)">
                     <Captions className="w-5 h-5" />
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); setActiveMenu('main'); }} 
                      className={`${theme.iconColor} ${isSettingsOpen ? 'rotate-90' : ''} transition-transform`}
                    >
                       <Settings className="w-5 h-5" />
                    </button>
                    {renderSettingsMenu()}
                  </div>

                  <button onClick={toggleFullscreen} className={theme.iconColor}>
                     {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                  </button>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};