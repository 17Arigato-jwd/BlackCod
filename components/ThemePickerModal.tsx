import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor: string;
  onSelect: (color: string) => void;
}

// Reuse logic from App.tsx to ensure preview accuracy
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const mixWithBlack = (hex: string, percent: number) => {
  const { r, g, b } = hexToRgb(hex);
  const mixedR = Math.round(r * percent);
  const mixedG = Math.round(g * percent);
  const mixedB = Math.round(b * percent);
  return `rgb(${mixedR}, ${mixedG}, ${mixedB})`;
};

const generatePalette = (hex: string) => {
  return {
    red: hex,
    dark: mixWithBlack(hex, 0.25), // 25% intensity
    black: mixWithBlack(hex, 0.08) // 8% intensity
  };
};

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({ isOpen, onClose, initialColor, onSelect }) => {
  const [hex, setHex] = useState(initialColor);
  const [rgb, setRgb] = useState(hexToRgb(initialColor));

  useEffect(() => {
    if (isOpen) {
      setHex(initialColor);
      setRgb(hexToRgb(initialColor));
    }
  }, [isOpen, initialColor]);

  const handleHexChange = (val: string) => {
    setHex(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setRgb(hexToRgb(val));
    }
  };

  const handleRgbChange = (key: 'r' | 'g' | 'b', val: number) => {
    const newRgb = { ...rgb, [key]: val };
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleSave = () => {
    onSelect(hex);
    onClose();
  };

  if (!isOpen) return null;

  const palette = generatePalette(hex);

  // Styles for the preview iframe-like container
  const previewStyle = {
    '--yt-black': palette.black,
    '--yt-dark': palette.dark,
    '--yt-red': palette.red,
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#181818] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row h-[80vh] md:h-[600px]">
        
        {/* Controls Side */}
        <div className="w-full md:w-80 p-6 flex flex-col border-r border-white/10 bg-[#121212] overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-white">Theme Color</h2>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
               <X className="w-5 h-5" />
             </button>
           </div>

           <div className="space-y-6">
              {/* Hex Input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Hex Color</label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg shadow-inner border border-white/10" style={{ backgroundColor: hex }} />
                  <input 
                    type="text" 
                    value={hex}
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="flex-1 bg-[#202020] border border-gray-700 text-white px-3 py-2 rounded-lg font-mono uppercase focus:outline-none focus:border-blue-500"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* RGB Sliders */}
              <div className="space-y-4">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">RGB Channels</label>
                 
                 <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400 font-bold">R</span>
                      <span className="text-gray-400">{rgb.r}</span>
                    </div>
                    <input 
                      type="range" min="0" max="255" value={rgb.r} 
                      onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400 font-bold">G</span>
                      <span className="text-gray-400">{rgb.g}</span>
                    </div>
                    <input 
                      type="range" min="0" max="255" value={rgb.g} 
                      onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-400 font-bold">B</span>
                      <span className="text-gray-400">{rgb.b}</span>
                    </div>
                    <input 
                      type="range" min="0" max="255" value={rgb.b} 
                      onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                 </div>
              </div>
           </div>

           <div className="mt-auto pt-6">
             <button 
               onClick={handleSave}
               className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
             >
               <Check className="w-5 h-5" />
               Apply Theme
             </button>
           </div>
        </div>

        {/* Live Preview Side */}
        <div className="flex-1 bg-black p-4 md:p-8 flex flex-col relative overflow-hidden">
           <div className="absolute inset-0 bg-black" /> {/* Backdrop */}
           
           <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4 text-center">Live Preview</h3>
              
              {/* Mini App Mockup */}
              <div 
                 className="flex-1 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-gray-800 transition-colors duration-200"
                 style={{ backgroundColor: 'var(--yt-black)', ...previewStyle }}
              >
                 {/* Mini Header */}
                 <div className="h-10 border-b border-white/5 flex items-center px-3 justify-between" style={{ backgroundColor: 'var(--yt-black)' }}>
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 rounded bg-white/10" />
                       <div className="w-16 h-3 rounded bg-white/20" />
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 rounded-full bg-white/10" />
                       <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10" />
                    </div>
                 </div>

                 <div className="flex flex-1 overflow-hidden">
                    {/* Mini Sidebar */}
                    <div className="w-16 border-r border-white/5 flex flex-col items-center py-3 gap-3" style={{ backgroundColor: 'var(--yt-black)' }}>
                       <div className="w-6 h-6 rounded bg-white/10" />
                       <div className="w-6 h-6 rounded bg-white/5" />
                       <div className="w-6 h-6 rounded bg-white/5" />
                       <div className="mt-auto w-6 h-6 rounded" style={{ backgroundColor: 'var(--yt-red)' }} />
                    </div>

                    {/* Mini Content */}
                    <div className="flex-1 p-4 overflow-hidden" style={{ backgroundColor: 'var(--yt-black)' }}>
                       <div className="flex items-center gap-2 mb-4">
                          <div className="px-3 py-1 rounded-full text-[10px] text-white" style={{ backgroundColor: 'var(--yt-dark)' }}>All</div>
                          <div className="px-3 py-1 rounded-full text-[10px] text-white/50 border border-white/10">Gaming</div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          {/* Video Card 1 */}
                          <div className="flex flex-col gap-2">
                             <div className="aspect-video rounded-lg" style={{ backgroundColor: 'var(--yt-dark)' }} />
                             <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: 'var(--yt-dark)' }} />
                                <div className="flex-1 space-y-1">
                                   <div className="w-full h-2 rounded bg-white/20" />
                                   <div className="w-2/3 h-2 rounded bg-white/10" />
                                </div>
                             </div>
                          </div>
                          {/* Video Card 2 */}
                          <div className="flex flex-col gap-2">
                             <div className="aspect-video rounded-lg relative overflow-hidden" style={{ backgroundColor: 'var(--yt-dark)' }}>
                                <div className="absolute inset-0 bg-white/5" />
                                <div className="absolute bottom-1 right-1 px-1 rounded text-[8px] bg-black/60 text-white">12:34</div>
                             </div>
                             <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, var(--yt-red), var(--yt-dark))` }} />
                                <div className="flex-1 space-y-1">
                                   <div className="w-3/4 h-2 rounded bg-white/20" />
                                   <div className="w-1/2 h-2 rounded bg-white/10" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};