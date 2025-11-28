import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import { storageService } from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, FileText, Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';

const App: React.FC = () => {
  // Initialize user from persisted session
  const [user, setUser] = useState<User | null>(storageService.getSession());
  
  // Initialize view from last saved state or default to inventory
  const [view, setView] = useState<'inventory' | 'replenish' | 'admin'>(() => {
     const lastView = storageService.getLastView();
     if (lastView === 'inventory' || lastView === 'replenish' || lastView === 'admin') {
       return lastView;
     }
     return 'inventory';
  });
  
  // Dark Mode Logic
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // PWA Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Capture install prompt (Chrome/Android)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true); // Assume success for immediate UI feedback
      }
    } else {
      // Fallback for browsers that don't support programmatic install but aren't iOS
      alert("Para instalar: \n1. Abre el menú del navegador (tres puntos).\n2. Selecciona 'Instalar aplicación' o 'Añadir a pantalla de inicio'.");
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Persist view changes
  useEffect(() => {
    if (user) {
      storageService.saveLastView(view);
    }
  }, [view, user]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogout = () => {
    storageService.clearSession();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* iOS Install Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowIOSPrompt(false)}>
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-pop-in relative animate-pop-in" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><X size={24} /></button>
              <div className="text-center">
                 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md">
                    <Logo size="md" />
                 </div>
                 <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Instalar en iPhone</h3>
                 <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Sigue estos pasos para añadir la App a tu inicio:</p>
                 
                 <div className="space-y-4 text-left bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                       <Share className="text-blue-500" />
                       <span className="text-sm font-bold dark:text-slate-200">1. Pulsa el botón "Compartir"</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-3">
                       <PlusSquare className="text-gray-900 dark:text-white" />
                       <span className="text-sm font-bold dark:text-slate-200">2. Selecciona "Añadir a Inicio"</span>
                    </div>
                 </div>
                 <button onClick={() => setShowIOSPrompt(false)} className="w-full mt-6 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-button-red hover:bg-red-700 active:scale-[0.98] transition-all">Entendido</button>
              </div>
           </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700/50 h-screen sticky top-0 p-6 z-30 shadow-md transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 mb-10 pb-8 border-b border-gray-100 dark:border-slate-700/50">
          <Logo size="lg" className="shadow-red-900/50 drop-shadow-lg" />
          <div className="text-center">
            <h1 className="font-black text-2xl tracking-tight text-gray-900 dark:text-white leading-none">HOTEL VICTORIA</h1>
            <p className="text-xs text-red-600 dark:text-red-400 font-bold tracking-[0.2em] uppercase mt-2">Pedidos Internos</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          <NavButton 
            active={view === 'inventory'} 
            onClick={() => setView('inventory')} 
            icon={<LayoutGrid size={22} />} 
            label="Inventario" 
          />
          <NavButton 
            active={view === 'replenish'} 
            onClick={() => setView('replenish')} 
            icon={<ClipboardList size={22} />} 
            label="Realizar Pedido" 
          />
          
          {user.role === UserRole.ADMIN && (
            <>
              <div className="my-4 border-t border-gray-100 dark:border-slate-700/50"></div>
              <NavButton 
                active={view === 'admin'} 
                onClick={() => setView('admin')} 
                icon={<ShieldCheck size={22} />} 
                label="Administración" 
              />
            </>
          )}

          {/* Install PWA Button Desktop - Always show if not installed */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center gap-4 px-5 py-4 mt-6 rounded-2xl transition-all duration-200 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-button-red animate-pulse active:scale-[0.98]"
            >
              <Download size={22} />
              <span className="text-base font-bold">Instalar App</span>
            </button>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-slate-700/50">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-gray-50 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors font-medium active:scale-[0.98]"
          >
             {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <div className="flex items-center gap-3 mb-4 px-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] uppercase text-gray-500 dark:text-slate-400 truncate font-bold tracking-wide">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium active:scale-[0.98]"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen bg-gray-50 dark:bg-slate-900 relative transition-colors duration-300">
        {/* Mobile Top Bar */}
        <div className="md:hidden bg-white dark:bg-slate-800 px-4 py-3 border-b dark:border-slate-700/50 flex justify-between items-center sticky top-0 z-40 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="font-extrabold text-gray-900 dark:text-white leading-tight text-lg">HOTEL VICTORIA</h1>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Pedidos Internos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isInstalled && (
              <button onClick={handleInstallClick} className="bg-red-600 text-white p-2 rounded-full shadow-md animate-pulse active:scale-95 transition-all">
                <Download size={20} />
              </button>
            )}
            <button onClick={toggleTheme} className="text-gray-400 dark:text-slate-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-colors">
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="text-gray-400 dark:text-slate-400 hover:text-red-600 bg-gray-50 dark:bg-slate-700 p-2 rounded-full active:scale-95 transition-colors">
              <LogOut size={22} />
            </button>
          </div>
        </div>

        {view === 'inventory' && <Inventory currentUser={user} />}
        {view === 'replenish' && <Replenishment currentUser={user} />}
        {view === 'admin' && <Admin currentUser={user} />}
      </main>

      {/* Mobile Bottom Navigation (Z-40 to sit BEHIND modals which are Z-50/60) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700/50 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <MobileNavButton 
          active={view === 'inventory'} 
          onClick={() => setView('inventory')} 
          icon={<LayoutGrid size={24} />} 
          label="Stock" 
        />
        <MobileNavButton 
          active={view === 'replenish'} 
          onClick={() => setView('replenish')} 
          icon={<ClipboardList size={24} />} 
          label="Pedidos" 
        />
        
        {user.role === UserRole.ADMIN && (
          <MobileNavButton 
            active={view === 'admin'} 
            onClick={() => setView('admin')} 
            icon={<ShieldCheck size={24} />} 
            label="Admin" 
          />
        )}
      </nav>
    </div>
  );
};

// UI Helper Components
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]
    ${
      active 
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold shadow-sm ring-1 ring-red-100 dark:ring-red-500/20' 
        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white font-medium'
    }`}
  >
    {icon}
    <span className="text-base">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 w-20 py-2 transition-colors active:scale-95
    ${
      active ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'
    }`}
  >
    <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-red-50 dark:bg-red-900/20 scale-110 shadow-sm' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);

export default App;