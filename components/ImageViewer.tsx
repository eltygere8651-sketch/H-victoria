import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Download, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cuando cambia el índice (por scroll o flechas), reseteamos el zoom
  useEffect(() => {
    setScale(1);
  }, [currentIndex]);

  // Posicionamiento inicial sin animación
  useEffect(() => {
    if (scrollRef.current) {
      const { offsetWidth } = scrollRef.current;
      scrollRef.current.scrollTo({ left: offsetWidth * startIndex, behavior: 'instant' });
    }
  }, [startIndex]);

  // Detectar el índice actual basado en el scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    const newIndex = Math.round(scrollLeft / offsetWidth);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const { offsetWidth } = scrollRef.current;
    scrollRef.current.scrollTo({ left: offsetWidth * index, behavior: 'smooth' });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) scrollToIndex(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < images.length - 1) scrollToIndex(currentIndex + 1);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => prev === 1 ? 2.5 : 1);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const imageUrl = images[currentIndex];
    const fileName = `hub-imagen-${Date.now()}.jpg`;

    try {
      // Intentamos descargar como Blob para evitar problemas de CORS/pestañas nuevas
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
      console.error("Fallo descarga blob, usando fallback", e);
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

  // Manejo de teclas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) scrollToIndex(currentIndex + 1);
      if (e.key === 'ArrowLeft' && currentIndex > 0) scrollToIndex(currentIndex - 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose]);

  return (
    <div className="fixed inset-0 bg-black z-[99999] flex flex-col animate-fade-in">
        {/* Header: Contador y Cerrar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 pt-safe pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-medium border border-white/10 shadow-lg animate-slide-up">
                {currentIndex + 1} / {images.length}
            </div>
            <button onClick={onClose} className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/20 pointer-events-auto border border-white/10 transition-colors animate-slide-up">
                <X size={24} />
            </button>
        </div>

        {/* Contenedor Scroll Snap: El corazón del deslizamiento nativo */}
        <div 
            ref={scrollRef}
            className={`
                flex-1 flex overflow-x-auto overflow-y-hidden 
                snap-x snap-mandatory no-scrollbar w-full h-full 
                ${scale > 1 ? 'overflow-x-hidden' : ''} /* Evita swipe accidental si hay zoom */
            `}
            onScroll={handleScroll}
            onClick={toggleZoom}
            style={{ scrollBehavior: 'smooth' }}
        >
            {images.map((img, idx) => (
                <div key={idx} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center relative overflow-hidden">
                    <img 
                        src={img} 
                        alt={`Imagen ${idx + 1}`}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out"
                        style={{ 
                            transform: idx === currentIndex ? `scale(${scale})` : 'scale(1)',
                            cursor: scale === 1 ? 'zoom-in' : 'zoom-out'
                        }}
                        loading="lazy"
                        draggable={false}
                    />
                </div>
            ))}
        </div>

        {/* Flechas de Navegación (Visibles en Desktop) */}
        {currentIndex > 0 && (
            <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/20 hidden md:flex z-40 border border-white/10">
                <ArrowLeft size={24} />
            </button>
        )}
        {currentIndex < images.length - 1 && (
            <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/20 hidden md:flex z-40 border border-white/10">
                <ArrowRight size={24} />
            </button>
        )}

        {/* Footer: Controles */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe flex justify-center items-center gap-6 pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
             <button 
                onClick={(e) => { e.stopPropagation(); toggleZoom(e); }}
                className="pointer-events-auto p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 transition-all active:scale-95"
                title={scale === 1 ? "Acercar" : "Alejar"}
             >
                {scale === 1 ? <ZoomIn size={24} /> : <ZoomOut size={24} />}
             </button>

             <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                disabled={isDownloading}
                className="pointer-events-auto flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-900/40 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
             >
                {isDownloading ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                <span>{isDownloading ? '...' : 'Descargar'}</span>
             </button>
        </div>
    </div>
  );
};