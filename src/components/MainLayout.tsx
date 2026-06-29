import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { Download, Share2, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck, ShoppingCart, X, Volume2, VolumeX, Pause, Play, Sparkles, Bell, ChevronDown, ConciergeBell, LayoutDashboard } from 'lucide-react';
import { User, UserRole, CartItem } from '../types';
import * as storageService from '../services/storageService';
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

const NavButton = React.memo(({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
      relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ease-out overflow-hidden
      outline-none select-none touch-manipulation active:scale-[0.95] group
      flex-1 px-1 py-2 gap-1
      ${isActive 
        ? 'text-amber-500 shadow-[0_4px_12px_-2px_rgba(245,158,11,0.3)] bg-slate-900 dark:bg-slate-800 ring-1 ring-amber-500/50' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 bg-transparent'}
    `}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
      <Icon 
        size={isActive ? 22 : 20} 
        strokeWidth={isActive ? 2.5 : 2} 
        className={`transition-all duration-200 ${isActive ? 'scale-110 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]' : 'scale-100 group-hover:scale-110'}`}
      />
      {hasAlert && !isActive && (
         <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 z-20">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
         </span>
      )}
    </div>
    
    <span className={`text-[9px] font-bold leading-tight whitespace-nowrap tracking-wider uppercase transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
        {label}
    </span>
  </button>
));

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
  const [businessName, setBusinessName] = useState<string>(storageService.activeWorkspaceName || 'MI NEGOCIO');

  useEffect(() => {
    const loadWorkspaceName = async () => {
      const wsId = storageService.activeWorkspaceId;
      if (wsId) {
        // Fallback to fetching in case activeWorkspaceName isn't accurate (should be fine, but just in case)
        const ws = await storageService.getWorkspace(wsId);
        if (ws && ws.name) {
          setBusinessName(ws.name);
          storageService.setActiveWorkspaceId(wsId, ws.name);
        }
      }
    };
    loadWorkspaceName();

    const handleWorkspaceNameChanged = (e: CustomEvent) => {
      setBusinessName(e.detail);
    };

    window.addEventListener('workspaceNameChanged', handleWorkspaceNameChanged as EventListener);
    return () => window.removeEventListener('workspaceNameChanged', handleWorkspaceNameChanged as EventListener);
  }, []);

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
          <div className="flex items-center gap-1 sm:gap-3 group cursor-pointer shrink-0" onClick={() => setShowGuideModal(true)}>
            <div className="relative group-hover:scale-105 transition-transform active:scale-95">
              <Logo size="sm" />
            </div>
            <div className="flex flex-col select-none px-2 sm:px-4">
              <span className="font-sans font-black text-lg sm:text-2xl tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                {businessName.split(' ')[0]}
                {businessName.split(' ').length > 1 && (
                  <span className="text-amber-500 font-light ml-1">{businessName.substring(businessName.indexOf(' ') + 1)}</span>
                )}
              </span>
              <span className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.2em] mt-0.5">
                Staff Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {!isInstalled && (deferredPrompt || isIOS || isAndroid) && (
              <button
                onClick={onInstallClick}
                className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full sm:rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title="Instalar App"
              >
                <Download size={12} className="sm:w-[14px] sm:h-[14px]" />
                <span className="hidden md:inline ml-1">Instalar</span>
              </button>
            )}
            
            {user.role !== UserRole.GUEST && user.role !== UserRole.PROVIDER && (
              <div className={`cart-neon-container h-9 w-9 sm:h-10 sm:w-10 ${hasCartItems ? 'cart-neon-active' : 'cart-neon-empty'}`}>
                <button
                  onClick={() => { setView('replenish'); setShowMobileCart(true); }}
                  className={`cart-btn-core ${hasCartItems ? 'cart-core-active' : 'cart-core-empty'} group`}
                >
                  <ShoppingCart size={14} className={`sm:w-[16px] sm:h-[16px] ${hasCartItems ? 'text-white' : 'text-slate-400'}`} />
                  {hasCartItems && <div className="cart-status-led"></div>}
                </button>
              </div>
            )}

            {/* Volume Control Refactored for Perfection */}
            <div className="relative" ref={volumeMenuRef}>
              <button 
                onClick={() => setShowVolumeMenu(!showVolumeMenu)} 
                className={`flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl transition-all duration-300 border ${showVolumeMenu ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30' : 'bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}
                title="Configuración de sonido"
              >
                {soundEnabled && notificationVolume > 0 ? <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" /> : <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" />}
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
                className={`relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl transition-all duration-300 border bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm overflow-visible ${view === 'admin' ? 'ring-2 ring-amber-500/50' : ''}`}
              >
                <Bell size={16} className={`sm:w-[18px] sm:h-[18px] transition-colors ${unreadAdminNotificationsCount > 0 ? 'text-amber-500 animate-logo-breathe' : 'hover:text-amber-500'}`} />
                {unreadAdminNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-amber-500 text-[8px] sm:text-[9px] font-black text-white flex items-center justify-center ring-1 sm:ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                      {unreadAdminNotificationsCount}
                    </span>
                  </span>
                )}
              </button>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="btn-header-action h-9 w-9 sm:h-10 sm:w-10 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border-none shadow-none active:scale-90 transition-colors"
              title={darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {darkMode ? <Sun size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-header-action h-9 w-9 sm:h-10 sm:w-10 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border-none shadow-none active:scale-90 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO CON PADDING PARA LA CABECERA FIJA */}
      <main className="flex-1 w-full pt-[var(--header-h)] pb-32 pb-safe">
        {children}
      </main>

      {/* DOCK INFERIOR - Optimized for spacing and touch */}
      {user.role !== UserRole.PROVIDER && (
        <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-[45] flex justify-center px-2 sm:px-6 pointer-events-none pb-safe">
          <nav className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-white/20 dark:border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.25)] rounded-3xl sm:rounded-[2.5rem] p-1 flex items-center justify-between gap-0.5 sm:gap-1 w-full max-w-lg ring-1 ring-black/5">
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