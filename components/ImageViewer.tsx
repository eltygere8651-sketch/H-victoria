import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Download, RefreshCw } from 'lucide-react';

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
  const [isDownloading, setIsDownloading] = useState(false);

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
       isPanning.current = false;
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

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const imageUrl = images[currentIndex];
    const fileName = `hub-imagen-${Date.now()}.jpg`;

    try {
      // 1. Fetch the image content as a blob. This bypasses CORS issues regarding canvas tainting
      // and works consistently for both Base64 and Remote URLs.
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // 2. Create an Object URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // 3. Create a temporary link and trigger click
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // 4. Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (e) {
      console.error("Download failed", e);
      // Fallback simple
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[99999] flex flex-col items-center justify-center p-0 animate-fade-in touch-none" 
      onClick={onClose}
    >
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
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out select-none"
          style={{ 
            transform: `scale(${transform.scale}) translate(${transform.posX}px, ${transform.posY}px)`, 
            cursor: transform.scale > 1 ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          draggable="false"
        />
      </div>

      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 pt-safe z-[100000] pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-medium border border-white/10 shadow-lg">
          {currentIndex + 1} / {images.length}
        </div>
        <button 
          onClick={onClose} 
          className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-white/20 active:bg-white/30 border border-white/10 transition-all pointer-events-auto shadow-lg"
        >
          <X size={24}/>
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); prevImage(); }} 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 backdrop-blur-md p-4 rounded-full hover:bg-white/20 active:scale-95 border border-white/10 transition-all z-[100000] pointer-events-auto shadow-lg hidden md:flex"
          >
            <ArrowLeft size={32}/>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextImage(); }} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 backdrop-blur-md p-4 rounded-full hover:bg-white/20 active:scale-95 border border-white/10 transition-all z-[100000] pointer-events-auto shadow-lg hidden md:flex"
          >
            <ArrowRight size={32}/>
          </button>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end items-center pb-safe z-[100000] pointer-events-none bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 px-4">
        <div className="flex items-center gap-4 mb-6 pointer-events-auto">
           <button 
            onClick={(e) => { e.stopPropagation(); resetTransform(); }} 
            className="text-white p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 border border-white/10 active:scale-95 transition-all"
            title="Restablecer Zoom"
          >
            <RefreshCw size={22}/>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
            disabled={isDownloading}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-900/50 hover:bg-red-500 active:scale-95 transition-all border border-red-400/30"
          >
            {isDownloading ? <RefreshCw size={20} className="animate-spin"/> : <Download size={20} />}
            <span>{isDownloading ? 'Descargando...' : 'Descargar Imagen'}</span>
          </button>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto max-w-full px-2 no-scrollbar pointer-events-auto">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};