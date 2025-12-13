import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Download, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  
  // Transform State
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs for Gesture Logic
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Gesture State Refs (Mutable to avoid re-renders during 60fps gestures)
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const startDistRef = useRef<number>(0);
  const startScaleRef = useRef<number>(1);
  const lastCenterRef = useRef<Point>({ x: 0, y: 0 });
  const startTranslateRef = useRef<Point>({ x: 0, y: 0 });

  // Reset transform when image changes
  useEffect(() => {
    resetTransform();
  }, [currentIndex]);

  const resetTransform = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const nextImage = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, images.length]);

  const prevImage = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, onClose]);

  // --- MATH HELPERS ---
  const getDistance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (pointers: Point[]): Point => {
    const total = pointers.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return {
      x: total.x / pointers.length,
      y: total.y / pointers.length,
    };
  };

  // --- POINTER EVENTS (TOUCH & MOUSE) ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    containerRef.current?.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Recalculate start parameters whenever a finger touches down
    const pointers: Point[] = Array.from(pointersRef.current.values());
    
    setIsDragging(true);
    startTranslateRef.current = { ...translate };
    
    if (pointers.length === 2) {
      // Initialize pinch
      startDistRef.current = getDistance(pointers[0], pointers[1]);
      startScaleRef.current = scale;
    }
    
    // Always track center for panning
    lastCenterRef.current = getCenter(pointers);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    e.preventDefault();
    e.stopPropagation();

    // Update this pointer's position
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const pointers: Point[] = Array.from(pointersRef.current.values());
    const currentCenter = getCenter(pointers);
    
    // Calculate delta movement from the last tracked center
    const deltaX = currentCenter.x - lastCenterRef.current.x;
    const deltaY = currentCenter.y - lastCenterRef.current.y;
    
    // Update reference center for next frame
    lastCenterRef.current = currentCenter;

    if (pointers.length === 2) {
      // --- PINCH ZOOM + PAN ---
      const currentDist = getDistance(pointers[0], pointers[1]);
      if (startDistRef.current > 0) {
        const ratio = currentDist / startDistRef.current;
        // Dampen the zoom slightly for smoother feel
        const newScale = Math.min(Math.max(startScaleRef.current * ratio, 0.5), 8); 
        setScale(newScale);
        
        // Allow panning while zooming
        setTranslate(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
      }
    } else if (pointers.length === 1 && isDragging) {
      // --- SIMPLE PAN / SWIPE ---
      if (scale > 1) {
        // Free panning when zoomed in
        setTranslate(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
      } else {
        // Resistance panning (swipe feel) when zoomed out
        // Only allow horizontal movement, suppress vertical
        setTranslate(prev => ({
          x: prev.x + deltaX, 
          y: 0 
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    containerRef.current?.releasePointerCapture(e.pointerId);
    
    const pointers: Point[] = Array.from(pointersRef.current.values());

    // If pointers change (e.g. lift one finger), reset the "anchor" for the remaining fingers
    // to prevent the image from jumping to the new center.
    if (pointers.length > 0) {
      lastCenterRef.current = getCenter(pointers);
      // If going from 2 fingers to 1, reset pinch reference
      if (pointers.length < 2) {
        startDistRef.current = 0;
      } else if (pointers.length === 2) {
        // If going from 3 to 2 (rare but possible), re-init pinch
        startDistRef.current = getDistance(pointers[0], pointers[1]);
        startScaleRef.current = scale;
      }
    } else {
      // No fingers left
      setIsDragging(false);
      handleInteractionEnd();
    }
  };

  const handleInteractionEnd = () => {
    // 1. Check for Scale Reset (Min/Max limits)
    if (scale < 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      return;
    }
    
    // 2. Check for Swipe (Next/Prev) ONLY if scale is near 1
    // We use a small epsilon because math precision might leave it at 1.000001
    if (scale < 1.1) {
      const threshold = 60; // swipe threshold
      if (translate.x > threshold) {
        prevImage();
      } else if (translate.x < -threshold) {
        nextImage();
      }
      // Always snap back to center after swipe check if we didn't change image
      // (Changing image resets transform via useEffect)
      if (scale !== 1 || translate.x !== 0) {
         setTranslate({ x: 0, y: 0 });
         setScale(1);
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (scale > 1) {
      resetTransform();
    } else {
      // Zoom to 2.5x
      setScale(2.5);
    }
  };

  const manualZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const manualZoomOut = () => {
    setScale(s => {
        const newS = Math.max(s - 0.5, 1);
        if (newS === 1) setTranslate({ x: 0, y: 0 });
        return newS;
    });
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const imageUrl = images[currentIndex];
    const fileName = `foto-hub-${Date.now()}.jpg`;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
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
        className="fixed inset-0 z-[99999] bg-black/95 flex flex-col overflow-hidden animate-fade-in touch-none select-none h-[100dvh]"
        style={{ touchAction: 'none' }} // Critical for iOS
    >
        {/* TOP BAR - Increased padding for Safe Area */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-start p-4 pt-[max(env(safe-area-inset-top),24px)] bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none pb-12">
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-bold border border-white/10 pointer-events-auto mt-2">
                {currentIndex + 1} / {images.length}
            </div>
            
            <div className="flex gap-4 pointer-events-auto">
                <button 
                    onClick={handleDownload} 
                    className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all active:scale-90 shadow-lg border border-white/5"
                    disabled={isDownloading}
                    aria-label="Descargar"
                >
                    <Download size={22} className={isDownloading ? 'animate-bounce' : ''}/>
                </button>
                <button 
                    onClick={onClose} 
                    className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-red-500/20 rounded-full text-white hover:text-red-400 backdrop-blur-md transition-all active:scale-90 shadow-lg border border-white/5"
                    aria-label="Cerrar"
                >
                    <X size={26} />
                </button>
            </div>
        </div>

        {/* IMAGE AREA */}
        <div 
            ref={containerRef}
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleDoubleTap}
        >
            <img 
                src={images[currentIndex]} 
                alt="Visor"
                className="max-w-full max-h-full object-contain will-change-transform drop-shadow-2xl"
                style={{ 
                    transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none'
                }}
                draggable={false} 
            />
        </div>

        {/* NAVIGATION ARROWS (Desktop only - hidden on touch devices usually via media query logic in CSS or here) */}
        <div className="hidden md:block">
            {currentIndex > 0 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all z-50 active:scale-95"
                >
                    <ArrowLeft size={32} />
                </button>
            )}
            {currentIndex < images.length - 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all z-50 active:scale-95"
                >
                    <ArrowRight size={32} />
                </button>
            )}
        </div>

        {/* BOTTOM CONTROLS - Adjusted for safe area */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl z-50 pb-safe mb-[env(safe-area-inset-bottom)] pointer-events-auto">
            <button onClick={manualZoomOut} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale <= 1}>
                <ZoomOut size={24} />
            </button>
            
            <span className="text-white font-mono text-sm min-w-[3rem] text-center font-bold select-none tabular-nums">
                {Math.round(scale * 100)}%
            </span>

            <button onClick={manualZoomIn} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale >= 8}>
                <ZoomIn size={24} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-2"></div>

            <button onClick={resetTransform} className="p-2 text-white hover:text-blue-400 transition-colors active:scale-90" title="Restablecer">
                {scale === 1 ? <Maximize size={20} /> : <RotateCcw size={20} />}
            </button>
        </div>
    </div>
  );
};