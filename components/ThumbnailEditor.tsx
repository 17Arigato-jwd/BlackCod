import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, Save, Fish, Loader2, RefreshCcw, Trash2, Check } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

interface ThumbnailEditorProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  duration: number;
  onSave: (newThumbnail: string) => void;
  currentTitle?: string;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}

export const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({ 
  isOpen, onClose, videoFile, duration, onSave, currentTitle, onRename, onDelete
}) => {
  const [mode, setMode] = useState<'timestamp' | 'upload'>('timestamp');
  const [timestamp, setTimestamp] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Title State
  const [title, setTitle] = useState(currentTitle || '');
  
  // Loading States
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Internal duration state to handle cases where prop duration is 0
  const [maxDuration, setMaxDuration] = useState(duration);
  
  // Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (videoFile) {
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
        setTimestamp(0);
        setMaxDuration(duration > 0 ? duration : 0);
        setIsVideoLoading(true);
        setTitle(currentTitle || '');
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [isOpen, videoFile, duration, currentTitle]);

  if (!isOpen) return null;

  const handleSaveTitle = () => {
    if (onRename && title.trim()) {
      onRename(title.trim());
      // Optional: Add visual feedback
    }
  };

  const handleCaptureFrame = () => {
    if (videoRef.current && !isVideoLoading) {
      setIsProcessing(true);
      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          // @ts-ignore
          canvas.width = videoRef.current.videoWidth;
          // @ts-ignore
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // @ts-ignore
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            onSave(dataUrl);
            onClose();
          }
        } catch (e) {
          alert("Could not capture frame. Try a different time.");
        } finally {
          setIsProcessing(false);
        }
      }, 50);
    }
  };

  const handleAutoGenerateMiddle = () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    
    // Calculate middle
    const middleTime = maxDuration / 2;
    setTimestamp(middleTime);
    
    const video = videoRef.current;
    
    const capture = () => {
        try {
          const canvas = document.createElement('canvas');
          // @ts-ignore
          canvas.width = video.videoWidth;
          // @ts-ignore
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // @ts-ignore
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            onSave(dataUrl);
            onClose();
          }
        } catch (e) {
            console.error("Auto-generate failed", e);
            alert("Failed to generate thumbnail.");
        } finally {
            setIsProcessing(false);
        }
    };

    video.currentTime = middleTime;
    
    const onSeeked = () => {
        setTimeout(capture, 150);
        video.removeEventListener('seeked', onSeeked);
    };
    
    video.addEventListener('seeked', onSeeked, { once: true });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setIsCropperOpen(true);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        onSave(reader.result as string);
        onClose();
      }
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTimestamp(val);
    if (videoRef.current) {
      setIsVideoLoading(true);
      // @ts-ignore
      if (videoRef.current.fastSeek) {
         // @ts-ignore
         videoRef.current.fastSeek(val);
      } else {
         videoRef.current.currentTime = val;
      }
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm("Are you sure you want to remove this video from your library?")) {
      onDelete();
      onClose();
    }
  }

  const sliderPercentage = maxDuration > 0 ? (timestamp / maxDuration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-yt-dark w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-[#121212]">
          <h2 className="text-white text-lg font-bold">Edit Video Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto bg-[#0f0f0f]">
          
          {/* Title Section */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video Title</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={title} 
                 onChange={(e) => setTitle(e.target.value)}
                 className="flex-1 bg-[#181818] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
               />
               <button 
                 onClick={handleSaveTitle}
                 disabled={title === currentTitle}
                 className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${title === currentTitle ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
               >
                 <Check className="w-4 h-4" />
               </button>
             </div>
          </div>

          <hr className="border-white/10" />

          {/* Thumbnail Section */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Custom Thumbnail</label>
            <div className="flex gap-4 border-b border-white/10 pb-4 mb-4">
              <button 
                onClick={() => setMode('timestamp')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'timestamp' ? 'bg-white text-black font-bold' : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}
              >
                From Video Frame
              </button>
              <button 
                  onClick={() => setMode('upload')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-white text-black font-bold' : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}
              >
                Upload Image
              </button>
            </div>

            {mode === 'timestamp' ? (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10 relative shadow-lg group">
                  {isVideoLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 animate-in fade-in duration-200">
                      <div className="relative flex items-center justify-center">
                          <div className="absolute w-16 h-16 border-4 border-[var(--yt-brand)] border-t-transparent rounded-full animate-spin"></div>
                          <div className="absolute w-12 h-12 border border-white/10 rounded-full"></div>
                          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                            <Fish className="w-5 h-5 text-[var(--yt-brand)] fill-current animate-pulse" />
                          </div>
                      </div>
                      <div className="mt-4 flex flex-col items-center gap-1">
                        <span className="text-sm font-bold text-white tracking-tight">BlackCod</span>
                      </div>
                    </div>
                  )}

                  {videoUrl && (
                    <video 
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      muted
                      playsInline
                      onLoadStart={() => setIsVideoLoading(true)}
                      onWaiting={() => setIsVideoLoading(true)}
                      onSeeking={() => setIsVideoLoading(true)}
                      onCanPlay={() => setIsVideoLoading(false)}
                      onSeeked={() => setIsVideoLoading(false)}
                      onLoadedMetadata={(e) => {
                        if (maxDuration === 0 && Number.isFinite(e.currentTarget.duration)) {
                          setMaxDuration(e.currentTarget.duration);
                        }
                        e.currentTarget.currentTime = timestamp;
                      }}
                    />
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono backdrop-blur-sm z-10">
                    {timestamp.toFixed(1)}s
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Frame</label>
                    <span className="text-xs font-mono text-gray-500">{timestamp.toFixed(1)}s / {maxDuration.toFixed(1)}s</span>
                  </div>
                  
                  <div className="relative h-6 flex items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max={maxDuration || 100} 
                      step="0.05" 
                      value={timestamp}
                      onChange={handleSliderChange}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none slider-thumb-custom bg-gray-800"
                      style={{
                        background: `linear-gradient(to right, var(--yt-brand) 0%, var(--yt-brand) ${sliderPercentage}%, #374151 ${sliderPercentage}%, #374151 100%)`
                      }}
                      disabled={maxDuration === 0}
                    />
                  </div>
                  <style>{`
                    .slider-thumb-custom::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      height: 16px;
                      width: 16px;
                      border-radius: 50%;
                      background: var(--yt-brand);
                      cursor: pointer;
                      border: 2px solid #fff;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                      transition: transform 0.1s;
                    }
                    .slider-thumb-custom::-webkit-slider-thumb:hover { transform: scale(1.3); }
                  `}</style>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleAutoGenerateMiddle}
                    disabled={isProcessing}
                    className="px-4 py-3 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                    title="Reset to frame from middle of video"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCaptureFrame}
                    disabled={isVideoLoading || isProcessing}
                    className={`flex-1 py-3 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isVideoLoading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}`}
                    style={{ backgroundColor: 'var(--yt-brand)' }}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    {isProcessing ? "Processing..." : "Set Current Frame"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-700 hover:border-white rounded-xl p-12 text-center cursor-pointer transition-colors bg-[#181818] flex flex-col items-center gap-4 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 rounded-full bg-gray-800 group-hover:bg-gray-700 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 group-hover:text-white" />
                  </div>
                  <div>
                      <p className="text-sm text-gray-300 font-medium">Click to upload image</p>
                      <p className="text-xs text-gray-500 mt-1">Supports JPEG, PNG, WEBP</p>
                  </div>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="border-white/10" />

          {/* Danger Zone */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h3>
            <button 
               onClick={handleDelete}
               className="w-full py-3 border border-red-900/50 hover:bg-red-900/20 text-red-500 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
            >
               <Trash2 className="w-4 h-4" />
               Remove Video from Library
            </button>
          </div>

        </div>
      </div>
      
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageFile={pendingFile}
        aspectRatio={16/9}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};