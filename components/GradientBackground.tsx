import React, { useEffect, useState, memo } from 'react';

interface GradientBackgroundProps {
  colors: { black: string; dark: string; red: string };
  visible: boolean;
}

interface BlobData {
  id: string;
  x: number; // percentage
  y: number; // percentage
  size: number; // px
  color: string;
  opacity: number;
  animationName: string;
  duration: number; // seconds
  createdAt: number;
  lifetime: number; // ms
  isDying: boolean;
}

// Optimized sub-component with entry animation
const BlobItem = memo(({ data, fadeTime, fadeInTime }: { data: BlobData, fadeTime: number, fadeInTime: number }) => {
  return (
    <div
      className="blob absolute rounded-full animate-in fade-in duration-[3000ms]"
      style={{
        left: `${data.x}%`,
        top: `${data.y}%`,
        width: `${data.size}px`,
        height: `${data.size}px`,
        // Use radial gradient for smoother edges within the blur
        background: `radial-gradient(closest-side, ${data.color}, transparent)`,
        filter: 'blur(60px)', 
        opacity: data.isDying ? 0 : data.opacity,
        willChange: 'transform, opacity',
        transform: 'translate3d(0,0,0)',
        animationName: data.animationName,
        animationDuration: `${data.duration}s`,
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
        transition: `opacity ${data.isDying ? fadeTime : fadeInTime}ms ease-in-out`
      }}
    />
  );
});

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ colors, visible }) => {
  const [blobs, setBlobs] = useState<BlobData[]>([]);

  // Config constants
  const MIN_BLOBS = 7;
  const MAX_BLOBS = 9;
  const ABSOLUTE_MAX = 10;
  const FADE_TIME = 2000; // 2s fade out for dying blobs
  const FADE_IN_TIME = 2000; // 2s fade in for opacity prop transition

  const generateBlob = (): BlobData => {
    const isLight = Math.random() > 0.7; // 30% chance of light blob
    
    let color;
    if (isLight) {
        color = Math.random() > 0.5 ? '#ffffff' : '#60a5fa'; // White or Light Blue
    } else {
        const rand = Math.random();
        if (rand < 0.33) color = colors.red;
        else if (rand < 0.66) color = colors.dark;
        else color = '#000000'; // Black (creates negative space)
    }

    const sizeRand = Math.random();
    let size;
    if (sizeRand < 0.3) {
        size = 20 + Math.random() * 60; // 20-80px
    } else if (sizeRand < 0.7) {
        size = 80 + Math.random() * 170; // 80-250px
    } else {
        size = 250 + Math.random() * 200; // 250-450px
    }

    const opacity = isLight 
        ? 0.05 + Math.random() * 0.1
        : 0.1 + Math.random() * 0.3;

    const lifetime = 5000 + Math.random() * 15000;
    const duration = 10 + Math.random() * 20; 

    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * 100,
      y: Math.random() * 100,
      size,
      color,
      opacity,
      animationName: `float-${Math.floor(Math.random() * 5) + 1}`,
      duration,
      createdAt: Date.now(),
      lifetime,
      isDying: false
    };
  };

  useEffect(() => {
    // Initial Population
    const initialBlobs = Array.from({ length: MIN_BLOBS }).map(generateBlob);
    setBlobs(initialBlobs);

    const interval = setInterval(() => {
      // Performance optimization: Pause logic when tab is hidden
      if (document.hidden) return;

      const now = Date.now();
      
      setBlobs(currentBlobs => {
        let nextBlobs = [...currentBlobs];
        let hasChanges = false;

        // 1. Mark expiring blobs as dying
        nextBlobs = nextBlobs.map(blob => {
          if (!blob.isDying && (now - blob.createdAt > blob.lifetime - FADE_TIME)) {
            hasChanges = true;
            return { ...blob, isDying: true };
          }
          return blob;
        });

        // 2. Remove dead blobs
        const beforeCount = nextBlobs.length;
        nextBlobs = nextBlobs.filter(blob => now - blob.createdAt < blob.lifetime);
        if (nextBlobs.length !== beforeCount) hasChanges = true;

        // 3. Spawn new blobs if needed
        const activeCount = nextBlobs.length;
        const targetCount = MIN_BLOBS + Math.floor(Math.random() * (MAX_BLOBS - MIN_BLOBS + 1));
        
        if (activeCount < targetCount && activeCount < ABSOLUTE_MAX) {
             if (Math.random() > 0.2) { 
                 nextBlobs.push(generateBlob());
                 hasChanges = true;
             }
        }

        return hasChanges ? nextBlobs : currentBlobs;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [colors]);

  return (
    <div 
        className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-yt-black transition-opacity duration-[2000ms] ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
       {blobs.map(blob => (
         <BlobItem 
            key={blob.id} 
            data={blob} 
            fadeTime={FADE_TIME}
            fadeInTime={FADE_IN_TIME}
         />
       ))}
    </div>
  );
};