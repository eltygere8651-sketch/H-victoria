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
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());

  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks'>(() => {
    const lastView = storageService.getLastView();
    const sessionUser = storageService.getSession();

    let defaultView: 'inventory' | 'replenish' | 'tasks' = 'replenish';
    if (sessionUser?.role === UserRole.ADMIN) defaultView = 'inventory';
    if (lastView === 'inventory' || lastView === 'replenish' || lastView === 'admin' || lastView === 'tasks') {
      if (sessionUser?.role === UserRole.STAFF && (lastView === 'admin' || lastView === 'inventory')) return defaultView;
      return lastView as any;
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
  const [hasUnreadTasks, setHasUnreadTasks] = useState(false);
  const audioContextUnlocked = useRef(false);

  // Inicialización de la app
  useEffect(() => {
    const initializeApp = async () => {
      await storageService.ensureAnonymousAuth();
      setIsInitializing(false);
    };
    initializeApp();
  }, []);

  // Desbloquear AudioContext en interacción del usuario
  const unlockAudio = () => {
    if (audioContextUnlocked.current) return;
    try {
      if (audioAlertRef.current.context && audioAlertRef.current.context.state === 'suspended') {
        audioAlertRef.current.context.resume();
      } else if (!audioAlertRef.current.context) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) audioAlertRef.current.context = new AudioContext();
      }
      audioContextUnlocked.current = true;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    } catch (e) {
      console.warn("Could not unlock AudioContext.", e);
    }
  };

  useEffect(() => {
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Inicializar notificaciones push
  useEffect(() => {
    const isSandboxed = window.location.origin.includes('usercontent.goog');
    if (user && !isSandboxed) initializePushNotifications(user);
  }, [user]);

  // Limpieza de tareas completadas para admin
  useEffect(() => {
    if (user && user.role === UserRole.ADMIN && !cleanupPerformed.current) {
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
    if (!user) cleanupPerformed.current = false;
  }, [user]);

  // Manejo de PWA y tema
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#111827' : '#ffffff');
  }, [darkMode]);

  // --- NEW: PWA Installation Logic ---
  useEffect(() => {
    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', appInstalledHandler);
    
    // Check if the app is already running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Detect if the device is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);
  
  useEffect(() => { if (user) storageService.saveLastView(view); }, [view, user]);
  useEffect(() => { storageService.saveDraftCart(cart); }, [cart]);

  const showNativeNotification = (notification: AppNotification) => {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: notification.id,
      });
      n.onclick = () => {
        window.focus();
        setView('admin');
        setInitialAdminTab('reports');
      };
    }
  };

  // Suscripción a notificaciones admin
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user && user.role === UserRole.ADMIN) {
      unsubscribe = storageService.subscribeToNotifications((notifications) => {
        const newUnread = notifications.filter(n => !n.readStatus);
        setUnreadAdminNotifications(newUnread);
        const newToasts = newUnread.filter(n => !displayedToastIds.current.has(n.id));
        if (newToasts.length > 0) {
          setToasts(prev => [...prev, ...newToasts]);
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

  // Alertas de sonido
  const stopAlertSound = () => {
    if (audioAlertRef.current.intervalId) clearInterval(audioAlertRef.current.intervalId);
    audioAlertRef.current.isPlaying = false;
    audioAlertRef.current.intervalId = null;
  };

  const startAlertSound = () => {
    if (audioAlertRef.current.isPlaying || !audioContextUnlocked.current) return;
    try {
      const ctx = audioAlertRef.current.context;
      if (!ctx || ctx.state !== 'running') return;

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
      audioAlertRef.current = { ...audioAlertRef.current, isPlaying: true, intervalId };
    } catch (e) {
      console.warn("Could not start alert sound.", e);
      stopAlertSound();
    }
  };

  const hasUnreadAdminAlerts = unreadAdminNotifications.length > 0;

  useEffect(() => {
    const shouldPlayAdminAlert = hasUnreadAdminAlerts && view !== 'admin';
    const shouldPlayTaskAlert = hasUnreadTasks && view !== 'tasks';
    if (shouldPlayAdminAlert || shouldPlayTaskAlert) startAlertSound();
    else stopAlertSound();
    return () => stopAlertSound();
  }, [hasUnreadAdminAlerts, hasUnreadTasks, view]);

  useEffect(() => {
    if (!user) { setHasUnreadTasks(false); return; }
    const unsubscribe = storageService.subscribeToTasks((allTasks: Task[]) => {
      const isUnread = allTasks.some(task => !task.seenBy?.includes(user.id));
      if (isUnread && view !== 'tasks' && document.hidden) startAlertSound();
      setHasUnreadTasks(isUnread);
    });
    return () => unsubscribe();
  }, [user, view]);

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

  if (isInitializing) return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
         <Logo size="lg" className="animate-pulse" />
         <p className="font-bold text-slate-500 dark:text-slate-400">Conectando de forma segura...</p>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={(u) => { setUser(u); setView(u.role === UserRole.ADMIN ? 'inventory' : 'replenish'); }} />;

  // Botones de navegación
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
    <div className="flex h-full w-full overflow-hidden bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header móvil */}
        <header className="md:hidden flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 z-30">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <h1 className="font-extrabold text-lg text-gray-900 dark:text-white">Hub</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-slate-400">{darkMode ? <Sun size={22} /> : <Moon size={22} />}</button>
            <button onClick={handleLogout} className="p-2 text-slate-600 dark:text-slate-400"><LogOut size={22} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {view === 'inventory' && <Inventory currentUser={user} />}
          {view === 'replenish' && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
          {view === 'admin' && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
          {view === 'tasks' && <Tasks currentUser={user} />}
        </div>
        
        {/* Mobile Nav */}
        <div className="md:hidden w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 p-2 z-30">
            <div className="flex justify-around items-start">
              {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Inventario" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
              <NavButton 
                icon={ClipboardList} 
                label="Pedido" 
                isActive={view === 'replenish'} 
                onClick={() => setView('replenish')}
                isCart={true}
              />
              {view === 'replenish' && (
                <button 
                  onClick={() => setShowMobileCart(!showMobileCart)}
                  className="absolute bottom-20 right-4 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-button-red active:scale-95 transition-transform duration-300"
                  style={{ transform: showMobileCart ? 'scale(0.8) translateY(10px)' : 'scale(1)' }}
                >
                  {showMobileCart ? <X size={32} /> : <ShoppingCart size={28} />}
                  {cart.length > 0 && !showMobileCart && <span className="absolute -top-1 -right-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">{cart.length}</span>}
                </button>
              )}
              <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks} />
              {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} notificationCount={unreadAdminNotifications.length} />}
            </div>
        </div>
        
        {/* Toasts Container */}
        <div className="absolute top-4 md:top-6 right-4 md:right-6 z-[60] space-y-3 w-[calc(100%-2rem)] md:w-auto">
          {toasts.map(toast => (
            <NotificationToast key={toast.id} notification={toast} onDismiss={removeToast} onReadAndNavigate={() => handleReadAndNavigate(toast)} />
          ))}
        </div>
        
        {showIOSPrompt && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-end justify-center animate-fade-in" onClick={() => setShowIOSPrompt(false)}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-t-2xl max-w-md text-center pb-safe" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2">Instalar App</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Para instalar la app, toca el ícono <Share className="inline-block mx-1" /> y luego selecciona 'Añadir a pantalla de inicio' <PlusSquare className="inline-block mx-1" />.</p>
              <button onClick={() => setShowIOSPrompt(false)} className="bg-red-600 text-white font-bold w-full py-3 rounded-lg">Entendido</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
