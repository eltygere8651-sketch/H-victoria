import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Logo } from './Logo';
import { Download, Share2, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck, ShoppingCart, X, Volume2, VolumeX, Pause, Play, Sparkles, Bell, ChevronDown } from 'lucide-react';
import { User, UserRole, CartItem } from '../types';
import { useSpeech } from '../context/SpeechContext';
import { motion, AnimatePresence } from 'motion/react';

interface MainLayoutProps {
  children: React.ReactNode;
  user: User;
  view: string;
  setView: (view: any) => void;
  cart: CartItem[];
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  notificationVolume: number;
  setNotificationVolume: (value: number) => void;
  soundType: string;
  setSoundType: (value: string) => void;
  playTestSound: (typeOverride?: string) => void;
  handleLogout: () => void;
  handleSharePublicAccess: () => void;
  setShowGuideModal: (value: boolean) => void;
  setShowMobileCart: (value: boolean) => void;
  setShowIOSPrompt: (value: boolean) => void;
  showIOSPrompt?: boolean;
  setShowAndroidPrompt: (value: boolean) => void;
  showAndroidPrompt?: boolean;
  onInstallClick?: () => void;
  deferredPrompt: any;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasUnreadTasks: boolean;
  hasPendingDailyTasks: boolean;
  unreadAdminNotificationsCount: number;
}

