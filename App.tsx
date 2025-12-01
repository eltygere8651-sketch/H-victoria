import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Share, PlusSquare, X, ShoppingCart, ClipboardCheck } from 'lucide-react';
import { AuthenticatedUser, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';

type View = 'inventory' | 'replenish' | 'admin' | 'tasks';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthenticatedUser | null>(storageService.getSession());
  const [view, setView] = useState<View>('replenish');
  
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

  const [cart, setCart] = useState<CartItem[]>(storageService.getDraftCart());
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const cleanupPerformed = useRef(false);

  const getDefaultView = (authedUser: AuthenticatedUser): View => {
    if (authedUser.role === 'ADMIN') return 'inventory';
    if (authedUser.role === 'STAFF') return 'replenish';
    return 'tasks'; // Fallback
  };

  useEffect(() => {
    const sessionUser = storageService.getSession();
    if (sessionUser) {
      const lastView = storageService.getLastView() as View | null;
      const defaultView = getDefaultView(sessionUser);
      if (lastView) {
        let canAccessLastView = true;
        if ((lastView === 'inventory' || lastView === 'admin') && sessionUser.role !== 'ADMIN') {
            canAccessLastView = false;
        }
        setView(canAccessLastView ? lastView : defaultView);
      } else {
        setView(defaultView);
      }
    }
  }, [user]);
  
  useEffect(() => {
    if (user && user.role === 'ADMIN' && !cleanupPerformed.current) {
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
    if (!user) cleanupPerformed.current = false;
  }, [user]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) setIsInstalled(true);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); localStorage.setItem('theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  useEffect(() => { if (user) storageService.saveLastView(view); }, [view, user]);
  useEffect(() => { storageService.saveDraftCart(cart); }, [cart]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user && user.role === 'ADMIN') {
      unsubscribe = storageService.subscribeToNotifications((notifications) => {
        const newUnread = notifications.filter(n => !n.readStatus);
        setUnreadAdminNotifications(newUnread);
        const newToasts = newUnread.filter(n => !displayedToastIds.current.has(n.id));
        if (newToasts.length > 0) {
          setToasts((prev) => [...prev, ...newToasts]);
          newToasts.forEach(n => displayedToastIds.current.add(n.id));
        }
      }, true);
    } else {
      displayedToastIds.current.clear();
      setToasts([]);
    }
    return () => unsubscribe();
  }, [user]);

  const handleInstallClick = async () => {
    if (isIOS) setShowIOSPrompt(true);
    else if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };
  
  const handleLogout = () => { storageService.clearSession(); setUser(null); setCart([]); };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  
  const handleReadAndNavigate = async (notification: AppNotification) => {
    if (user) {
      await storageService.markNotificationAsRead(notification.id, user.name);
      setInitialAdminTab('reports');
      setView('admin');
      removeToast(notification.id);
    }
  };

  const handleLogin = (authedUser: AuthenticatedUser) => {
    setUser(authedUser);
    setView(getDefaultView(authedUser));
  };
  
  if (!user) return <Login onLogin={handleLogin} />;

  const NavButton = ({ icon: Icon, label, isActive, onClick, notificationCount = 0, isCart = false }: any) => (
    <button onClick={onClick} className={`relative flex flex-col md:flex-row items-center justify-center md:justify-start w-full text-left gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-base font-bold transition-all ${isActive ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
      <Icon size={24} />
      <span className="md:inline">{label}</span>
      {notificationCount > 0 && <span className="absolute top-0 right-0 md:top-2 md:right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-800">{notificationCount}</span>}
      {isCart && cart.length > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-800">{cart.length}</span>}
    </button>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-8"><Logo size="md" /><div><h1 className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">Hub</h1><p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">Control proactivo</p></div></div>
        <nav className="flex-1 space-y-2">
          {user.role === 'ADMIN' && <NavButton icon={LayoutGrid} label="Inventario" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
          <NavButton icon={ClipboardList} label="Hacer Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
          <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} />
          {user.role === 'ADMIN' && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} notificationCount={unreadAdminNotifications.length} />}
        </nav>
        <div className="space-y-2">
          {!isInstalled && (deferredPrompt || isIOS) && <button onClick={handleInstallClick} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"><Download size={22} /> Instalar App</button>}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50">{darkMode ? <Sun size={22} /> : <Moon size={22} />} {darkMode ? 'Modo Claro' : 'Modo Oscuro'}</button>
          <button onClick={handleLogout} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"><LogOut size={22} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700/50 p-4 pt-safe z-30">
          <div className="flex items-center gap-2"><Logo size="sm" /><h1 className="font-extrabold text-lg text-gray-900 dark:text-white">Hub</h1></div>
          <div className="flex items-center gap-2">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-slate-400"><span className="sr-only">Toggle Theme</span>{darkMode ? <Sun size={22} /> : <Moon size={22} />}</button>
             <button onClick={handleLogout} className="p-2 text-slate-600 dark:text-slate-400"><span className="sr-only">Logout</span><LogOut size={22} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {view === 'inventory' && user.role === 'ADMIN' && <Inventory currentUser={user} />}
          {view === 'replenish' && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
          {view === 'tasks' && <Tasks currentUser={user} />}
          {view === 'admin' && user.role === 'ADMIN' && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        </div>
        
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-700/50 flex justify-around p-2 pb-safe z-30">
          {user.role === 'ADMIN' && <NavButton icon={LayoutGrid} label="Inventario" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
          <NavButton icon={ClipboardList} label="Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
          <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} />
          {user.role === 'ADMIN' && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} notificationCount={unreadAdminNotifications.length} />}
          {view === 'replenish' && <NavButton icon={ShoppingCart} label="Carrito" isActive={showMobileCart} onClick={() => setShowMobileCart(true)} isCart={true} />}
        </nav>
      </main>

      <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map(toast => <NotificationToast key={toast.id} notification={toast} onDismiss={removeToast} onReadAndNavigate={() => handleReadAndNavigate(toast)} />)}
        </div>
      </div>

      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center p-4 backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 text-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Instalar App en tu iPhone</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">Para instalar, pulsa el botón <Share className="inline-block mx-1" /> y luego selecciona <PlusSquare className="inline-block mx-1" /> "Añadir a pantalla de inicio".</p>
            <button onClick={() => setShowIOSPrompt(false)} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl active:scale-95">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;