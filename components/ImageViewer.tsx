import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Download, RefreshCw, Share, Image as ImageIcon } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

// Helper para convertir Base64 o Blob a File object
const urlToFile = async (url: string, filename: string): Promise<File | null> => {
  try {
    if (url.startsWith('data:')) {
      const arr = url.split(',');
      const match = arr[0].match(/:(.*?);/);
      if (!match) return null;
      const mime = match[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } else {
      // Para URLs remotas (Firebase Storage), las descargamos como Blob primero
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    }
  } catch (e) {
    console.error("Error converting URL to file", e);
    return null;
  }
};

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [transform, setTransform] = useState({ scale: 1, posX: 0, posY: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const isPanning = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef(0);
  const [isSharing, setIsSharing] = useState(false);

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

  const handleSmartDownload = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const imageUrl = images[currentIndex];
    const fileName = `hub-imagen-${Date.now()}.jpg`;

    try {
      // Obtener el archivo real (sea Base64 o URL remota)
      const file = await urlToFile(imageUrl, fileName);
      
      // 1. Intentar usar la API de compartir nativa (iOS/Android)
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Imagen de Hub',
          text: 'Adjunto compartido desde Hub'
        });
        setIsSharing(false);
        return;
      }
    } catch (error) {
      console.log('Native share not supported or cancelled, falling back to download.', error);
    }

    // 2. Fallback: Descarga directa (Desktop / Navegadores sin soporte de share)
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      // Para URLs remotas (CORS), esto podría abrir en nueva pestaña, pero para Base64 descarga directo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download fallback failed", e);
      alert("No se pudo descargar la imagen.");
    } finally {
      setIsSharing(false);
    }
  };

  // Determinar si el dispositivo soporta compartir archivos nativamente
  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
  
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
            onClick={(e) => { e.stopPropagation(); handleSmartDownload(); }} 
            disabled={isSharing}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-900/50 hover:bg-red-500 active:scale-95 transition-all border border-red-400/30"
          >
            {isSharing ? <RefreshCw size={20} className="animate-spin"/> : supportsNativeShare ? <Share size={20}/> : <Download size={20} />}
            <span>{supportsNativeShare ? 'Guardar / Compartir' : 'Descargar'}</span>
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