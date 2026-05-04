import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { Download, Share2, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck, ShoppingCart, X, Volume2, VolumeX, Pause, Play, Sparkles, Bell, ChevronDown, ConciergeBell, LayoutDashboard } from 'lucide-react';
import { User, UserRole, CartItem } from '../types';
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
  hasUnreadReservations: boolean;
  hasUnreadSalones: boolean;
  hasPendingDailyTasks: boolean;
  unreadAdminNotificationsCount: number;
}

const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
      relative flex items-center justify-center rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
      outline-none select-none touch-manipulation active:scale-[0.92] group border border-white/5 dark:border-white/10
      ${isActive ? 'px-3 sm:px-4 py-2.5 sm:py-3 gap-2' : 'px-1 sm:px-2 py-2.5 sm:py-3'} 
      ${isActive 
        ? 'flex-[6] text-white shadow-[0_10px_25px_-5px_rgba(220,38,38,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] bg-[linear-gradient(110deg,#dc2626,45%,#fbbf24,55%,#dc2626)] bg-[length:200%_100%] animate-shine ring-1 ring-white/30' 
        : 'flex-[1] text-white/70 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] bg-[linear-gradient(110deg,#991b1b,45%,#854d0e,55%,#991b1b)] bg-[length:200%_100%] animate-shine opacity-85 hover:opacity-100 backdrop-blur-sm'
      }
    `}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    {/* Upper Reflective Glaze */}
    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none opacity-50" />
    
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
      <Icon 
        size={isActive ? 22 : 20} 
        strokeWidth={isActive ? 3 : 2.5} 
        className={`transition-all duration-700 ${isActive ? 'scale-110 rotate-[2deg] drop-shadow-md' : 'scale-100 group-hover:scale-110 drop-shadow-sm'}`}
      />
      {hasAlert && !isActive && (
         <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-20">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 ring-2 ring-white dark:ring-slate-900 shadow-sm"></span>
         </span>
      )}
    </div>
    
    <div className={`
      overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center
      ${isActive ? 'max-w-[100px] opacity-100 ml-1' : 'max-w-0 opacity-0'}
    `}>
      <span className="text-[10px] sm:text-xs font-black leading-tight whitespace-nowrap uppercase tracking-[0.15em] pt-0.5 filter drop-shadow-sm">
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
  hasUnreadReservations,
  hasUnreadSalones,
  hasPendingDailyTasks,
  unreadAdminNotificationsCount
}) => {
  const hasCartItems = cart.length > 0;
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
  const volumeMenuRef = useRef<HTMLDivElement>(null);

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
      {/* HEADER GLOBAL FIJO */}
      <header 
        className="fixed top-0 left-0 right-0 h-[var(--header-h)] bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl shadow-sm z-50 border-b border-slate-200 dark:border-white/5 flex items-center px-3 sm:px-4 pb-2"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0" onClick={() => setShowGuideModal(true)}>
            <div className="relative group-hover:scale-105 transition-transform active:scale-95">
              <Logo size="sm" />
            </div>
            <div className="flex flex-col select-none px-4 sm:px-6 overflow-visible">
              <motion.div 
                className="relative select-none py-2"
                initial={{ rotateY: 0, rotateX: 0 }}
                animate={{ 
                  rotateY: [-15, 15, -15],
                  rotateX: [5, -5, 5],
                }}
                transition={{ 
                  rotateY: { duration: 12, repeat: Infinity, ease: "easeInOut" },
                  rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{ 
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <span className="relative block font-black text-3xl sm:text-4xl uppercase tracking-tighter italic leading-none
                  text-transparent bg-clip-text bg-[linear-gradient(110deg,#dc2626,45%,#d4af37,55%,#dc2626)] bg-[length:200%_100%]
                  animate-shine drop-shadow-[0_1px_0_#991b1b] drop-shadow-[0_2px_0_#7f1d1d] drop-shadow-[0_4px_0_#450a0a] 
                  drop-shadow-[0_15px_30px_rgba(220,38,38,0.3)]
                  dark:bg-[linear-gradient(110deg,#ef4444,45%,#fbbf24,55%,#ef4444)] dark:bg-[length:200%_100%]
                  dark:drop-shadow-[0_1px_0_#7f1d1d] dark:drop-shadow-[0_2px_0_#450a0a] dark:drop-shadow-[0_5px_20px_rgba(220,38,38,0.2)]
                "
                style={{ 
                  fontFamily: '"Outfit", sans-serif',
                  transform: 'translateZ(60px)',
                  paddingRight: '10px'
                }}>
                  Hub
                </span>
              </motion.div>
              <span className="text-[9px] font-black text-red-600/80 dark:text-red-400/80 uppercase tracking-[0.35em] leading-none mt-0 font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-600 animate-ping"></span>
                Ecosystem
              </span>
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
                className={`flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl transition-all duration-300 border ${showVolumeMenu ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30' : 'bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}
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
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${soundEnabled ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}
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
                          className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-30"
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
                                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${soundType === t ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
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
              className="btn-header-action h-9 w-9 sm:h-10 sm:w-10 text-red-500 dark:text-red-400 border-none shadow-none active:scale-90"
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
          <nav className="pointer-events-auto bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl border border-white/20 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-1.5 flex items-center justify-between gap-1 w-full max-w-lg ring-1 ring-black/5">
              <NavButton 
                icon={ConciergeBell} 
                label="Reservas" 
                isActive={view === 'reservations'} 
                onClick={() => setView('reservations')} 
                hasAlert={hasUnreadReservations}
              />
              <NavButton 
                icon={LayoutDashboard} 
                label="Salones" 
                isActive={view === 'salones'} 
                onClick={() => setView('salones')} 
                hasAlert={hasUnreadSalones}
              />
              <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks || hasPendingDailyTasks}/>
              {user.role !== UserRole.GUEST && <NavButton icon={ClipboardList} label="Pedidos" isActive={view === 'replenish'} onClick={() => setView('replenish')} />}
              {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Almacén" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
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
                className="w-full mt-2 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all"
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
                  className="w-full mt-2 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all"
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