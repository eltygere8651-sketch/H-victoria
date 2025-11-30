import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import { storageService } from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Smartphone, Share, PlusSquare, X, Bell, ShoppingCart } from 'lucide-react';
import { User, UserRole, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(storageService.getSession());
  
  const [view, setView] = useState<'inventory' | 'replenish' | 'admin'>(() => {
     const lastView = storageService.getLastView();
     if (lastView === 'inventory' || lastView === 'replenish' || lastView === 'admin') {
       return lastView;
     }
     return user?.role === UserRole.ADMIN ? 'inventory' : 'replenish';
  });
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unreadAdminNotifications, setUnreadAdminNotifications] = useState<AppNotification[]>([]);
  const [initialAdminTab, setInitialAdminTab] = useState<'requests' | 'users' | 'reports'>('requests');
  const displayedToastIds = useRef<Set<string>>(new Set());

  // --- State lifted up for global cart access ---
  const [cart, setCart] = useState<CartItem[]>(storageService.getDraftCart());
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      storageService.saveLastView(view);
    }
  }, [view, user]);

  // Persist cart changes from the global state
  useEffect(() => {
    storageService.saveDraftCart(cart);
  }, [cart]);

  const playNotificationSound = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/beep-07a.mp3'); 
    audio.volume = 0.4;
    audio.play().catch(e => console.warn("Failed to play notification sound:", e));
  };

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user && user.role === UserRole.ADMIN) {
      unsubscribe = storageService.subscribeToNotifications((notifications) => {
        const newUnread = notifications.filter(n => !n.readStatus);
        setUnreadAdminNotifications(newUnread);
        const newToasts = newUnread.filter(
          (notif) => !displayedToastIds.current.has(notif.id)
        );
        if (newToasts.length > 0) {
          setToasts((prev) => [...prev, ...newToasts]);
          newToasts.forEach(notif => displayedToastIds.current.add(notif.id));
          playNotificationSound();
        }
      }, false);
    } else {
      displayedToastIds.current.clear();
      setToasts([]);
    }
    return () => unsubscribe();
  }, [user]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      alert("Para instalar: \n1. Abre el menú del navegador (tres puntos).\n2. Selecciona 'Instalar aplicación' o 'Añadir a pantalla de inicio'.");
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogout = () => {
    storageService.clearSession();
    setUser(null);
    displayedToastIds.current.clear();
    setToasts([]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleReadAndNavigateFromToast = async (notificationId: string) => {
    if (!user) return;
    await storageService.markNotificationAsRead(notificationId, user.id, user.name);
    dismissToast(notificationId);
    setInitialAdminTab('reports');
    setView('admin');
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const unreadCount = unreadAdminNotifications.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-slate-200 transition-colors duration-300">
      
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setShowIOSPrompt(false)}>
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-pop-in relative animate-pop-in" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><X size={24} /></button>
              <div className="text-center">
                 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md">
                    <Logo size="md" />
                 </div>
                 <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 drop-shadow-sm">Instalar en iPhone</h3>
                 <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 drop-shadow-sm">Sigue estos pasos para añadir la App a tu inicio:</p>
                 <div className="space-y-4 text-left bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                       <Share className="text-blue-500" />
                       <span className="text-sm font-bold dark:text-slate-200 drop-shadow-sm">1. Pulsa el botón "Compartir"</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-3">
                       <PlusSquare className="text-gray-900 dark:text-white" />
                       <span className="text-sm font-bold dark:text-slate-200 drop-shadow-sm">2. Selecciona "Añadir a Inicio"</span>
                    </div>
                 </div>
                 <button onClick={() => setShowIOSPrompt(false)} className="w-full mt-6 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-button-red hover:bg-red-700 active:scale-[0.98] transition-all">Entendido</button>
              </div>
           </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700/50 h-screen sticky top-0 p-6 z-30 shadow-md transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 mb-10 pb-8 border-b border-gray-100 dark:border-slate-700/50">
          <Logo size="lg" className="shadow-red-900/50 drop-shadow-lg" />
          <div className="text-center">
            <h1 className="font-black text-2xl tracking-tight text-gray-900 dark:text-white leading-none drop-shadow-sm">HOTEL VICTORIA</h1>
            <p className="text-xs text-red-600 dark:text-red-400 font-bold tracking-[0.2em] uppercase mt-2 drop-shadow-sm">Pedidos Internos</p>
          </div>
        </div>
        <nav className="flex-1 space-y-3">
          {user.role === UserRole.ADMIN && (
            <NavButton 
              active={view === 'inventory'} 
              onClick={() => setView('inventory')} 
              icon={<LayoutGrid size={22} />} 
              label="Inventario" 
            />
          )}
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
                onClick={() => {
                  setView('admin');
                  setInitialAdminTab('requests');
                }} 
                icon={<ShieldCheck size={22} />} 
                label="Administración" 
                badge={unreadCount > 0 ? '!' : undefined}
              />
            </>
          )}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center gap-4 px-5 py-4 mt-6 rounded-2xl transition-all duration-200 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-button-red animate-pulse active:scale-[0.98]"
            >
              <Download size={22} />
              <span className="text-base font-bold drop-shadow-sm">Instalar App</span>
            </button>
          )}
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-slate-700/50">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors font-medium active:scale-[0.98]"
          >
             {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             <span className="drop-shadow-sm">{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          <div className="flex items-center gap-3 mb-4 px-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg shadow-md drop-shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate drop-shadow-sm">{user.name}</p>
              <p className="text-[10px] uppercase text-gray-500 dark:text-slate-400 truncate font-bold tracking-wide drop-shadow-sm">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium active:scale-[0.98]"
          >
            <LogOut size={20} />
            <span className="drop-shadow-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen bg-gray-50 dark:bg-slate-900 relative transition-colors duration-300">
        <div className="md:hidden bg-white dark:bg-slate-800 px-4 pt-safe pb-3 border-b dark:border-slate-700/50 flex justify-between items-center sticky top-0 z-40 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="font-extrabold text-gray-900 dark:text-white leading-tight text-lg drop-shadow-sm">HOTEL VICTORIA</h1>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider drop-shadow-sm">Pedidos Internos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'replenish' && cart.length > 0 && (
              <button
                onClick={() => setShowMobileCart(true)}
                className="relative text-gray-700 dark:text-slate-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-colors"
                aria-label={`Ver carrito con ${cart.length} productos`}
              >
                <ShoppingCart size={22} />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                  {cart.length}
                </span>
              </button>
            )}
            {!isInstalled && (
              <button onClick={handleInstallClick} className="bg-red-600 text-white p-2 rounded-full shadow-md animate-pulse active:scale-95 transition-all">
                <Download size={20} />
              </button>
            )}
            <button onClick={toggleTheme} className="text-gray-700 dark:text-slate-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-colors">
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="text-gray-400 dark:text-slate-400 hover:text-red-600 bg-gray-50 dark:bg-slate-700 p-2 rounded-full active:scale-95 transition-colors">
              <LogOut size={22} />
            </button>
          </div>
        </div>

        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'inventory' && user.role === UserRole.STAFF && (
           <div className="flex h-full items-center justify-center p-8 text-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-pop-in border border-gray-100 dark:border-slate-700/50">
               <ShieldCheck size={60} className="text-red-600 dark:text-red-400 mx-auto mb-4 drop-shadow-sm" />
               <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 drop-shadow-sm">Acceso Denegado</h3>
               <p className="text-lg text-gray-500 dark:text-slate-400 drop-shadow-sm">Solo los administradores pueden ver el inventario.</p>
               <button onClick={() => setView('replenish')} className="mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-button-red hover:bg-red-700 active:scale-[0.98] transition-all">Ir a Realizar Pedido</button>
             </div>
           </div>
        )}
        {view === 'replenish' && (
          <Replenishment
            currentUser={user}
            cart={cart}
            setCart={setCart}
            showMobileCart={showMobileCart}
            setShowMobileCart={setShowMobileCart}
          />
        )}
        {view === 'admin' && <Admin currentUser={user} unreadNotificationsCount={unreadCount} initialTab={initialAdminTab} />}
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700/50 flex justify-around px-2 pt-2 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        {user.role === UserRole.ADMIN && (
          <MobileNavButton 
            active={view === 'inventory'} 
            onClick={() => setView('inventory')} 
            icon={<LayoutGrid size={24} />} 
            label="Stock" 
          />
        )}
        <MobileNavButton 
          active={view === 'replenish'} 
          onClick={() => setView('replenish')} 
          icon={<ClipboardList size={24} />} 
          label="Pedidos" 
        />
        {user.role === UserRole.ADMIN && (
          <MobileNavButton 
            active={view === 'admin'} 
            onClick={() => {
              setView('admin');
              setInitialAdminTab('requests');
            }} 
            icon={<ShieldCheck size={24} />} 
            label="Admin" 
            badge={unreadCount > 0 ? '!' : undefined}
          />
        )}
      </nav>

      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 z-[90] space-y-3 pointer-events-none flex flex-col items-end md:items-start">
        {toasts.map((toast) => (
          <NotificationToast 
            key={toast.id} 
            notification={toast} 
            onDismiss={dismissToast} 
            onReadAndNavigate={handleReadAndNavigateFromToast}
          />
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] relative
    ${
      active 
        ? 'bg-red-600 text-white font-extrabold shadow-xl shadow-button-red' 
        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-red-600 dark:hover:text-red-400 font-medium'
    }`}
  >
    {icon}
    <span className="text-base drop-shadow-sm">{label}</span>
    {badge && (
      <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-800 !important">
          {badge}
      </span>
    )}
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 w-20 py-2 transition-colors active:scale-95 relative
    ${
      active ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'
    }`}
  >
    <div className={`p-3 rounded-full transition-all ${active ? 'bg-red-600 text-white scale-110 shadow-md' : 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-extrabold tracking-wide drop-shadow-sm">{label}</span>
    {badge && (
      <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ring-white dark:ring-slate-800 !important">
          {badge}
      </span>
    )}
  </button>
);

export default App;
