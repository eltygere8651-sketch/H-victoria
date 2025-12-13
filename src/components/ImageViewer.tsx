import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Download, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset al cambiar de imagen
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Manejo de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, scale]);

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // --- LÓGICA DE ZOOM ---

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4)); // Máximo zoom 4x
  };

  const zoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 }); // Resetear posición si volvemos a 1x
      return newScale;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // Zoom con rueda del ratón
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5); // Zoom rápido a 2.5x
    }
  };

  // --- LÓGICA DE PANEO (ARRASTRAR) Y SWIPE ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // Guardamos la posición inicial relativa a la posición actual de la imagen
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Lógica inteligente:
    // Si hay Zoom (>1): Permitimos mover la imagen libremente (Pan).
    // Si NO hay Zoom (=1): Solo permitimos movimiento horizontal para simular Swipe.
    if (scale > 1) {
        setPosition({ x: newX, y: newY });
    } else {
        // Solo swipe horizontal con resistencia vertical
        setPosition({ x: newX, y: 0 }); 
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);

    // Lógica de Swipe (Solo si estamos en escala 1)
    if (scale === 1) {
      const deltaX = e.clientX - (dragStart.x + position.x); // Diferencia bruta desde el inicio del toque
      const threshold = 50; // Píxeles necesarios para cambiar
      
      // Si se movió lo suficiente y no es la primera/última imagen bloqueada
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && currentIndex > 0) {
            prevImage();
        } else if (deltaX < 0 && currentIndex < images.length - 1) {
            nextImage();
        }
      }
      
      // Siempre reseteamos la posición a 0,0 al soltar en escala 1 (efecto snap-back)
      setPosition({ x: 0, y: 0 });
    }
  };

  // --- DESCARGA ---
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
        className="fixed inset-0 z-[99999] bg-black/95 flex flex-col overflow-hidden animate-fade-in touch-none select-none"
        onWheel={handleWheel}
        // touch-none previene el scroll del navegador en móviles
    >
        {/* BARRA SUPERIOR */}
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

        {/* ÁREA DE IMAGEN PRINCIPAL */}
        <div 
            ref={containerRef}
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            // onDoubleClick maneja el doble toque en PC y algunos móviles
            onDoubleClick={handleDoubleTap}
        >
            <img 
                src={images[currentIndex]} 
                alt="Visor"
                className="max-w-full max-h-full object-contain will-change-transform shadow-2xl"
                style={{ 
                    // Usamos transform3d para aceleración por hardware en móviles
                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out', // Suavidad al soltar, respuesta inmediata al arrastrar
                }}
                draggable={false} // Importante para evitar el arrastre nativo de la imagen fantasma
            />
        </div>

        {/* FLECHAS DE NAVEGACIÓN (Solo Desktop) */}
        {currentIndex > 0 && (
            <button 
                onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all hidden md:flex z-50"
            >
                <ArrowLeft size={32} />
            </button>
        )}
        {currentIndex < images.length - 1 && (
            <button 
                onClick={(e) => { e.stopPropagation(); nextImage(); }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-md border border-white/5 transition-all hidden md:flex z-50"
            >
                <ArrowRight size={32} />
            </button>
        )}

        {/* CONTROLES INFERIORES */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl z-50 pb-safe">
            <button onClick={zoomOut} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale <= 1}>
                <ZoomOut size={24} />
            </button>
            
            <span className="text-white font-mono text-sm min-w-[3rem] text-center font-bold">
                {Math.round(scale * 100)}%
            </span>

            <button onClick={zoomIn} className="p-2 text-white hover:text-red-400 transition-colors active:scale-90 disabled:opacity-30" disabled={scale >= 4}>
                <ZoomIn size={24} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-2"></div>

            <button onClick={resetZoom} className="p-2 text-white hover:text-blue-400 transition-colors active:scale-90" title="Restablecer">
                {scale === 1 ? <Maximize size={20} /> : <RotateCcw size={20} />}
            </button>
        </div>
    </div>
  );
};