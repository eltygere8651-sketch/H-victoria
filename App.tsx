import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Share, PlusSquare, X, Bell, ShoppingCart, ClipboardCheck, AlertCircle } from 'lucide-react';
import { User, UserRole, AppNotification, CartItem, Task } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(storageService.getSession());
  
  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks'>(() => {
     const lastView = storageService.getLastView();
     const sessionUser = storageService.getSession();
     
     let defaultView: 'inventory' | 'replenish' | 'tasks' = 'replenish';
     if (sessionUser?.role === UserRole.ADMIN) {
        defaultView = 'inventory';
     }

     if (lastView === 'inventory' || lastView === 'replenish' || lastView === 'admin' || lastView === 'tasks') {
       if (sessionUser?.role === UserRole.STAFF && (lastView === 'admin' || lastView === 'inventory')) return defaultView;
       // @ts-ignore
       return lastView;
     }
     return defaultView;
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
  const displayedNativeNotificationIds = useRef<Set<string>>(new Set());

  const [cart, setCart] = useState<CartItem[]>(storageService.getDraftCart());
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const cleanupPerformed = useRef(false);
  const audioAlertRef = useRef<{
    context: AudioContext | null;
    intervalId: number | null;
    isPlaying: boolean;
  }>({ context: null, intervalId: null, isPlaying: false });

  // New state for task notifications
  const [hasUnreadTasks, setHasUnreadTasks] = useState(false);
  const taskAudioRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    if (user && user.role === UserRole.ADMIN) {
      console.log('Admin user detected, initializing push notifications...');
      initializePushNotifications(user);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN && !cleanupPerformed.current) {
      console.log("Admin session started, running task cleanup...");
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
    if (!user) {
      cleanupPerformed.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#111827' : '#ffffff');
  }, [darkMode]);

  useEffect(() => { if (user) storageService.saveLastView(view); }, [view, user]);
  useEffect(() => { storageService.saveDraftCart(cart); }, [cart]);

  const showNativeNotification = (notification: AppNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
       if (document.hidden) { // Only show native notification if tab is not active
         const n = new Notification(notification.title, {
            body: notification.message,
            icon: '/logo192.png', // Make sure you have this icon
            badge: '/logo192.png',
            tag: notification.id, // Use ID to prevent duplicate notifications
         });
         n.onclick = () => {
            window.focus();
            setView('admin');
            setInitialAdminTab('reports');
         };
       }
    }
  };

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user && user.role === UserRole.ADMIN) {
      unsubscribe = storageService.subscribeToNotifications((notifications) => {
        const newUnread = notifications.filter(n => !n.readStatus);
        setUnreadAdminNotifications(newUnread);

        const newToasts = newUnread.filter(n => !displayedToastIds.current.has(n.id));
        if (newToasts.length > 0) {
          setToasts((prev) => [...prev, ...newToasts]);
          newToasts.forEach(n => {
            displayedToastIds.current.add(n.id);
            if (!displayedNativeNotificationIds.current.has(n.id)) {
              showNativeNotification(n);
              displayedNativeNotificationIds.current.add(n.id);
            }
          });
        }
      }, true);
    } else {
      displayedToastIds.current.clear();
      displayedNativeNotificationIds.current.clear();
      setToasts([]);
      setUnreadAdminNotifications([]);
    }
    return () => unsubscribe();
  }, [user]);

  const playTaskAlertSound = () => {
    try {
      if (!taskAudioRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        taskAudioRef.current = new AudioContext();
      }
      const ctx = taskAudioRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Could not play task alert sound.", e);
    }
  };

  useEffect(() => {
    if (!user) {
      setHasUnreadTasks(false);
      return;
    }

    const unsubscribe = storageService.subscribeToTasks((allTasks: Task[]) => {
      const isUnread = allTasks.some(task => !task.seenBy?.includes(user.id));
      
      if (isUnread && !hasUnreadTasks) {
        playTaskAlertSound();
      }
      setHasUnreadTasks(isUnread);
    });

    return () => unsubscribe();
  }, [user, hasUnreadTasks]);


  const stopAlertSound = () => {
    if (audioAlertRef.current.intervalId) {
      clearInterval(audioAlertRef.current.intervalId);
    }
    audioAlertRef.current.isPlaying = false;
    audioAlertRef.current.intervalId = null;
  };

  const startAlertSound = () => {
    if (audioAlertRef.current.isPlaying) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API is not supported.");
        return;
      }

      if (!audioAlertRef.current.context) {
        audioAlertRef.current.context = new AudioContext();
      }
      const ctx = audioAlertRef.current.context;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playBeep = () => {
          if (ctx.state !== 'running') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(900, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
      };
      
      playBeep();
      const intervalId = window.setInterval(playBeep, 2000);

      audioAlertRef.current = { ...audioAlertRef.current, isPlaying: true, intervalId: intervalId };
    } catch (e) {
      console.warn("Could not start alert sound.", e);
      stopAlertSound();
    }
  };

  useEffect(() => {
    const hasUnread = unreadAdminNotifications.length > 0;
    
    if (hasUnread && view !== 'admin') {
      startAlertSound();
    } else {
      stopAlertSound();
    }

    return () => {
      stopAlertSound();
    };
  }, [unreadAdminNotifications.length, view]);

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
      await storageService.markNotificationAsRead(notification.id, user.id, user.name);
      setInitialAdminTab('reports');
      setView('admin');
      removeToast(notification.id);
    }
  };
  
  if (!user) return <Login onLogin={(u) => { setUser(u); setView(u.role === UserRole.ADMIN ? 'inventory' : 'replenish'); }} />;

  const NavButton = ({ icon: Icon, label, isActive, onClick, notificationCount = 0, isCart = false, hasAlert = false }: any) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center w-full text-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
      <div className={`relative w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-red-500/10 dark:bg-red-500/10' : ''}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
         {hasAlert && <AlertCircle size={16} className="absolute top-0 right-0 text-white fill-red-500 animate-pulse" />}
      </div>
      <span className={`text-xs font-bold transition-colors ${isActive ? 'text-slate-800 dark:text-slate-100' : ''}`}>{label}</span>
      {notificationCount > 0 && <span className="absolute top-1 right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-950">{notificationCount}</span>}
      {isCart && cart.length > 0 && <span className="absolute top-1 right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-950">{cart.length}</span>}
    </button>
  );

  const DesktopNavButton = ({ icon: Icon, label, isActive, onClick, notificationCount = 0, hasAlert = false }: any) => (
    <button onClick={onClick} className={`relative flex items-center justify-start w-full text-left gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
      <Icon size={22} strokeWidth={2.5} />
      <span>{label}</span>
      {notificationCount > 0 && <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-800">{notificationCount}</span>}
      {hasAlert && <AlertCircle size={18} className="absolute top-3 right-3 text-white fill-red-500 animate-pulse" />}
    </button>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-8">
          <Logo size="md" />
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">Hub</h1>
            <p className="text-sm font-bold text-red-600 dark:text-red-500">Tu Negocio, Sincronizado</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {user.role === UserRole.ADMIN && <DesktopNavButton icon={LayoutGrid} label="Inventario" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
          <DesktopNavButton icon={ClipboardList} label="Hacer Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
          <DesktopNavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks} />
          {user.role === UserRole.ADMIN && <DesktopNavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} notificationCount={unreadAdminNotifications.length} />}
        </nav>
        <div className="space-y-2">
          {!isInstalled && (deferredPrompt || isIOS) && <button onClick={handleInstallClick} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"><Download size={22} /> Instalar App</button>}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50">{darkMode ? <Sun size={22} /> : <Moon size={22} />} {darkMode ? 'Modo Claro' : 'Modo Oscuro'}</button>
          <button onClick={handleLogout} className="flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"><LogOut size={22} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 pt-safe z-30">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <h1 className="font-extrabold text-lg text-gray-900 dark:text-white">Hub</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-slate-400">
              <span className="sr-only">Toggle Theme</span>
              {darkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-600 dark:text-slate-400">
              <span className="sr-only">Logout</span>
              <LogOut size={22} />
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {view === 'inventory' && <Inventory currentUser={user} />}
            {view === 'replenish' && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
            {view === 'admin' && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
            {view === 'tasks' && <Tasks currentUser={user} />}
        </div>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 px-2 pb-safe z-20">
          <div className="flex justify-around items-center h-20">
            {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Inventario" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
            <NavButton icon={ClipboardList} label="Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
            <NavButton icon={ShoppingCart} label="Carrito" isActive={showMobileCart} onClick={() => setShowMobileCart(!showMobileCart)} isCart />
            <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks} />
            {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} notificationCount={unreadAdminNotifications.length} />}
          </div>
        </div>
      </main>

      <div aria-live="assertive" className="fixed inset-0 flex flex-col items-end px-4 py-6 pt-safe pointer-events-none sm:p-6 sm:items-start z-[100]">
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map(toast => (
            <NotificationToast 
              key={toast.id} 
              notification={toast} 
              onDismiss={removeToast}
              onReadAndNavigate={() => handleReadAndNavigate(toast)}
            />
          ))}
        </div>
      </div>
      
       {showIOSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 text-center animate-slide-up">
            <X onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-gray-400" />
            <h3 className="font-bold text-xl mb-4">Instalar en tu iPhone</h3>
            <p className="mb-4">Para instalar la app, toca el botón de <Share className="inline-block mx-1" /> y después selecciona <PlusSquare className="inline-block mx-1" /> "Añadir a pantalla de inicio".</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