const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
      relative flex items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
      outline-none select-none touch-manipulation active:scale-90 group
      ${isActive ? 'px-3 sm:px-4 py-2.5 sm:py-3 gap-1.5 sm:gap-2' : 'px-1 sm:px-2 py-2.5 sm:py-3'} 
      ${isActive 
        ? 'flex-[5] sm:flex-[6] bg-red-600 text-white shadow-lg shadow-red-600/30' 
        : 'flex-[1] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-400 dark:text-slate-500'
      }
    `}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
      <Icon 
        size={isActive ? 22 : 20} 
        strokeWidth={isActive ? 3 : 2} 
        className={`transition-all duration-500 ${isActive ? 'scale-100' : 'scale-100 group-hover:scale-110'}`}
      />
      {hasAlert && !isActive && (
         <span className="absolute -top-1 -right-1 flex h-3 w-3 z-20">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 ring-2 ring-white dark:ring-slate-900"></span>
         </span>
      )}
    </div>
    
    <div className={`
      overflow-hidden transition-all duration-500 ease-out flex items-center justify-center
      ${isActive ? 'max-w-[80px] sm:max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}
    `}>
      <span className="text-[9px] sm:text-[10px] font-black leading-tight whitespace-nowrap uppercase tracking-widest pt-0.5">
        {label}
      </span>
    </div>
  </button>
);

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  user,
  view,
  setView,
  cart,
  darkMode,
  setDarkMode,
  soundEnabled,
  setSoundEnabled,
  notificationVolume,
  setNotificationVolume,
  soundType,
  setSoundType,
  playTestSound,
  handleLogout,
  handleSharePublicAccess,
  setShowGuideModal,
  setShowMobileCart,
  setShowIOSPrompt,
  showIOSPrompt,
  setShowAndroidPrompt,
  showAndroidPrompt,
  onInstallClick,
  deferredPrompt,
  isInstalled,
  isIOS,
  isAndroid,
  hasUnreadTasks,
  hasPendingDailyTasks,
  unreadAdminNotificationsCount
}) => {
  const hasCartItems = cart.length > 0;
  const { isSpeaking, stopSpeech, togglePause, isPaused, narratorTitle, narratorSubtitle } = useSpeech();
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
  const [aiCompact, setAiCompact] = useState(false);
  const [aiSize, setAiSize] = useState({ width: 180, height: 160 });
  const [aiPosition, setAiPosition] = useState({ x: 0, y: 0 });
  const aiRef = useRef<HTMLDivElement>(null);
  const volumeMenuRef = useRef<HTMLDivElement>(null);

  // Smart Positioning: Avoid covering text
  const adjustPositionToAvoidText = useCallback(() => {
    if (!aiRef.current) return;
    
    const rect = aiRef.current.getBoundingClientRect();
    // Check 9 points surrounding and inside the component to ensure it's not covering text
    const points = [
      { x: rect.left + 5, y: rect.top + 5 },
      { x: rect.right - 5, y: rect.top + 5 },
      { x: rect.left + 5, y: rect.bottom - 5 },
      { x: rect.right - 5, y: rect.bottom - 5 },
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      { x: rect.left + rect.width / 2, y: rect.top + 5 },
      { x: rect.left + rect.width / 2, y: rect.bottom - 5 },
      { x: rect.left + 5, y: rect.top + rect.height / 2 },
      { x: rect.right - 5, y: rect.top + rect.height / 2 }
    ];

    let isCoveringText = false;
    for (const point of points) {
      if (point.x < 0 || point.x > window.innerWidth || point.y < 0 || point.y > window.innerHeight) continue;
      
      const elements = document.elementsFromPoint(point.x, point.y);
      for (const el of elements) {
        // Skip itself and ignore containers that don't directly render text
        if (el === aiRef.current || aiRef.current.contains(el)) continue;
        
        const tagName = el.tagName.toLowerCase();
        // Detect even very short text (>= 2 chars) to catch labels and small hints
        const hasText = el.textContent?.trim().length ? el.textContent.trim().length >= 2 : false;
        
        // Block list for text elements
        const textElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li', 'a', 'button', 'input', 'label', 'strong', 'em', 'td', 'th'];
        
        if (textElements.includes(tagName) && hasText) {
          isCoveringText = true;
          break;
        }
      }
      if (isCoveringText) break;
    }

    if (isCoveringText) {
      // Try to find a safe spot by moving in a cycle of directions
      setAiPosition(prev => {
        const moveAmount = 60;
        let nextX = prev.x;
        let nextY = prev.y;

        // Simple heuristic: if we're near the right edge, move left. If left, move right.
        if (rect.right > window.innerWidth - 100) {
          nextX -= moveAmount;
        } else if (rect.left < 100) {
          nextX += moveAmount;
        } else {
          // Default to moving left or up
          nextX -= moveAmount;
          nextY -= 20; 
        }

        // Keep within bounds
        const padding = 20;
        const boundedX = Math.min(Math.max(nextX, -window.innerWidth + rect.width + padding), padding);
        const boundedY = Math.min(Math.max(nextY, -window.innerHeight + rect.height + padding), padding);

        return { x: boundedX, y: boundedY };
      });
      
      // Check again after a short delay if it's still covering
      setTimeout(adjustPositionToAvoidText, 300);
    }
  }, []);

  useEffect(() => {
    if (isSpeaking) {
      const timer = setTimeout(adjustPositionToAvoidText, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, adjustPositionToAvoidText]);

  // Close volume menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeMenuRef.current && !volumeMenuRef.current.contains(event.target as Node)) {
        setShowVolumeMenu(false);
      }
    };
    if (showVolumeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeMenu]);

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-500 antialiased ${darkMode ? 'dark' : ''} bg-premium relative`}>
      {/* Global Narrator HUD - Futuristic AI Face */}
      <AnimatePresence mode="wait">
        {isSpeaking && (
          <motion.div 
            key="ai-assistant-hud"
            ref={aiRef}
            drag
            dragMomentum={false}
            initial={{ scale: 0, opacity: 0, x: 20, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              x: aiPosition.x, 
              y: aiPosition.y,
              width: aiCompact ? 100 : aiSize.width,
              height: aiCompact ? 100 : aiSize.height
            }}
            exit={{ scale: 0, opacity: 0 }}
            onDragEnd={(_, info) => {
              setAiPosition(prev => ({
                x: prev.x + info.delta.x,
                y: prev.y + info.delta.y
              }));
              setTimeout(adjustPositionToAvoidText, 500);
            }}
            className="fixed bottom-32 right-8 z-[100] cursor-move select-none"
            style={{ 
              touchAction: 'none',
              maxWidth: '90vw',
              maxHeight: '70vh'
            }}
          >
            <div className="relative group h-full w-full">
              {/* Resize Handle */}
              {!aiCompact && (
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 z-[120] cursor-nwse-resize flex items-center justify-center text-red-500/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.pageX;
                    const startY = e.pageY;
                    const startW = aiSize.width;
                    const startH = aiSize.height;

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      const newW = Math.max(180, startW + (moveEvent.pageX - startX));
                      const newH = Math.max(150, startH + (moveEvent.pageY - startY));
                      setAiSize({ width: newW, height: newH });
                    };

                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    const startX = touch.pageX;
                    const startY = touch.pageY;
                    const startW = aiSize.width;
                    const startH = aiSize.height;

                    const onTouchMove = (moveEvent: TouchEvent) => {
                      const moveTouch = moveEvent.touches[0];
                      const newW = Math.max(180, startW + (moveTouch.pageX - startX));
                      const newH = Math.max(150, startH + (moveTouch.pageY - startY));
                      setAiSize({ width: newW, height: newH });
                    };

                    const onTouchEnd = () => {
                      document.removeEventListener('touchmove', onTouchMove);
                      document.removeEventListener('touchend', onTouchEnd);
                    };

                    document.addEventListener('touchmove', onTouchMove);
                    document.addEventListener('touchend', onTouchEnd);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 11L1 1M11 6L6 11M11 1L11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              )}

              {/* Compact Toggle Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setAiCompact(!aiCompact);
                }}
                className="absolute -top-2 -right-2 z-[110] w-7 h-7 bg-red-600 rounded-full border border-white/20 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
                title={aiCompact ? "Expandir" : "Contraer"}
              >
                <motion.div animate={{ rotate: aiCompact ? 180 : 0 }}>
                  <ChevronDown size={16} strokeWidth={3} />
                </motion.div>
              </button>

              {/* Core Glowing Aura */}
              <motion.div 
                animate={{ 
                  scale: aiCompact ? [0.9, 1.1, 0.9] : [1, 1.15, 1],
                  opacity: aiCompact ? [0.3, 0.5, 0.3] : [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-[-10px] bg-red-600/30 rounded-full blur-3xl z-0"
              />

              {/* Rotating Outer Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className={`absolute ${aiCompact ? 'inset-0' : 'inset-[-4px]'} border-2 border-dashed border-red-600/20 rounded-[2rem] z-0 pointer-events-none`}
              />

              {/* AI Head Container */}
              <motion.div 
                animate={{ 
                  borderRadius: aiCompact ? '50%' : '2rem'
                }}
                className="bg-[#05060a]/95 backdrop-blur-3xl border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)] overflow-hidden relative flex flex-col items-center justify-center p-4 w-full h-full"
              >
                {/* Holographic Hex Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-50" />
                
                <div className={`flex flex-col items-center gap-4 relative z-10 w-full h-full justify-center ${aiCompact ? 'scale-90' : ''}`}>
                  {/* The Face */}
                  <div className={`flex items-center justify-center ${aiCompact ? 'gap-3' : 'gap-6'} py-1 transition-all`}>
                    {/* Left Eye */}
                    <div className="relative">
                      <motion.div 
                        animate={{ 
                          height: aiCompact ? 6 : [10, 10, 1, 10], 
                          width: aiCompact ? 12 : (aiSize.width > 250 ? 40 : 32),
                          borderRadius: aiCompact ? '50%' : '9999px',
                          scaleX: aiCompact ? 1 : [1, 1.2, 0.8, 1],
                          backgroundColor: ["#dc2626", "#ef4444", "#dc2626"]
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                        className="bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)]"
                      />
                    </div>
                    {/* Right Eye */}
                    <div className="relative">
                      <motion.div 
                        animate={{ 
                          height: aiCompact ? 6 : [10, 10, 1, 10],
                          width: aiCompact ? 12 : (aiSize.width > 250 ? 40 : 32),
                          borderRadius: aiCompact ? '50%' : '9999px',
                          scaleX: aiCompact ? 1 : [1, 1.2, 0.8, 1],
                          backgroundColor: ["#dc2626", "#ef4444", "#dc2626"]
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, delay: 0.15, times: [0, 0.92, 0.97, 1] }}
                        className="bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)]"
                      />
                    </div>
                  </div>

                  {!aiCompact && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-4 w-full h-full justify-between"
                    >
                      {/* Speech Waveform */}
                      <div className="flex items-center gap-0.5 h-6">
                        {[...Array(Math.floor(aiSize.width / 15))].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ 
                              height: isPaused ? 2 : [2, Math.random() * (aiSize.height / 8) + 4, 2],
                            }}
                            transition={{ 
                              duration: 0.25, 
                              repeat: Infinity, 
                              delay: i * 0.03,
                              ease: "linear"
                            }}
                            className="w-[3px] bg-red-600/80 rounded-full"
                          />
                        ))}
                      </div>

                      {/* Text Info */}
                      <div className="text-center w-full">
                        <div className="text-[8px] font-black text-red-500 uppercase tracking-[0.4em] mb-1 leading-none opacity-80">
                          Neural Unit 01
                        </div>
                        <div className="text-xs font-bold text-white truncate max-w-[160px] italic px-1 mx-auto">
                          {narratorTitle || 'Asistente IA'}
                        </div>
                      </div>

                      {/* Minimalist Controls */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); togglePause(); }}
                          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
                        >
                          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); stopSpeech(); }}
                          className="w-10 h-10 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-600/20 text-red-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                        >
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Vertical Scanline */}
                <motion.div 
                  animate={{ top: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[100px] bg-gradient-to-b from-transparent via-red-600/[0.05] to-transparent z-0 pointer-events-none"
                />
              </motion.div>

              {/* Minimal Drag Handle */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase text-red-500/40 tracking-[0.3em] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Sistema de Navegación
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER GLOBAL FIJO */}
      <header 
        className="fixed top-0 left-0 right-0 h-[var(--header-h)] bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl shadow-sm z-50 border-b border-slate-200 dark:border-white/5 flex items-center px-3 sm:px-4 pb-2"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0" onClick={() => setShowGuideModal(true)}>
            <div className="relative group-hover:scale-105 transition-transform active:scale-95">
              <Logo size="sm" solid />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Hub</span>
              <span className="text-[6px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest leading-none mt-0.5 sm:mt-1">Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {!isInstalled && (deferredPrompt || isIOS || isAndroid) && (
              <button
                onClick={onInstallClick}
                className="flex items-center justify-center p-2 sm:px-2.5 sm:py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full sm:rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title="Instalar App"
              >
                <Download size={14} />
                <span className="hidden md:inline ml-1">Instalar</span>
              </button>
            )}
            
            {user.role !== UserRole.GUEST && user.role !== UserRole.PROVIDER && (
              <div className={`cart-neon-container h-9 w-9 sm:h-10 sm:w-10 ${hasCartItems ? 'cart-neon-active' : 'cart-neon-empty'}`}>
                <button
                  onClick={() => { setView('replenish'); setShowMobileCart(true); }}
                  className={`cart-btn-core ${hasCartItems ? 'cart-core-active' : 'cart-core-empty'} group`}
                >
                  <ShoppingCart size={16} className={hasCartItems ? 'text-white' : 'text-slate-400'} />
                  {hasCartItems && <div className="cart-status-led"></div>}
                </button>
              </div>
            )}

            {/* Volume Control Refactored for Perfection */}
            <div className="relative" ref={volumeMenuRef}>
              <button 
                onClick={() => setShowVolumeMenu(!showVolumeMenu)} 
                className={`flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl transition-all duration-300 border ${showVolumeMenu ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}
                title="Configuración de sonido"
              >
                {soundEnabled && notificationVolume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <AnimatePresence>
                {showVolumeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-5 z-[100] backdrop-blur-2xl"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sonido</span>
                        <button 
                          onClick={() => setSoundEnabled(!soundEnabled)} 
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${soundEnabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}
                        >
                          {soundEnabled ? 'ENCENDIDO' : 'APAGADO'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Volumen</span>
                          <span>{Math.round(notificationVolume * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          disabled={!soundEnabled}
                          value={notificationVolume} 
                          onChange={(e) => setNotificationVolume(Number(e.target.value))}
                          onMouseUp={() => playTestSound()}
                          onTouchEnd={() => playTestSound()}
                          className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
                        />
                      </div>

                      <div className="space-y-2">
                         <span className="text-[10px] font-bold text-slate-500">Tono de alerta</span>
                         <div className="grid grid-cols-2 gap-1.5">
                            {['Default', 'Modern', 'Crystal', 'Retro'].map((t) => (
                              <button
                                key={t}
                                onClick={() => {
                                  setSoundType(t);
                                  playTestSound(t);
                                }}
                                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${soundType === t ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              >
                                {t === 'Default' ? 'Básico' : t}
                              </button>
                            ))}
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Indicator for Admin */}
            {user.role === UserRole.ADMIN && (
              <button 
                onClick={() => setView('admin')}
                className={`relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl transition-all duration-300 border bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm overflow-visible ${view === 'admin' ? 'ring-2 ring-red-500/50' : ''}`}
              >
                <Bell size={18} className={unreadAdminNotificationsCount > 0 ? 'text-red-500 animate-logo-breathe' : ''} />
                {unreadAdminNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[8px] font-black text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {unreadAdminNotificationsCount}
                    </span>
                  </span>
                )}
              </button>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="btn-header-action h-9 w-9 sm:h-10 sm:w-10 text-amber-500 dark:text-yellow-400 border-none shadow-none active:scale-90"
              title={darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-header-action h-9 w-9 sm:h-10 sm:w-10 text-red-500 dark:text-red-400 border-none shadow-none active:scale-90"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO CON PADDING PARA LA CABECERA FIJA */}
      <main className="flex-1 w-full pt-[var(--header-h)] pb-32">
        {children}
      </main>

      {/* DOCK INFERIOR - Optimized for spacing and touch */}
      {user.role !== UserRole.PROVIDER && (
        <div className="fixed bottom-6 inset-x-0 z-[45] flex justify-center px-4 sm:px-6 pointer-events-none pb-safe">
          <nav className="pointer-events-auto bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl border border-white/20 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-1.5 flex items-center justify-between gap-1 w-full max-w-md ring-1 ring-black/5">
              <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks || hasPendingDailyTasks}/>
              {user.role !== UserRole.GUEST && <NavButton icon={ClipboardList} label="Pedidos" isActive={view === 'replenish'} onClick={() => setView('replenish')} />}
              {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Stock" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
              {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} hasAlert={unreadAdminNotificationsCount > 0} />}
          </nav>
        </div>
      )}

      {/* IOS INSTALL PROMPT MODAL */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up relative">
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Share2 size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Instalar App en iOS</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Para instalar esta aplicación en tu iPhone o iPad, pulsa el botón <strong>Compartir</strong> en la barra de navegación y luego selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
              </p>
              <button 
                onClick={() => setShowIOSPrompt(false)}
                className="w-full mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showAndroidPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up relative">
            <button 
              onClick={() => setShowAndroidPrompt(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Download size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Instalar App en Android</h3>
              {(() => {
                const isInAppBrowser = /FBAV|FBAN|Instagram|Line|Snapchat|WhatsApp|Viber|Twitter|TikTok/i.test(navigator.userAgent);
                if (deferredPrompt) {
                  return (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Instala esta aplicación en tu dispositivo para un acceso más rápido y una mejor experiencia.
                    </p>
                  );
                } else if (isInAppBrowser) {
                  return (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Estás usando un navegador integrado. Para instalar la app, pulsa el menú y selecciona <strong>"Abrir en Chrome"</strong> o <strong>"Abrir en el navegador"</strong>.
                    </p>
                  );
                } else {
                  return (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Para instalar esta aplicación, pulsa el menú de los <strong>3 puntos</strong> en la esquina superior derecha de tu navegador y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.
                    </p>
                  );
                }
              })()}
              {deferredPrompt ? (
                <button 
                  onClick={() => {
                    if (onInstallClick) onInstallClick();
                  }}
                  className="w-full mt-2 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                >
                  Instalar Ahora
                </button>
              ) : (
                <button 
                  onClick={() => setShowAndroidPrompt(false)}
                  className="w-full mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};