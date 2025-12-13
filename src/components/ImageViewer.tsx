import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Download, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  
  // Visual State
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Gesture Engine Refs
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mutable state for the gesture loop to avoid React render lag
  const pointers = useRef(new Map<number, { x: number, y: number }>());
  const startState = useRef({
    scale: 1,
    x: 0,
    y: 0,
    center: { x: 0, y: 0 },
    distance: 0,
  });

  // 1. Prevent Default Touch Behavior (Scroll/Zoom of the page itself) on iOS
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    // Lock the body scroll
    document.body.style.overflow = 'hidden';
    
    // Add a non-passive listener to ensuring preventing default works
    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // Reset when image changes
  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
    pointers.current.clear();
  }, [currentIndex]);

  const nextImage = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, images.length]);

  const prevImage = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

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
  const getDistance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (points: {x:number, y:number}[]) => {
    let x = 0, y = 0;
    points.forEach(p => { x += p.x; y += p.y; });
    return { x: x / points.length, y: y / points.length };
  };

  // --- GESTURE LOGIC ---

  // Capture the "start" state of a gesture segment
  // Called when a finger goes down or comes up (changing the number of contacts)
  const captureStartState = (currentT: { scale: number, x: number, y: number }) => {
    const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
    if (points.length === 0) return;

    const center = getCenter(points);
    const distance = points.length === 2 ? getDistance(points[0], points[1]) : 0;

    startState.current = {
      scale: currentT.scale,
      x: currentT.x,
      y: currentT.y,
      center,
      distance
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Explicitly prevent default to stop mouse emulation or scrolling
    e.preventDefault();
    e.stopPropagation();
    
    // Capture pointer
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    setIsDragging(true);
    captureStartState(transform);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!pointers.current.has(e.pointerId)) return;

    // Update pointer position
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
    if (points.length === 0) return;

    const currentCenter = getCenter(points);
    const start = startState.current;

    // 1. Calculate Pan (Delta)
    const deltaX = currentCenter.x - start.center.x;
    const deltaY = currentCenter.y - start.center.y;

    let newX = start.x + deltaX;
    let newY = start.y + deltaY;
    let newScale = start.scale;

    // 2. Calculate Zoom (Ratio)
    if (points.length === 2) {
      const currentDist = getDistance(points[0], points[1]);
      if (start.distance > 0) {
        const ratio = currentDist / start.distance;
        newScale = start.scale * ratio;
      }
    }

    // 3. Constraints
    // If zoom is near 1x, restrict vertical movement to feel like a carousel
    if (newScale <= 1.05 && points.length === 1) {
      newY = 0; // Lock Y
    }

    setTransform({
      scale: Math.max(0.5, newScale), // Allow slightly less than 1 to feel "rubber band"
      x: newX,
      y: newY
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    containerRef.current?.releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    
    const points = Array.from(pointers.current.values());
    
    if (points.length === 0) {
      setIsDragging(false);
      handleGestureEnd();
    } else {
      // If we still have fingers (e.g. 2 -> 1), re-anchor the start state 
      // so the image doesn't jump to the new single-finger center.
      captureStartState(transform);
    }
  };

  const handleGestureEnd = () => {
    let { scale, x, y } = transform;

    // 1. Snap Zoom Limits
    if (scale < 1) {
      scale = 1;
      x = 0;
      y = 0;
    } else if (scale > 5) {
      scale = 5;
    }

    // 2. Swipe Logic (Only if not zoomed in)
    if (scale === 1) {
      const width = window.innerWidth;
      const threshold = width * 0.25; // 25% of screen width
      
      if (x > threshold) {
        prevImage();
        x = 0; 
      } else if (x < -threshold) {
        nextImage();
        x = 0;
      } else {
        // Snap back to center
        x = 0;
        y = 0;
      }
    }

    setTransform({ scale, x, y });
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (transform.scale > 1) {
      setTransform({ scale: 1, x: 0, y: 0 });
    } else {
      setTransform({ scale: 2.5, x: 0, y: 0 });
    }
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
        className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-hidden animate-fade-in select-none"
        style={{ touchAction: 'none' }} // Critical for touch devices
    >
        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 pb-4 pt-[max(env(safe-area-inset-top),20px)] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-bold border border-white/10 pointer-events-auto">
                {currentIndex + 1} / {images.length}
            </div>
            <div className="flex gap-4 pointer-events-auto">
                <button 
                    onClick={handleDownload} 
                    className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
                    disabled={isDownloading}
                >
                    <Download size={20} className={isDownloading ? 'animate-bounce' : ''}/>
                </button>
                <button 
                    onClick={onClose} 
                    className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/20 rounded-full text-white hover:text-red-400 backdrop-blur-md transition-all active:scale-90"
                >
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* IMAGE / GESTURE AREA */}
        <div 
            ref={containerRef}
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            onDoubleClick={handleDoubleTap}
        >
            <img 
                src={images[currentIndex]} 
                alt="Visor"
                className="max-w-full max-h-full object-contain will-change-transform shadow-2xl"
                style={{ 
                    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'none' // Let events bubble to container
                }}
                draggable={false} 
            />
        </div>

        {/* NAVIGATION ARROWS (Desktop only) */}
        <div className="hidden md:block pointer-events-none">
            {currentIndex > 0 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all z-50 active:scale-95 pointer-events-auto"
                >
                    <ArrowLeft size={32} />
                </button>
            )}
            {currentIndex < images.length - 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all z-50 active:scale-95 pointer-events-auto"
                >
                    <ArrowRight size={32} />
                </button>
            )}
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-[max(env(safe-area-inset-bottom),24px)] flex justify-center pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-4 bg-black/70 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
                <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(1, t.scale - 0.5), x: t.scale <= 1.5 ? 0 : t.x, y: t.scale <= 1.5 ? 0 : t.y }))} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={transform.scale <= 1}>
                    <ZoomOut size={24} />
                </button>
                
                <span className="text-white font-mono text-sm min-w-[3rem] text-center font-bold select-none tabular-nums">
                    {Math.round(transform.scale * 100)}%
                </span>

                <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(5, t.scale + 0.5) }))} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={transform.scale >= 5}>
                    <ZoomIn size={24} />
                </button>

                <div className="w-px h-6 bg-white/20 mx-2"></div>

                <button onClick={() => setTransform({ scale: 1, x: 0, y: 0 })} className="p-2 text-white hover:text-blue-400 transition-colors active:scale-90" title="Restablecer">
                    {transform.scale === 1 ? <Maximize size={20} /> : <RotateCcw size={20} />}
                </button>
            </div>
        </div>
    </div>
  );
};