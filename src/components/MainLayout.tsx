import React from 'react';
import { Logo } from './Logo';
import { Download, Share, PlusSquare, ShoppingCart, Share2, HelpCircle, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck } from 'lucide-react';
import { User, UserRole, CartItem } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  user: User;
  view: string;
  setView: (view: any) => void;
  cart: CartItem[];
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  handleLogout: () => void;
  handleSharePublicAccess: () => void;
  setShowGuideModal: (value: boolean) => void;
  setShowMobileCart: (value: boolean) => void;
  setShowIOSPrompt: (value: boolean) => void;
  deferredPrompt: any;
  isInstalled: boolean;
  isIOS: boolean;
  hasUnreadTasks: boolean;
  unreadAdminNotificationsCount: number;
}

// --- Internal Component: NavButton ---
const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
      relative flex items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
      outline-none select-none touch-manipulation active:scale-95 group
      ${isActive ? 'px-3.5 py-3 gap-1.5' : 'px-1 py-3'} 
      ${isActive 
        ? 'flex-[8] bg-red-600 text-white shadow-neon dark:shadow-red-900/50' 
        : 'flex-[1] bg-gray-50/80 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400'
      }
    `}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
      <Icon 
        size={20} 
        strokeWidth={2.5} 
        className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-100 group-hover:scale-110'}`}
      />
      {hasAlert && !isActive && (
         <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-20">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 ring-2 ring-white dark:ring-slate-900"></span>
         </span>
      )}
    </div>
    
    <div className={`
      overflow-hidden transition-all duration-300 ease-out flex items-center justify-center
      ${isActive ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4'}
    `}>
      <span className="text-[11px] font-bold leading-tight whitespace-nowrap tracking-wide pt-0.5">
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
  handleLogout,
  handleSharePublicAccess,
  setShowGuideModal,
  setShowMobileCart,
  setShowIOSPrompt,
  deferredPrompt,
  isInstalled,
  isIOS,
  hasUnreadTasks,
  unreadAdminNotificationsCount
}) => {
  return (
    <div className={`min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 antialiased ${darkMode ? 'dark' : ''} bg-premium overflow-x-hidden`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* HEADER */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm z-30 p-4 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300 sticky top-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-extrabold text-2xl text-gray-900 dark:text-white hidden sm:inline">Hub</span>
            {user.role === UserRole.GUEST && (
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-bold">Invitado</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            
            {/* Header Cart Button */}
            {user.role !== UserRole.GUEST && (
              <button
                onClick={() => {
                  setView('replenish');
                  setShowMobileCart(true);
                }}
                className={`
                  relative p-3 rounded-full transition-all active:scale-95 flex items-center justify-center mr-2 shadow-sm
                  ${cart.length > 0 
                    ? 'bg-red-600 text-white shadow-red-200 dark:shadow-none' 
                    : 'bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }
                `}
                aria-label="Ver carrito"
              >
                <ShoppingCart size={20} strokeWidth={2.5} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-red-600 animate-pop-in">
                    {cart.length}
                  </span>
                )}
              </button>
            )}

            {!isInstalled && deferredPrompt && (
              <button onClick={async () => deferredPrompt.prompt()} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95"><Download size={16} strokeWidth={2.5} /> Instalar</button>
            )}
            {!isInstalled && isIOS && !(window.navigator as any).standalone && (
                <button onClick={() => setShowIOSPrompt(true)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95"><PlusSquare size={16} strokeWidth={2.5} /> Instalar</button>
            )}

            {user.role === UserRole.ADMIN && (
              <button 
                onClick={handleSharePublicAccess} 
                className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 active:scale-95 transition-colors shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-900/30"
                title="Compartir Acceso"
              >
                <Share2 size={20} strokeWidth={2.5} />
              </button>
            )}

             <button 
                onClick={() => setShowGuideModal(true)} 
                className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-colors shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/30"
                title="Guía de Usuario"
              >
                <HelpCircle size={20} strokeWidth={2.5} />
              </button>

            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-gray-100/80 dark:bg-slate-800/80 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors">{darkMode ? <Sun size={20} strokeWidth={2.5}/> : <Moon size={20} strokeWidth={2.5}/>}</button>
            <button onClick={handleLogout} className="p-3 bg-gray-100/80 dark:bg-slate-800/80 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors"><LogOut size={20} strokeWidth={2.5}/></button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* FLOATING DOCK NAVIGATION */}
      <div className="fixed bottom-6 inset-x-0 z-20 flex justify-center px-4 pointer-events-none pb-safe">
        <nav 
          className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-dock dark:shadow-dock-dark rounded-full p-1.5 flex items-center justify-between gap-1 w-full max-w-md transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5"
        >
            <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks}/>

            {user.role !== UserRole.GUEST && (
              <NavButton icon={ClipboardList} label="Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
            )}
            
            {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Stock" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
            {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} hasAlert={unreadAdminNotificationsCount > 0} />}
        </nav>
      </div>
    </div>
  );
};