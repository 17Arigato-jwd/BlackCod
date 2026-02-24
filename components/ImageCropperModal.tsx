import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  aspectRatio: number; // e.g. 1 for square, 16/9 for thumbnail
  onCropComplete: (croppedBlob: Blob) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ 
  isOpen, onClose, imageFile, aspectRatio, onCropComplete 
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      imageRef.current.src = url;
      setScale(1);
      setPosition({ x: 0, y: 0 });
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    // Set high resolution for output
    const outputWidth = aspectRatio === 1 ? 500 : 1280;
    const outputHeight = outputWidth / aspectRatio;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The container dimensions (the viewport)
    const viewportRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = viewportRect.width;
    const viewportHeight = viewportRect.height;

    // Calculate how the image is currently rendered relative to viewport
    // The image size in pixels on screen
    const imgWidth = imageRef.current.width * scale; // This is based on natural width? No, we need scaled size relative to viewport.
    
    // Let's use a simpler approach: 
    // We map the visible area of the viewport to the source image.
    
    // 1. Determine image scaling ratio in the UI
    // We display image with max-width/height none, controlled by transform. 
    // Actually, in the UI we render: transform: translate(x,y) scale(s)
    
    // We need to fit the image into the canvas.
    // The viewport represents the "Crop Box".
    
    // Image natural dimensions
    const nw = imageRef.current.naturalWidth;
    const nh = imageRef.current.naturalHeight;
    
    // How the image is displayed initially (fit to container)
    // In our render below, we style the img with `max-width: none; max-height: none; display: block;`
    // Wait, calculating exact CSS transforms to Canvas coordinates can be tricky.
    
    // Alternative: Draw the image onto the canvas using the same logic as the CSS transform.
    // Center of canvas
    ctx.translate(outputWidth / 2, outputHeight / 2);
    // Apply user translation (scaled to output size)
    // We need to know the ratio between Viewport Pixels and Output Pixels
    
    // However, the user translates the IMAGE, not the viewport.
    
    // Let's simplify: 
    // We define a base scale where the image fits the viewport (contain).
    const ratioW = viewportWidth / nw;
    const ratioH = viewportHeight / nh;
    const baseScale = Math.min(ratioW, ratioH); // "contain" scale
    
    // User scale acts on top of this base scale?
    // Let's assume the user starts with the image fitting the box roughly.
    // Or we just calculate the mapping directly.
    
    // Let's rely on the rendered size vs natural size.
    // Rendered Width = nw * scale? No, CSS pixels are different.
    
    // Better approach for custom cropper:
    // 1. Render image in canvas on screen.
    // 2. Allow user to manipulate canvas.
    // 3. Export.
    
    // Let's try mapping:
    // relativeX = position.x / viewportWidth
    // relativeScale = scale
    
    // We draw the image into the context.
    // The viewport corresponds to (0,0, outputWidth, outputHeight) in context space.
    // The image is drawn at (x, y) with size (w*scale, h*scale).
    
    // But we need to convert Viewport Pixels -> Canvas Pixels.
    // Factor = outputWidth / viewportWidth
    const factor = outputWidth / viewportWidth;
    
    // Apply Translation (converted to output space)
    const tx = position.x * factor;
    const ty = position.y * factor;
    
    // Apply Scale
    // We need to know the displayed size of the image when scale=1.
    // In the JSX below, I'll set the image style width to '100%' of the container initially? No that complicates dragging.
    // I'll set image to be centered.
    
    // Let's define the drawing:
    // We want the area under the overlay to be saved.
    
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(-outputWidth/2, -outputHeight/2, outputWidth*2, outputHeight*2); // safe background
    
    // Reset transform to draw
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // We need to draw the image such that the part visible in `containerRef` matches `canvas`.
    // Image CSS: transform: translate(position.x px, position.y px) scale(scale)
    // Origin is center?
    
    // Let's use a simpler logic used in many tutorials:
    // 1. Center the context
    ctx.translate(outputWidth/2, outputHeight/2);
    // 2. Move by position
    ctx.translate(position.x * factor, position.y * factor);
    // 3. Scale
    ctx.scale(scale, scale);
    
    // 4. Draw image centered
    // But we need to account for how the image is sized in DOM relative to the viewport.
    // In DOM, let's say we render the image at `height: 100%` (if landscape container) or `width: 100%`.
    // Let's force the image in DOM to match the viewport's "contain" logic initially.
    
    let drawWidth = nw;
    let drawHeight = nh;
    
    // Initial fit logic in DOM:
    const fitScale = Math.min(viewportWidth / nw, viewportHeight / nh);
    
    // So the rendered image size at scale=1 is (nw * fitScale, nh * fitScale)
    // We need to draw at that relative size * outputFactor
    const outputFitScale = fitScale * factor;
    
    ctx.drawImage(
        imageRef.current,
        -nw / 2, -nh / 2, 
        nw, nh
    );
    
    // Wait, the context scale needs to apply the fitScale too.
    // Correct transform:
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.translate(outputWidth/2, outputHeight/2); // move to center
    ctx.translate(position.x * factor, position.y * factor); // apply pan
    ctx.scale(scale * outputFitScale, scale * outputFitScale); // apply zoom & fit
    ctx.drawImage(imageRef.current, -nw/2, -nh/2);
    
    canvas.toBlob((blob) => {
        if (blob) onCropComplete(blob);
        onClose();
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10">
        
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#121212]">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Move className="w-5 h-5 text-[var(--yt-brand)]" />
            Adjust Image
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none p-8">
           {/* Crop Viewport */}
           <div 
             ref={containerRef}
             className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-2 border-white/50"
             style={{ 
               width: aspectRatio === 1 ? '350px' : '500px',
               height: aspectRatio === 1 ? '350px' : `${500/aspectRatio}px`,
               maxWidth: '100%',
               cursor: isDragging ? 'grabbing' : 'grab'
             }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
           >
             {/* The Image */}
             <div className="w-full h-full flex items-center justify-center pointer-events-none"> 
                {/* 
                   We use a flex center container so the image is centered by default.
                   Transform applies translation and scale.
                   We need to ensure the image initial size fits the container (contain).
                */}
                <img 
                   src={imageSrc} 
                   alt="Crop target" 
                   style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      pointerEvents: 'none', // Allow clicks to pass to container
                      userSelect: 'none'
                   }}
                   draggable={false}
                />
             </div>
             
             {/* Grid Overlay */}
             <div className="absolute inset-0 grid grid-cols-3 pointer-events-none opacity-30">
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
             </div>
           </div>
        </div>

        <div className="p-6 bg-[#121212] border-t border-white/10 space-y-4">
           {/* Zoom Controls */}
           <div className="flex items-center gap-4">
              <ZoomOut className="w-5 h-5 text-gray-400" />
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.05" 
                value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--yt-brand)]"
              />
              <ZoomIn className="w-5 h-5 text-gray-400" />
           </div>

           <div className="flex justify-end gap-3">
             <button 
               onClick={onClose}
               className="px-6 py-2 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
             >
               Cancel
             </button>
             <button 
               onClick={handleCrop}
               className="px-6 py-2 rounded-full font-bold text-sm text-white shadow-lg transition-colors flex items-center gap-2"
               style={{ backgroundColor: 'var(--yt-brand)' }}
             >
               <Check className="w-4 h-4" />
               Apply Crop
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};