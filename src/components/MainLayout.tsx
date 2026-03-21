import React from 'react';
import { Logo } from './Logo';
import { Download, Share2, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck, ShoppingCart, X, Volume2, VolumeX } from 'lucide-react';
import { User, UserRole, CartItem } from '../types';

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
  handleLogout: () => void;
  handleSharePublicAccess: () => void;
  setShowGuideModal: (value: boolean) => void;
  setShowMobileCart: (value: boolean) => void;
  setShowIOSPrompt: (value: boolean) => void;
  showIOSPrompt?: boolean;
  deferredPrompt: any;
  isInstalled: boolean;
  isIOS: boolean;
  hasUnreadTasks: boolean;
  unreadAdminNotificationsCount: number;
}

const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
      relative flex items-center justify-center rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
      outline-none select-none touch-manipulation active:scale-90 group
      ${isActive ? 'px-4 py-3.5 gap-2' : 'px-1 py-3.5'} 
      ${isActive 
        ? 'flex-[6] bg-red-600 text-white shadow-xl shadow-red-600/30' 
        : 'flex-[1] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-400 dark:text-slate-500'
      }
    `}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
      <Icon 
        size={20} 
        strokeWidth={isActive ? 3 : 2} 
        className={`transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}
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
      ${isActive ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}
    `}>
      <span className="text-[10px] font-black leading-tight whitespace-nowrap uppercase tracking-widest pt-0.5">
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
  handleLogout,
  handleSharePublicAccess,
  setShowGuideModal,
  setShowMobileCart,
  setShowIOSPrompt,
  showIOSPrompt,
  deferredPrompt,
  isInstalled,
  isIOS,
  hasUnreadTasks,
  unreadAdminNotificationsCount
}) => {
  const hasCartItems = cart.length > 0;

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-500 antialiased ${darkMode ? 'dark' : ''} bg-premium relative overflow-x-hidden`}>
      {/* HEADER GLOBAL FIJO */}
      <header 
        className="fixed top-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl shadow-sm z-50 border-b border-slate-200 dark:border-white/5 flex items-center px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 group cursor-pointer shrink-0" onClick={() => setShowGuideModal(true)}>
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform">
              <Logo size="sm" solid />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter italic">Hub</span>
              <span className="text-[6px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest leading-none">Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isInstalled && (deferredPrompt || isIOS) && (
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                  } else if (isIOS) {
                    setShowIOSPrompt(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title="Instalar App"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}
            {user.role !== UserRole.GUEST && user.role !== UserRole.PROVIDER && (
              <div className={`cart-neon-container h-12 w-12 ${hasCartItems ? 'cart-neon-active' : 'cart-neon-empty'}`}>
                <button
                  onClick={() => { setView('replenish'); setShowMobileCart(true); }}
                  className={`cart-btn-core ${hasCartItems ? 'cart-core-active' : 'cart-core-empty'} group`}
                >
                  <ShoppingCart size={20} className={hasCartItems ? 'text-white' : 'text-slate-400'} />
                  {hasCartItems && <div className="cart-status-led"></div>}
                </button>
              </div>
            )}
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`btn-header-action ${soundEnabled ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`} title={soundEnabled ? 'Silenciar notificaciones' : 'Activar sonido de notificaciones'}>
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="btn-header-action text-amber-500 dark:text-yellow-400"><Sun size={20} /></button>
            <button onClick={handleLogout} className="btn-header-action text-red-500 dark:text-red-400"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* CONTENIDO CON PADDING PARA LA CABECERA FIJA */}
      <main className="flex-1 w-full pt-20 pb-32">
        {children}
      </main>

      {/* DOCK INFERIOR */}
      {user.role !== UserRole.PROVIDER && (
        <div className="fixed bottom-6 inset-x-0 z-[45] flex justify-center px-6 pointer-events-none pb-safe">
          <nav className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.25)] rounded-[2.5rem] p-1.5 flex items-center justify-between gap-1 w-full max-w-md ring-1 ring-black/5">
              <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks}/>
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
    </div>
  );
};