import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Smartphone, Monitor, Square, Maximize } from 'lucide-react';

interface PremiumVideoPlayerProps {
  url: string;
}

export const PremiumVideoPlayer: React.FC<PremiumVideoPlayerProps> = ({ url }) => {
  const [format, setFormat] = useState<'vertical' | 'horizontal'>('vertical');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const toggleFormat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (format === 'vertical') setFormat('horizontal');
    else setFormat('vertical');
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-[2rem] border-4 border-white dark:border-slate-800 overflow-hidden flex-shrink-0 shadow-2xl snap-start group bg-black transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] premium-video-container
        ${format === 'vertical' ? 'w-48 h-80 md:w-56 md:h-96' : 'w-72 h-40 md:w-96 md:h-56'}
      `}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      onClick={(e) => {
        // Prevent event propagation so clicking the video doesn't trigger card tasks.
        e.stopPropagation();
      }}
    >
      <video 
        ref={videoRef}
        src={`${url}#t=0.001`} 
        className="w-full h-full object-cover transition-all"
        preload="metadata"
        playsInline
        muted={isMuted}
        loop
        onClick={togglePlay}
      />
      
      {/* Central Play/Pause button */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20" onClick={togglePlay}>
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] transform scale-100 transition-transform">
            <Play size={32} className="text-white fill-white" />
          </div>
        </div>
      )}

      {/* Premium Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between gap-2 mt-auto pt-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlay} 
              className="p-2 hover:bg-white/20 bg-black/40 rounded-xl backdrop-blur-md text-white transition-all active:scale-90 shadow-lg border border-white/10"
            >
              {isPlaying ? <Pause size={16} className="fill-white" /> : <Play size={16} className="fill-white" />}
            </button>
            <button 
              onClick={toggleMute}
              className="p-2 hover:bg-white/20 bg-black/40 rounded-xl backdrop-blur-md text-white transition-all active:scale-90 shadow-lg border border-white/10"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 bg-black/40 rounded-xl backdrop-blur-md text-white transition-all active:scale-90 shadow-lg border border-white/10"
            >
              <Maximize size={16} />
            </button>
          </div>
          
          <button 
            onClick={toggleFormat}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/20 bg-black/40 rounded-xl backdrop-blur-md text-white transition-all active:scale-90 shadow-lg border border-white/10"
            title="Cambiar formato"
          >
            {format === 'vertical' && <Smartphone size={16} />}
            {format === 'horizontal' && <Monitor size={16} />}
            <span className="text-[10px] uppercase font-black tracking-widest hidden sm:block">
              {format === 'vertical' ? 'Vertical' : 'Horizontal'}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
};
