import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { User, UserRole, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';
import { ShareModal } from './components/ShareModal';
import { GuideModal } from './components/GuideModal';
import { MainLayout } from './components/MainLayout';
import { Share2 } from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  // Share Modal State (Global)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });

  // Guide Modal State
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

  // Inicialización de la app
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
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
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
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);
  // --- END AUDIO SYSTEM ---

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
    <>
      <MainLayout
        user={user}
        view={view}
        setView={setView}
        cart={cart}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleLogout={handleLogout}
        handleSharePublicAccess={handleSharePublicAccess}
        setShowGuideModal={setShowGuideModal}
        setShowMobileCart={setShowMobileCart}
        setShowIOSPrompt={setShowIOSPrompt}
        deferredPrompt={deferredPrompt}
        isInstalled={isInstalled}
        isIOS={isIOS}
        hasUnreadTasks={hasUnreadTasks}
        unreadAdminNotificationsCount={unreadAdminNotifications.length}
      >
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} />}
      </MainLayout>

      {/* iOS Install Prompt Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowIOSPrompt(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 text-center shadow-pop-in animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Instalar App en iOS</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Para instalar la aplicación, toca el ícono de <span className="inline-block mx-1"><Share2 size={16}/></span> en la barra de tu navegador y luego selecciona <span className="font-bold">"Añadir a la pantalla de inicio"</span>.</p>
            <button onClick={() => setShowIOSPrompt(false)} className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Entendido</button>
          </div>
        </div>
      )}

      {/* Other Modals */}
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

      {/* Notification Toasts */}
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
    </>
  );
};

export default App;