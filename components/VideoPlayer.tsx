import React, { useState, useRef } from 'react';
import { LocalVideo, ChannelConfig } from '../types';
import { ThumbsUp, ThumbsDown, Share2, Download, Edit2, Star, Check } from 'lucide-react';
import { formatDuration, formatTimeAgo, formatBytes } from '../utils/videoUtils';
import { ThumbnailEditor } from './ThumbnailEditor';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface VideoPlayerProps {
  video: LocalVideo;
  channelConfig?: ChannelConfig;
  suggestedVideos: LocalVideo[];
  onVideoSelect: (video: LocalVideo) => void;
  isLiked: boolean;
  rating: number; // 0 if not rated
  onToggleLike: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onUpdateThumbnail: (id: string, url: string) => void;
  onUpdateVideo?: (id: string, updates: Partial<LocalVideo>) => void; // New prop for self-repair
  onChannelClick: (channelName: string) => void;
  onRemoveVideo: (id: string) => void;
  onRenameVideo: (id: string, newTitle: string) => void;
  onToggleMiniPlayer?: () => void;
  onTimeUpdate?: (time: number) => void; // New Prop for time tracking bubbling
  enableGradient?: boolean;
  autoplay?: boolean;
  startTime?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  video, channelConfig, suggestedVideos, onVideoSelect, isLiked, rating, onToggleLike, onRate, onUpdateThumbnail, onUpdateVideo, onChannelClick, onRemoveVideo, onRenameVideo, onToggleMiniPlayer, onTimeUpdate, enableGradient, autoplay = true, startTime = 0
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'sharing' | 'copied'>('idle');

  // Ref to track time for sync if needed, though mostly handled by CustomVideoPlayer props in App
  const lastTimeRef = useRef(0);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    // Self-Repair Logic
    const target = e.currentTarget;
    const realDuration = target.duration;
    
    if (Number.isFinite(realDuration) && realDuration > 0) {
       const needsDurationUpdate = !video.duration || video.duration === 0 || Math.abs(video.duration - realDuration) > 1;
       const needsThumbUpdate = !video.thumbnailUrl;

       if ((needsDurationUpdate || needsThumbUpdate) && onUpdateVideo) {
         const updates: Partial<LocalVideo> = {};
         
         if (needsDurationUpdate) {
            updates.duration = realDuration;
         }

         if (needsThumbUpdate) {
            // Try to capture a thumbnail from the player itself if missing
            try {
               const canvas = document.createElement('canvas');
               canvas.width = 480;
               canvas.height = 270;
               const ctx = canvas.getContext('2d');
               if (ctx) {
                  ctx.drawImage(target, 0, 0, canvas.width, canvas.height);
                  updates.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
                  if (updates.thumbnailUrl) {
                      onUpdateThumbnail(video.id, updates.thumbnailUrl);
                  }
               }
            } catch (err) {
               console.error("Failed to self-repair thumbnail", err);
            }
         }

         if (Object.keys(updates).length > 0) {
            onUpdateVideo(video.id, updates);
         }
       }
    }
  };

  const handleTimeUpdateWrapper = (time: number) => {
    lastTimeRef.current = time;
    if (onTimeUpdate) {
      onTimeUpdate(time);
    }
  };

  const handleShare = async () => {
    // 1. Try Native Web Share API with File
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [video.file] })) {
      try {
        setShareFeedback('sharing');
        await navigator.share({
          files: [video.file],
          title: video.title,
          text: `Check out "${video.title}" on BlackCod.`
        });
        setShareFeedback('idle');
        return;
      } catch (error) {
        console.log('File share failed or cancelled, trying fallback text share');
      }
    }

    // 2. Try Native Web Share API with Text only (if file too big or not supported)
    if (navigator.share) {
      try {
        await navigator.share({
           title: video.title,
           text: `Check out "${video.title}" on BlackCod.`
        });
        setShareFeedback('idle');
        return;
      } catch (error) {
         console.log('Text share failed or cancelled');
      }
    }

    // 3. Fallback: Copy Title to Clipboard
    try {
      await navigator.clipboard.writeText(video.title);
      setShareFeedback('copied');
      setTimeout(() => setShareFeedback('idle'), 2000);
    } catch (err) {
      alert(`Share: ${video.title}`);
    }
  };

  const btn3d = enableGradient
    ? "bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg hover:bg-white/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-700 text-white"
    : "bg-yt-dark hover:bg-gray-700 text-yt-text hover:text-white transition-colors duration-700";

  const descBg = enableGradient
    ? "bg-black/30 backdrop-blur-2xl border border-white/10"
    : "bg-yt-dark";

  return (
    <div className="flex flex-col lg:flex-row pt-6 px-4 lg:px-12 gap-6 pb-20">
      {/* Primary Column */}
      <div className="flex-1 min-w-0">
        {/* Video Player Container */}
        <div className={`w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ${enableGradient ? 'ring-white/20' : 'ring-white/10'} group relative`}>
          <CustomVideoPlayer 
            key={video.id}
            src={video.url}
            poster={video.thumbnailUrl || undefined}
            autoPlay={autoplay}
            startTime={startTime}
            onLoadedMetadata={handleLoadedMetadata}
            enableGradient={enableGradient}
            title={video.title}
            onToggleMiniPlayer={onToggleMiniPlayer}
            onTimeUpdate={handleTimeUpdateWrapper}
          />
        </div>

        {/* Video Info */}
        <div className="mt-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 group">
               <h1 className="text-xl font-bold text-white line-clamp-2 flex items-center gap-3">
                 {video.title}
               </h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setIsEditorOpen(true)}
                className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${btn3d}`}
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => onChannelClick(video.channelName)}>
              {channelConfig?.iconUrl ? (
                <img src={channelConfig.iconUrl} alt={video.channelName} className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg border border-white/10">
                  {video.channelName.substring(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-white font-semibold hover:text-gray-300">{channelConfig?.displayName || video.channelName}</h3>
                <p className="text-yt-gray text-xs">{channelConfig?.category || 'Uncategorized'}</p>
              </div>
              <button className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-700 ml-4 ${channelConfig?.isSubscribed ? (enableGradient ? 'bg-white/10 border border-white/20 text-white shadow-inner backdrop-blur-md' : 'bg-yt-dark text-white') : (enableGradient ? 'bg-white text-black hover:bg-white/90 shadow-lg' : 'bg-white text-black hover:bg-gray-200')}`}>
                {channelConfig?.isSubscribed ? 'Saved' : 'Save to Library'}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
               <div className={`flex items-center rounded-full h-9 transition-all duration-700 ${enableGradient ? 'bg-white/5 border border-white/10 backdrop-blur-md' : 'bg-yt-dark'}`}>
                 <button 
                   onClick={() => onToggleLike(video.id)}
                   className={`flex items-center gap-2 px-4 rounded-l-full h-full border-r ${enableGradient ? 'border-white/10 hover:bg-white/10' : 'border-[#3f3f3f] hover:bg-[#3f3f3f]'} transition-colors ${isLiked ? 'text-blue-400' : 'text-white'}`}
                 >
                   <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                   <span className="text-sm font-medium">{isLiked ? 'Liked' : 'Like'}</span>
                 </button>
                 <button className={`px-4 rounded-r-full h-full transition-colors ${enableGradient ? 'hover:bg-white/10' : 'hover:bg-[#3f3f3f]'}`}>
                   <ThumbsDown className="w-4 h-4 text-white" />
                 </button>
               </div>
               
               <button 
                  onClick={handleShare}
                  className={`flex items-center gap-2 px-4 h-9 rounded-full ${btn3d}`}
                  title={navigator.canShare?.({ files: [video.file] }) ? "Share video file" : "Copy title"}
               >
                 {shareFeedback === 'copied' ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                 <span className="text-sm font-medium">
                    {shareFeedback === 'sharing' ? 'Sharing...' : shareFeedback === 'copied' ? 'Copied' : 'Share'}
                 </span>
               </button>

               <button className={`flex items-center gap-2 px-4 h-9 rounded-full ${btn3d}`}>
                 <Download className="w-4 h-4" />
                 <span className="text-sm font-medium">Download</span>
               </button>
            </div>
          </div>

          {/* Description Box */}
          <div className={`mt-4 rounded-xl p-3 text-sm transition-all duration-700 cursor-pointer group hover:brightness-110 ${descBg}`}>
             <div className="flex gap-2 font-medium text-white mb-1">
               <span>{formatDuration(video.duration)} long</span>
               <span>•</span>
               <span>{formatTimeAgo(video.lastModified)}</span>
             </div>
             <p className="text-white whitespace-pre-wrap">
               Channel: {video.channelName}<br/>
               Filename: {video.file.name}<br/>
               File Size: {formatBytes(video.size)}<br/>
               <span className="text-yt-gray group-hover:text-white transition-colors">Show more</span>
             </p>
          </div>
          
          {/* Rating Section (Replaces Comments) */}
          <div className="mt-6">
             <h3 className="text-xl font-bold text-white mb-4">Rate this video</h3>
             <div className="flex items-center gap-2 mb-6">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button 
                   key={star}
                   onClick={() => onRate(video.id, star === rating ? 0 : star)}
                   className="p-1 hover:scale-110 transition-transform focus:outline-none"
                 >
                   <Star 
                     className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current drop-shadow-lg' : 'text-gray-600'}`} 
                   />
                 </button>
               ))}
               <span className="ml-2 text-sm text-gray-400">
                 {rating > 0 ? `You rated this ${rating} stars` : 'Tap a star to rate'}
               </span>
             </div>
          </div>
        </div>
      </div>

      {/* Suggested Videos Column */}
      <div className="w-full lg:w-[350px] xl:w-[400px] flex flex-col gap-2">
        <h3 className="text-lg font-bold mb-2">Up Next</h3>
        {suggestedVideos.filter(v => v.id !== video.id).map(suggestion => (
          <div 
            key={suggestion.id} 
            className="flex gap-2 cursor-pointer group"
            onClick={() => onVideoSelect(suggestion)}
          >
             <div className="relative w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-yt-dark shadow-md border border-white/5">
                {suggestion.thumbnailUrl ? (
                  <img src={suggestion.thumbnailUrl} alt={suggestion.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-[10px]">No Preview</div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-medium text-white backdrop-blur-sm">
                  {formatDuration(suggestion.duration)}
                </div>
             </div>
             <div className="flex flex-col">
               <h4 className="text-sm font-semibold text-white line-clamp-2 leading-tight mb-1 group-hover:text-blue-400 transition-colors shadow-black drop-shadow-sm">
                 {suggestion.title}
               </h4>
               <p className="text-xs text-yt-gray">{suggestion.channelName}</p>
               <div className="flex items-center gap-1 text-xs text-yt-gray">
                 <span>New</span>
                 <span>•</span>
                 <span>{formatTimeAgo(suggestion.lastModified)}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      <ThumbnailEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        videoFile={video.file}
        duration={video.duration}
        onSave={(url) => onUpdateThumbnail(video.id, url)}
        currentTitle={video.title}
        onRename={(newTitle) => onRenameVideo(video.id, newTitle)}
        onDelete={() => onRemoveVideo(video.id)}
      />
    </div>
  );
};