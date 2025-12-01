import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, Download, RefreshCw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [transform, setTransform] = useState({ scale: 1, posX: 0, posY: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const isPanning = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef(0);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, posX: 0, posY: 0 });
  }, []);

  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);
  
  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, onClose]);

  const handleZoom = (delta: number) => {
    setTransform(prev => {
      const newScale = Math.max(1, Math.min(prev.scale + delta, 5));
      if (newScale === 1) return { scale: 1, posX: 0, posY: 0 };
      return { ...prev, scale: newScale };
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (transform.scale <= 1) return;
    e.preventDefault();
    isPanning.current = true;
    startPos.current = { x: e.clientX - transform.posX, y: e.clientY - transform.posY };
    if (imageRef.current) imageRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning.current || transform.scale <= 1) return;
    e.preventDefault();
    const newPosX = e.clientX - startPos.current.x;
    const newPosY = e.clientY - startPos.current.y;
    setTransform(prev => ({ ...prev, posX: newPosX, posY: newPosY }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isPanning.current = false;
    if (imageRef.current) imageRef.current.style.cursor = 'grab';
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY * -0.01);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
     if (e.touches.length === 2) {
       e.preventDefault();
       isPanning.current = false; // Disable panning when zooming
       lastTouchDistance.current = Math.hypot(
         e.touches[0].clientX - e.touches[1].clientX,
         e.touches[0].clientY - e.touches[1].clientY
       );
     } else if (e.touches.length === 1) {
       handlePointerDown(e.touches[0] as any);
     }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newTouchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (newTouchDistance - lastTouchDistance.current) * 0.01;
      handleZoom(delta);
      lastTouchDistance.current = newTouchDistance;
    } else if (e.touches.length === 1 && isPanning.current) {
       handlePointerMove(e.touches[0] as any);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) lastTouchDistance.current = 0;
    if (e.touches.length < 1) handlePointerUp(e as any);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `task-image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-0 animate-fade-in touch-none" 
      onClick={onClose}
    >
      {/* Main Image */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          ref={imageRef}
          src={images[currentIndex]} 
          alt={`Vista ampliada ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${transform.scale}) translate(${transform.posX}px, ${transform.posY}px)`, 
            cursor: transform.scale > 1 ? 'grab' : 'default',
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          draggable="false"
        />
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 pt-safe bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <span className="text-white text-lg font-bold drop-shadow-md">{currentIndex + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white bg-black/50 p-3 rounded-full hover:bg-black/80 transition-colors z-20 pointer-events-auto"><X size={24}/></button>
      </div>

      {/* Side Navigation */}
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/80 transition-colors z-20 pointer-events-auto"><ArrowLeft size={32}/></button>
          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/80 transition-colors z-20 pointer-events-auto"><ArrowRight size={32}/></button>
        </>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center p-4 pb-safe bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 bg-black/50 p-2 rounded-full backdrop-blur-sm pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.5); }} className="text-white p-3 hover:bg-white/20 rounded-full transition-colors"><ZoomOut size={24}/></button>
          <button onClick={(e) => { e.stopPropagation(); handleZoom(0.5); }} className="text-white p-3 hover:bg-white/20 rounded-full transition-colors"><ZoomIn size={24}/></button>
          <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="text-white p-3 hover:bg-white/20 rounded-full transition-colors"><RefreshCw size={24}/></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="text-white p-3 hover:bg-white/20 rounded-full transition-colors"><Download size={24}/></button>
        </div>
      </div>
    </div>
  );
};