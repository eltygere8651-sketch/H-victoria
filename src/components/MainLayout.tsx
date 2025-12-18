import React from 'react';
import { Logo } from './Logo';
import { Download, Share2, Sun, Moon, LogOut, ClipboardCheck, ClipboardList, LayoutGrid, ShieldCheck, ShoppingCart, HelpCircle } from 'lucide-react';
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
    <div className={`min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-500 antialiased ${darkMode ? 'dark' : ''} bg-premium overflow-x-hidden`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* MODERN GLASS HEADER */}
      <header className="flex-shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-sm z-30 p-4 border-b border-slate-100 dark:border-slate-800 transition-all sticky top-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowGuideModal(true)}>
            <div className="p-1.5 bg-red-600 rounded-xl shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                <Logo size="sm" solid />
            </div>
            <div className="flex flex-col">
                <span className="font-black text-xl text-slate-900 dark:text-white leading-none uppercase tracking-tighter">Hub</span>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Enterprise Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Guide Button - Llamativo e Intuitivo */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="relative p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-90 border border-blue-100 dark:border-blue-800/50"
              title="Guía de Usuario"
            >
              <HelpCircle size={20} strokeWidth={2.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            </button>

            {/* Header Shopping Cart */}
            {user.role !== UserRole.GUEST && (
              <button
                onClick={() => { setView('replenish'); setShowMobileCart(true); }}
                className={`relative p-2.5 rounded-2xl transition-all active:scale-90 flex items-center justify-center border-2 ${cart.length > 0 ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <ShoppingCart size={20} strokeWidth={2.5} />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-900 text-red-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-red-600 animate-pop-in">
                    {cart.length}
                  </span>
                )}
              </button>
            )}

            {!isInstalled && (deferredPrompt || isIOS) && (
              <button 
                onClick={() => isIOS ? setShowIOSPrompt(true) : deferredPrompt.prompt()} 
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2.5 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-90"
                title="Instalar App"
              >
                <Download size={20} strokeWidth={2.5} />
              </button>
            )}

            {user.role === UserRole.ADMIN && (
              <button onClick={handleSharePublicAccess} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-90 shadow-sm"><Share2 size={20} strokeWidth={2.5} /></button>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90">{darkMode ? <Sun size={20} strokeWidth={2.5}/> : <Moon size={20} strokeWidth={2.5}/>}</button>
            <button onClick={handleLogout} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-600 transition-all active:scale-90"><LogOut size={20} strokeWidth={2.5}/></button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pb-32">
        {children}
      </main>

      <div className="fixed bottom-6 inset-x-0 z-[45] flex justify-center px-6 pointer-events-none pb-safe">
        <nav className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-1.5 flex items-center justify-between gap-1 w-full max-w-md ring-1 ring-black/5">
            <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks}/>

            {user.role !== UserRole.GUEST && (
              <NavButton icon={ClipboardList} label="Pedidos" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
            )}
            
            {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Stock" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
            {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} hasAlert={unreadAdminNotificationsCount > 0} />}
        </nav>
      </div>
    </div>
  );
};