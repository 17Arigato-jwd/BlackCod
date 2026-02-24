import { VideoMetadata } from '../types';

export const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith('video/')) return true;
  const videoExtensions = ['.mkv', '.avi', '.mov', '.wmv', '.flv', '.mp4', '.m4v', '.3gp', '.ts', '.webm', '.ogv'];
  return videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString().padStart(h > 0 ? 2 : 1, '0');
  const sStr = s.toString().padStart(2, '0');

  return h > 0 ? `${h}:${mStr}:${sStr}` : `${m}:${sStr}`;
};

export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return "Just now";
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const generateThumbnailAtTime = async (file: File, time: number): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    const cleanup = () => {
       video.onseeked = null;
       video.onerror = null;
       video.pause();
       video.removeAttribute('src');
       // video.load(); // Removed to prevent abort error
       URL.revokeObjectURL(url);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(dataUrl);
        } else {
          cleanup();
          resolve(null);
        }
      } catch (e) {
        cleanup();
        resolve(null);
      }
    };
    
    video.onerror = () => {
       cleanup();
       resolve(null);
    }

    video.src = url;
    video.currentTime = time;
  });
};

export const extractMetadata = async (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    let resolved = false;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute('src');
      // video.load(); // Removed to prevent abort error
      URL.revokeObjectURL(url);
    };

    const safeResolve = (data: VideoMetadata) => {
       if (resolved) return;
       resolved = true;
       cleanup();
       resolve(data);
    };

    // Timeout: if processing takes too long (4s), return what we have (likely 0 duration)
    const timeoutId = setTimeout(() => {
      const d = (video.duration && Number.isFinite(video.duration)) ? video.duration : 0;
      safeResolve({ thumbnailUrl: null, duration: d });
    }, 4000);

    video.onloadedmetadata = () => {
      // If duration is infinite (streaming/unknown), we can't reliably seek randomly.
      // We'll try to seek to 1 second, or start.
      const duration = video.duration;
      let seekTime = 0.5;

      if (Number.isFinite(duration) && duration > 0) {
        // Seek to 20% mark to avoid black start frames, but not past 5s for short clips check
        seekTime = Math.min(duration * 0.2, 5);
      }
      
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480; 
        canvas.height = 270;
        
        const ctx = canvas.getContext('2d');
        let thumbnailUrl = null;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
        
        const duration = (video.duration && Number.isFinite(video.duration)) ? video.duration : 0;
        safeResolve({ thumbnailUrl, duration });

      } catch (e) {
        const duration = (video.duration && Number.isFinite(video.duration)) ? video.duration : 0;
        safeResolve({ thumbnailUrl: null, duration });
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      safeResolve({ thumbnailUrl: null, duration: 0 });
    };

    video.src = url;
  });
};