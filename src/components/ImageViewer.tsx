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

  // Refs for Gesture Logic (avoid re-renders during gestures)
  const containerRef = useRef<HTMLDivElement>(null);
  // FIX: Explicitly initialize Map with types to prevent 'unknown' inference issues
  const pointersRef = useRef(new Map<number, Point>());
  const startDistRef = useRef<number>(0);
  const startScaleRef = useRef<number>(1);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
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
    } else {
      // Elastic effect feedback could go here
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

  const getCenter = (p1: Point, p2: Point): Point => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  // --- POINTER EVENTS (TOUCH & MOUSE) ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    // Add pointer to map
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    containerRef.current?.setPointerCapture(e.pointerId);

    const pointers = Array.from(pointersRef.current.values());

    if (pointers.length === 1) {
      // SINGLE TOUCH: Panning or Swipe preparation
      setIsDragging(true);
      startPointRef.current = { x: e.clientX, y: e.clientY };
      startTranslateRef.current = { ...translate };
    } else if (pointers.length === 2) {
      // MULTI TOUCH: Pinch Zoom start
      setIsDragging(true);
      // FIX: Explicit typing ensures pointers[0] and pointers[1] are treated as Point
      const p1 = pointers[0] as Point;
      const p2 = pointers[1] as Point;
      const dist = getDistance(p1, p2);
      startDistRef.current = dist;
      startScaleRef.current = scale;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    e.preventDefault();

    // Update pointer position
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const pointers = Array.from(pointersRef.current.values());

    if (pointers.length === 2) {
      // --- PINCH ZOOM LOGIC ---
      // FIX: Explicit typing ensures pointers[0] and pointers[1] are treated as Point
      const p1 = pointers[0] as Point;
      const p2 = pointers[1] as Point;
      const currentDist = getDistance(p1, p2);
      if (startDistRef.current > 0) {
        const ratio = currentDist / startDistRef.current;
        const newScale = Math.min(Math.max(startScaleRef.current * ratio, 0.5), 5); // Limit zoom 0.5x to 5x
        setScale(newScale);
      }
    } else if (pointers.length === 1 && isDragging) {
      // --- PAN / SWIPE LOGIC ---
      const dx = e.clientX - startPointRef.current.x;
      const dy = e.clientY - startPointRef.current.y;

      if (scale > 1) {
        // Free panning when zoomed in
        setTranslate({
          x: startTranslateRef.current.x + dx,
          y: startTranslateRef.current.y + dy
        });
      } else {
        // Resistance panning (swipe feel) when zoomed out
        // Vertical movement is suppressed to prevent feeling "loose"
        setTranslate({
          x: dx, 
          y: 0 
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    
    // If fewer than 2 pointers, pinch is over. If 0, interaction is over.
    if (pointersRef.current.size < 2) {
        // Interaction cleanup
        if (pointersRef.current.size === 0) {
            setIsDragging(false);
            handleInteractionEnd();
        } else {
            // If one finger remains, reset the start point for that finger to avoid jumping
            // but usually we just want to stop dragging logic until a new discreet gesture starts
            const remaining = pointersRef.current.values().next().value;
            if (remaining) {
                startPointRef.current = remaining;
                startTranslateRef.current = { ...translate };
            }
        }
    }
  };

  const handleInteractionEnd = () => {
    // 1. Check for Scale Reset
    if (scale < 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      return;
    }

    // 2. Check for Swipe (Next/Prev) if scale is 1
    if (scale === 1) {
      const threshold = 50; // pixels to trigger swipe
      if (translate.x > threshold) {
        prevImage();
      } else if (translate.x < -threshold) {
        nextImage();
      }
      // Always snap back to center after swipe check
      setTranslate({ x: 0, y: 0 });
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (scale > 1) {
      resetTransform();
    } else {
      // Zoom to point of click roughly (simplified to 2.5x)
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
    >
        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 pt-safe bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-bold border border-white/10 pointer-events-auto">
                {currentIndex + 1} / {images.length}
            </div>
            <div className="flex gap-4 pointer-events-auto">
                <button 
                    onClick={handleDownload} 
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all active:scale-95"
                    disabled={isDownloading}
                >
                    <Download size={20} className={isDownloading ? 'animate-bounce' : ''}/>
                </button>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white/10 hover:bg-red-500/20 rounded-full text-white hover:text-red-400 backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={24} />
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
                className="max-w-full max-h-full object-contain will-change-transform shadow-2xl"
                style={{ 
                    transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                draggable={false} 
            />
        </div>

        {/* NAVIGATION ARROWS (Desktop) */}
        {currentIndex > 0 && (
            <button 
                onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all hidden md:flex z-50 active:scale-95"
            >
                <ArrowLeft size={32} />
            </button>
        )}
        {currentIndex < images.length - 1 && (
            <button 
                onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all hidden md:flex z-50 active:scale-95"
            >
                <ArrowRight size={32} />
            </button>
        )}

        {/* BOTTOM CONTROLS */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl z-50 pb-safe pointer-events-auto">
            <button onClick={manualZoomOut} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale <= 1}>
                <ZoomOut size={24} />
            </button>
            
            <span className="text-white font-mono text-sm min-w-[3rem] text-center font-bold select-none">
                {Math.round(scale * 100)}%
            </span>

            <button onClick={manualZoomIn} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale >= 5}>
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