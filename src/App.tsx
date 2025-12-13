import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Share, PlusSquare, ShoppingCart, ClipboardCheck, Share2, HelpCircle } from 'lucide-react';
import { User, UserRole, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';
import { ShareModal } from './components/ShareModal';
import { GuideModal } from './components/GuideModal';

// --- OPTIMIZATION: NavButton extracted to prevent re-renders ---
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

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks'>(() => {
    const lastView = storageService.getLastView();
    const sessionUser = storageService.getSession();

    let defaultView: 'inventory' | 'replenish' | 'tasks' = 'replenish';
    if (sessionUser?.role === UserRole.ADMIN) defaultView = 'inventory';
    if (sessionUser?.role === UserRole.GUEST) defaultView = 'tasks';
    
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);
  const reminderIntervalRef = useRef<number | null>(null);
  const isAlarmPlayingRef = useRef(false);

  const [hasUnreadTasks, setHasUnreadTasks] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get('shareId');
      const publicMode = searchParams.get('public');
      
      if (shareId) {
        setSharedTaskId(shareId);
      }

      await storageService.ensureAnonymousAuth();
      
      if (publicMode === 'true') {
        setIsPublicMode(true);
        if (!storageService.getSession()) {
          const guestUser: User = {
            id: 'guest-' + Date.now(),
            name: 'Invitado Evento',
            role: UserRole.GUEST,
            pin: '',
          };
          setUser(guestUser);
          setView('tasks');
        }
      }

      setIsInitializing(false);
    };
    initializeApp();
  }, []);

  // --- AUDIO SYSTEM ---
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      // FIX: Rename local var to AudioCtor to avoid shadowing global AudioContext type
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtor) {
        audioContextRef.current = new AudioCtor();
      }
    }
    return audioContextRef.current;
  };

  const playPing = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) { console.warn("AudioContext resume failed", e); }
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  };

  const startAlarm = async () => {
    if (isAlarmPlayingRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) { return; }
    }
    isAlarmPlayingRef.current = true;
    const playTone = () => {
        if (!isAlarmPlayingRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    };
    playTone();
    alarmIntervalRef.current = window.setInterval(playTone, 2000);
  };
  
  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    isAlarmPlayingRef.current = false;
  };

  useEffect(() => {
    const unlockAudio = async () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) {}
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const isSandboxed = window.location.origin.includes('usercontent.goog');
    if (user && !isSandboxed && user.role !== UserRole.GUEST) initializePushNotifications(user);
  }, [user]);

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN && !cleanupPerformed.current) {
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
    if (!user) cleanupPerformed.current = false;
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#111827' : '#ffffff');
  }, [darkMode]);

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
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);
  
  useEffect(() => { if (user) storageService.saveLastView(view); }, [view, user]);
  useEffect(() => { storageService.saveDraftCart(cart); }, [cart]);

  useEffect(() => {
    const totalUnread = unreadAdminNotifications.length + (hasUnreadTasks ? 1 : 0);
    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        navigator.setAppBadge(totalUnread).catch(e => console.error("Badging failed", e));
      } else {
        navigator.clearAppBadge().catch(e => console.error("Clear badge failed", e));
      }
    }
  }, [unreadAdminNotifications.length, hasUnreadTasks]);

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
    if (toasts.length > 0) {
      if (!reminderIntervalRef.current) {
        reminderIntervalRef.current = window.setInterval(() => {
          playPing();
        }, 5000);
      }
    } else {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    }
    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [toasts]);
  
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
        playPing();
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
      if (newHighPriorityTasks.length > 0) {
        startAlarm();
      } else {
        stopAlarm();
      }
    });

    return () => {
      unsubNotifications();
      unsubTasks();
      stopAlarm();
    };
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    const lastView = storageService.getLastView();
    if (loggedInUser.role === UserRole.ADMIN) {
        setView(lastView === 'inventory' || lastView === 'admin' || lastView === 'tasks' ? lastView : 'inventory');
    } else if (loggedInUser.role === UserRole.GUEST) {
        setView('tasks');
    } else {
        setView(lastView === 'replenish' || lastView === 'tasks' ? lastView : 'replenish');
    }
  };

  const handleLogout = () => {
    storageService.clearSession();
    setUser(null);
    setCart([]);
    setView('replenish');
    stopAlarm();
    if (isPublicMode) {
      window.history.replaceState({}, '', window.location.pathname);
      setIsPublicMode(false);
    }
  };

  const handleSharePublicAccess = () => {
    try {
      const url = new URL(window.location.href);
      url.search = ''; 
      url.hash = '';
      url.searchParams.set('public', 'true');
      const publicUrl = url.toString();
      setShareData({ url: publicUrl, title: 'Acceso Invitado: Tareas' });
      setShowShareModal(true);
    } catch (error) {
      console.error("Error creating public URL", error);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-premium">
        <Logo size="lg" className="animate-pulse" />
      </div>
    );
  }

  if (sharedTaskId) {
    return <PublicTaskViewer taskId={sharedTaskId} />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 antialiased ${darkMode ? 'dark' : ''} bg-premium overflow-x-hidden`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
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
            
            {/* PC/Tablet Header Cart Button (Hidden on Mobile) */}
            {user.role !== UserRole.GUEST && (
              <button
                onClick={() => {
                  setView('replenish');
                  setShowMobileCart(true);
                }}
                className={`
                  hidden lg:flex
                  relative p-3 rounded-full transition-all active:scale-95 items-center justify-center mr-2 shadow-sm
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

            {/* Share Button for Admins */}
            {user.role === UserRole.ADMIN && (
              <button 
                onClick={handleSharePublicAccess} 
                className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 active:scale-95 transition-colors shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-900/30"
                title="Compartir Acceso"
              >
                <Share2 size={20} strokeWidth={2.5} />
              </button>
            )}

             {/* Help Button */}
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

      {/* Main Content Area - Native Scroll */}
      <main className="flex-1 w-full">
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} />}
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
            {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view === 'admin'} onClick={() => setView('admin')} hasAlert={unreadAdminNotifications.length > 0} />}
        </nav>
      </div>

      {/* FLOATING CART BUTTON (MOBILE ONLY) - PRESERVED FOR STRUCTURE */}
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
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Para instalar la aplicación, toca el ícono de <span className="inline-block mx-1"><Share2 size={16}/></span> en la barra de tu navegador y luego selecciona <span className="font-bold">"Añadir a la pantalla de inicio"</span>.</p>
            <button onClick={() => setShowIOSPrompt(false)} className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Entendido</button>
          </div>
        </div>
      )}

      {/* NEW: Guide Modal */}
      <GuideModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
      />

      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        url={shareData.url} 
        title={shareData.title} 
      />

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