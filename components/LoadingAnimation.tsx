import React from 'react';
import { Fish } from 'lucide-react';

interface LoadingAnimationProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  enableGradient?: boolean;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ text, size = 'md', enableGradient = false }) => {
  // Size mapping
  const dims = {
    sm: { outer: 'w-12 h-12', inner: 'w-8 h-8', iconBox: 'w-6 h-6', icon: 'w-3 h-3' },
    md: { outer: 'w-16 h-16', inner: 'w-12 h-12', iconBox: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { outer: 'w-24 h-24', inner: 'w-20 h-20', iconBox: 'w-16 h-16', icon: 'w-8 h-8' }
  }[size];

  // Styles based on mode
  const outerClass = enableGradient 
    ? "border-white/30 border-t-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
    : "border-[var(--yt-brand)] border-t-transparent";

  const innerClass = enableGradient
    ? "border-white/10 bg-white/5"
    : "border-white/10";

  const iconBoxClass = enableGradient
    ? "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
    : "bg-white/5 border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]";

  const iconClass = enableGradient
    ? "text-white"
    : "text-[var(--yt-brand)]";

  const textClass = enableGradient
    ? "text-white/80"
    : "text-[var(--yt-brand)]";

  return (
    <div className="flex flex-col items-center justify-center p-4">
       <div className="relative flex items-center justify-center">
          {/* Outer spinning ring */}
          <div className={`absolute ${dims.outer} border-4 rounded-full animate-spin ${outerClass}`}></div>
          
          {/* Inner static ring */}
          <div className={`absolute ${dims.inner} border rounded-full ${innerClass}`}></div>
          
          {/* Logo Container */}
          <div className={`${dims.iconBox} rounded-full flex items-center justify-center backdrop-blur-md border relative z-10 ${iconBoxClass}`}>
             <Fish className={`${dims.icon} fill-current animate-pulse ${iconClass}`} />
          </div>
       </div>
       {text && (
         <div className="mt-4 flex flex-col items-center gap-1">
           <span className="text-sm font-bold text-white tracking-tight">BlackCod</span>
           <span className={`text-[10px] font-bold tracking-[0.3em] uppercase animate-pulse ${textClass}`}>{text}</span>
         </div>
       )}
    </div>
  );
};