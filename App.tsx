import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import Announcements from './pages/Announcements';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Share, PlusSquare, ShoppingCart, ClipboardCheck, Megaphone } from 'lucide-react';
import { User, UserRole, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks' | 'announcements'>(() => {
    const lastView = storageService.getLastView();
    const sessionUser = storageService.getSession();

    let defaultView: 'inventory' | 'replenish' | 'tasks' | 'announcements' = 'replenish';
    if (sessionUser?.role === UserRole.ADMIN) defaultView = 'inventory';
    if (lastView === 'inventory' || lastView === 'replenish' || lastView === 'admin' || lastView === 'tasks' || lastView === 'announcements') {
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
      // Check for shared task in URL
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get('shareId');
      const publicMode = searchParams.get('public');
      
      if (shareId) {
        setSharedTaskId(shareId);
      }

      await storageService.ensureAnonymousAuth();
      
      // Handle Public Guest Mode
      if (publicMode === 'true') {
        setIsPublicMode(true);
        // Create a temporary guest user session if not already logged in as a stronger role
        if (!storageService.getSession()) {
          const guestUser: User = {
            id: 'guest-' + Date.now(),
            name: 'Invitado Evento',
            role: UserRole.GUEST,
            pin: '',
          };
          setUser(guestUser);
          setView('announcements'); // Default view for guests
        }
      }

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
    if (user && !isSandboxed && user.role !== UserRole.GUEST) initializePushNotifications(user);
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
      if (displayedNativeNotificationIds.current.has(notification.id)) return;
      
      const nativeNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      });
      nativeNotification.onclick = () => {
        window.focus();
        handleToastNavigation(notification);
      };
      displayedNativeNotificationIds.current.add(notification.id);
    }
  };

  const handleToastNavigation = (notification: AppNotification) => {
    if (user?.role === UserRole.ADMIN) {
      setInitialAdminTab('reports');
      setView('admin');
    }
    setToasts(prev => prev.filter(t => t.id !== notification.id));
    displayedToastIds.current.delete(notification.id);
    storageService.markNotificationAsRead(notification.id, user!.id, user!.name);
  };
  
  const handleToastDismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    displayedToastIds.current.delete(id);
  };
  
  useEffect(() => {
    if (!user || user.role === UserRole.GUEST) {
      setToasts([]);
      displayedToastIds.current.clear();
      return;
    }

    const unsubNotifications = storageService.subscribeToNotifications((notifications) => {
      const unread = notifications.filter(n => !n.readStatus);
      const newToasts = unread.filter(n => !displayedToastIds.current.has(n.id));
      
      if (newToasts.length > 0) {
        setToasts(prev => [...prev, ...newToasts]);
        newToasts.forEach(n => {
          displayedToastIds.current.add(n.id);
          showNativeNotification(n);
        });
      }
      
      if (user.role === UserRole.ADMIN) {
        setUnreadAdminNotifications(unread);
      }
    }, true);
    
    const unsubTasks = storageService.subscribeToTasks((tasks) => {
      const hasUnread = tasks.some(task => !task.seenBy?.includes(user.id));
      setHasUnreadTasks(hasUnread);
      
      const newHighPriorityTasks = tasks.filter(t => 
        t.priority === 'HIGH' &&
        t.status !== 'COMPLETED' &&
        !t.seenBy?.includes(user.id)
      );

      if (newHighPriorityTasks.length > 0 && audioContextUnlocked.current) {
        if (!audioAlertRef.current.isPlaying) {
          startAlarm();
        }
      } else {
        stopAlarm();
      }
    });

    return () => {
      unsubNotifications();
      unsubTasks();
    };
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    const lastView = storageService.getLastView();
    if (loggedInUser.role === UserRole.ADMIN) {
        setView(lastView === 'inventory' || lastView === 'admin' || lastView === 'tasks' || lastView === 'announcements' ? lastView : 'inventory');
    } else {
        setView(lastView === 'replenish' || lastView === 'tasks' || lastView === 'announcements' ? lastView : 'replenish');
    }
  };

  const handleLogout = () => {
    storageService.clearSession();
    setUser(null);
    setCart([]);
    setView('replenish');
    
    // If in public mode, remove query param
    if (isPublicMode) {
      window.history.replaceState({}, '', window.location.pathname);
      setIsPublicMode(false);
    }
  };

  const startAlarm = () => {
    const ctx = audioAlertRef.current.context;
    if (!ctx || audioAlertRef.current.isPlaying) return;

    audioAlertRef.current.isPlaying = true;
    const playSound = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    };

    playSound(); 
    audioAlertRef.current.intervalId = window.setInterval(playSound, 2000);
  };
  
  const stopAlarm = () => {
    if (audioAlertRef.current.intervalId) {
      clearInterval(audioAlertRef.current.intervalId);
      audioAlertRef.current.intervalId = null;
    }
    audioAlertRef.current.isPlaying = false;
  };

  // --- MODERN NAVIGATION BUTTON (FLOATING PILL DESIGN) ---
  const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false }: any) => (
    <button 
      onClick={onClick} 
      className={`
        relative flex items-center justify-center gap-2 px-3 py-3.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
        outline-none select-none touch-manipulation active:scale-95 group
        ${isActive 
          ? 'flex-[2] bg-red-600 text-white shadow-neon dark:shadow-red-900/50' 
          : 'flex-1 bg-gray-50/80 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400'
        }
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="relative z-10">
        <Icon 
          size={20} 
          strokeWidth={2.5} 
          className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}
        />
        {hasAlert && !isActive && (
           <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-20">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 ring-2 ring-white dark:ring-slate-900"></span>
           </span>
        )}
      </div>
      
      {/* Label only visible when active */}
      <div className={`
        overflow-hidden transition-all duration-300 ease-out flex flex-col justify-center
        ${isActive ? 'w-auto opacity-100 max-w-[100px] ml-1' : 'w-0 opacity-0 max-w-0 ml-0'}
      `}>
        <span className="text-[11px] font-bold leading-none whitespace-nowrap tracking-wide">
          {label}
        </span>
      </div>
    </button>
  );

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <Logo size="lg" className="animate-pulse" />
      </div>
    );
  }

  // --- PUBLIC SHARE VIEW ---
  if (sharedTaskId) {
    return <PublicTaskViewer taskId={sharedTaskId} />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`h-full w-full flex flex-col font-sans transition-colors duration-300 antialiased ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-slate-950 bg-grid-pattern`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <header className="flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm z-30 p-4 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300 sticky top-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-extrabold text-2xl text-gray-900 dark:text-white hidden sm:inline">Hub</span>
            {user.role === UserRole.GUEST && (
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-bold">Invitado</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isInstalled && deferredPrompt && (
              <button onClick={async () => deferredPrompt.prompt()} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95"><Download size={16} /> Instalar</button>
            )}
            {/* FIX: Cast navigator to `any` to access the non-standard `standalone` property for iOS PWA detection without a TypeScript error. */}
            {!isInstalled && isIOS && !(window.navigator as any).standalone && (
                <button onClick={() => setShowIOSPrompt(true)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95"><PlusSquare size={16} /> Instalar</button>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button onClick={handleLogout} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area - Added padding bottom to prevent content from being hidden behind floating dock */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
          {view === 'replenish' && user.role !== UserRole.GUEST && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
          {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
          {view === 'tasks' && <Tasks currentUser={user} />}
          {view === 'announcements' && <Announcements currentUser={user} />}
        </main>
      </div>

      {/* FLOATING DOCK NAVIGATION */}
      <div className="fixed bottom-6 inset-x-0 z-20 flex justify-center px-4 pointer-events-none pb-safe">
        <nav 
          className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-dock dark:shadow-dock-dark rounded-full p-2 flex items-center justify-between gap-2 w-full max-w-md transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5"
        >
            {/* ANNOUNCEMENTS (Available to all) */}
            <NavButton icon={Megaphone} label="Anuncios" isActive={view === 'announcements'} onClick={() => setView('announcements')} />

            {/* TASKS (Available to all) */}
            <NavButton icon={ClipboardCheck} label="Tareas" isActive={view === 'tasks'} onClick={() => setView('tasks')} hasAlert={hasUnreadTasks}/>

            {/* REPLENISH (Staff/Admin only) */}
            {user.role !== UserRole.GUEST && (
              <NavButton icon={ClipboardList} label="Pedido" isActive={view === 'replenish'} onClick={() => setView('replenish')} />
            )}
            
            {/* ADMIN/INVENTORY - Only for Admins */}
            {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Stock" isActive={view === 'inventory'} onClick={() => setView('inventory')} />}
            {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} hasAlert={unreadAdminNotifications.length > 0} />}
        </nav>
      </div>

      {/* Mobile Cart Button - Repositioned slightly higher to clear dock */}
      {user.role !== UserRole.GUEST && (
        <div className="fixed lg:hidden bottom-28 right-5 z-50">
          <button onClick={() => setShowMobileCart(true)} className="relative bg-red-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-neon hover:bg-red-700 active:scale-95 transition-all">
            <ShoppingCart size={24} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-red-600 animate-bounce">{cart.length}</span>}
          </button>
        </div>
      )}
      
      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowIOSPrompt(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 text-center shadow-pop-in animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Instalar App en iOS</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Para instalar la aplicación, toca el ícono de <span className="inline-block mx-1"><Share size={16}/></span> en la barra de tu navegador y luego selecciona <span className="font-bold">"Añadir a la pantalla de inicio"</span>.</p>
            <button onClick={() => setShowIOSPrompt(false)} className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Entendido</button>
          </div>
        </div>
      )}

      <div aria-live="assertive" className="fixed inset-0 flex flex-col items-end px-4 py-6 pt-safe pointer-events-none sm:p-6 sm:items-end z-[9999] gap-4">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onDismiss={handleToastDismiss}
            onReadAndNavigate={() => handleToastNavigation(toast)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;