import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { User, UserRole, AppNotification, CartItem, NotificationType } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';
import { ShareModal } from './components/ShareModal';
import { GuideModal } from './components/GuideModal';
import { MainLayout } from './components/MainLayout';

import ProviderDelivery from './pages/ProviderDelivery';
import Training from './pages/Training';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks' | 'training'>(() => {
    const lastView = storageService.getLastView();
    const sessionUser = storageService.getSession();
    let defaultView: 'inventory' | 'replenish' | 'tasks' | 'training' = 'replenish';
    if (sessionUser?.role === UserRole.ADMIN) defaultView = 'inventory';
    if (sessionUser?.role === UserRole.GUEST) defaultView = 'tasks';
    if (lastView) return lastView as any;
    return defaultView;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('hub_sound_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [hasSeenAndroidPrompt, setHasSeenAndroidPrompt] = useState(
    localStorage.getItem('hasSeenAndroidPrompt') === 'true'
  );
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unreadAdminNotifications, setUnreadAdminNotifications] = useState<AppNotification[]>([]);
  const [initialAdminTab, setInitialAdminTab] = useState<'requests' | 'users' | 'reports'>('requests');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [hasUnreadTasks, setHasUnreadTasks] = useState(false);
  
  const displayedToastIds = useRef<Set<string>>(new Set());
  const cleanupPerformed = useRef(false);

  useEffect(() => {
    const initializeApp = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get('shareId');
      const publicMode = searchParams.get('public');
      const providerMode = searchParams.get('provider');
      if (shareId) setSharedTaskId(shareId);
      
      // Artificial delay for splash screen visibility (optional, improves perceived quality)
      const minSplashTime = new Promise(resolve => setTimeout(resolve, 2000));
      
      const authPromise = storageService.ensureAnonymousAuth();
      
      await Promise.all([authPromise, minSplashTime]);

      if (providerMode === 'true' && !storageService.getSession()) {
        const providerUser: User = { id: 'provider-' + Date.now(), name: 'Proveedor', role: UserRole.PROVIDER, pin: '' };
        setUser(providerUser);
        setView('provider' as any);
      } else if (publicMode === 'true' && !storageService.getSession()) {
        const guestUser: User = { id: 'guest-' + Date.now(), name: 'Invitado', role: UserRole.GUEST, pin: '' };
        setUser(guestUser);
        setView('tasks');
      }
      setIsInitializing(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (user && user.role !== UserRole.GUEST) initializePushNotifications(user);
    if (user && user.role === UserRole.ADMIN && !cleanupPerformed.current) {
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
    
    // Load draft cart when user logs in
    const loadCart = async () => {
      if (user) {
        setIsCartLoaded(false);
        const savedCart = await storageService.getDraftCart(user.id);
        setCart(savedCart);
        setIsCartLoaded(true);
      }
    };
    loadCart();
  }, [user, isInitializing]);

  useEffect(() => {
    // Save draft cart when it changes, but only after it has been loaded
    if (isInitializing) return;
    if (user && isCartLoaded) {
      storageService.saveDraftCart(user.id, cart);
    }
  }, [cart, user, isCartLoaded, isInitializing]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('hub_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      
      const playBeep = (timeOffset: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + timeOffset;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.25);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.35);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      };

      // 5 pitidos más largos y espaciados
      playBeep(0, 2500);
      playBeep(0.5, 3000);
      playBeep(1.0, 2500);
      playBeep(1.5, 3000);
      playBeep(2.0, 2500);
      
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 3000);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    const beforeInstallHandler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    const appInstalledHandler = () => { setIsInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', appInstalledHandler);
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) setIsInstalled(true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    const isAndroidDevice = /Android/i.test(navigator.userAgent);
    setIsAndroid(isAndroidDevice);
    
    // Automatically show Android prompt if not installed and hasn't seen it
    if (isAndroidDevice && !window.matchMedia('(display-mode: standalone)').matches && localStorage.getItem('hasSeenAndroidPrompt') !== 'true') {
      // Small delay to not interrupt initial render
      setTimeout(() => {
        setShowAndroidPrompt(true);
        localStorage.setItem('hasSeenAndroidPrompt', 'true');
        setHasSeenAndroidPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  useEffect(() => {
    if (isInitializing || !user || user.role === UserRole.GUEST) return;
    
    let isInitialLoad = true;

    const unsubNotifs = storageService.subscribeToNotifications((notifications) => {
      const relevantNotifications = user.role === UserRole.ADMIN 
        ? notifications 
        : notifications.filter(n => n.type === NotificationType.NEW_TASK || n.type === NotificationType.DAILY_TASK_ALERT);

      const unread = relevantNotifications.filter(n => !n.readStatus);
      
      if (isInitialLoad) {
        // Prevent flood on initial load
        unread.forEach(n => displayedToastIds.current.add(n.id));
        isInitialLoad = false;
      } else {
        const newToasts = unread.filter(n => !displayedToastIds.current.has(n.id));
        if (newToasts.length > 0) {
          setToasts(prev => [...prev, ...newToasts]);
          newToasts.forEach(n => displayedToastIds.current.add(n.id));
          playNotificationSound();
        }
      }
      
      if (user.role === UserRole.ADMIN) {
        setUnreadAdminNotifications(unread);
      }
    }, true);
    
    const unsubTasks = storageService.subscribeToTasks((tasks) => {
      setHasUnreadTasks(tasks.some(task => !task.seenBy?.includes(user.id)));
    });

    // Hourly check for pending daily tasks
    const checkDailyTasks = () => {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
        storageService.checkPendingDailyTasksAndNotify();
      }
    };

    checkDailyTasks(); // Initial check
    const dailyTaskInterval = setInterval(checkDailyTasks, 15 * 60 * 1000); // Check every 15 mins
    
    return () => { unsubNotifs(); unsubTasks(); clearInterval(dailyTaskInterval); };
  }, [user, isInitializing]);

  const handleLogin = (u: User) => { setUser(u); storageService.saveSession(u); };
  const handleLogout = () => { storageService.clearSession(); setUser(null); };
  const handleSharePublicAccess = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('public', 'true');
    setShareData({ url: url.toString(), title: 'Acceso Público Hub' });
    setShowShareModal(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setShowAndroidPrompt(false);
      } catch (err) {
        console.error('Error prompting install:', err);
      }
    } else if (isIOS) {
      setShowIOSPrompt(true);
    } else if (isAndroid) {
      setShowAndroidPrompt(true);
    }
  };

  const handleToastNavigation = (notif: AppNotification) => {
    if (notif.type === NotificationType.NEW_TASK || notif.type === NotificationType.DAILY_TASK_ALERT) {
      setView('tasks');
    } else if (user?.role === UserRole.ADMIN) { 
      setInitialAdminTab('reports'); 
      setView('admin'); 
    }
    handleToastDismiss(notif.id);
  };

  const handleToastDismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    displayedToastIds.current.delete(id);
  };

  // --- SPLASH SCREEN (Pantalla de Carga) ---
  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#060812] transition-colors duration-500 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-red-600/5 dark:bg-red-600/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-slate-400/5 dark:bg-slate-700/5 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>

        <div className="relative z-10 flex flex-col items-center animate-pop-in">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin" style={{ animationDuration: '3s' }}>
              <Logo size="sm" />
            </div>
            <p className="mt-4 text-xs font-medium tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 opacity-60">
              Cargando
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (sharedTaskId && !user) return <PublicTaskViewer taskId={sharedTaskId} />;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      <MainLayout
        user={user} view={view} setView={setView} cart={cart}
        darkMode={darkMode} setDarkMode={setDarkMode}
        soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
        handleLogout={handleLogout}
        handleSharePublicAccess={handleSharePublicAccess}
        setShowGuideModal={setShowGuideModal}
        setShowMobileCart={setShowMobileCart}
        showIOSPrompt={showIOSPrompt} showAndroidPrompt={showAndroidPrompt}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
        isInstalled={isInstalled} isIOS={isIOS} isAndroid={isAndroid}
        setShowIOSPrompt={setShowIOSPrompt} setShowAndroidPrompt={setShowAndroidPrompt}
        hasUnreadTasks={hasUnreadTasks}
        unreadAdminNotificationsCount={unreadAdminNotifications.length}
      >
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && user.role !== UserRole.PROVIDER && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} initialTaskId={sharedTaskId} />}
        {view === 'training' && <Training onBack={() => setView('tasks')} />}
        {(view as any) === 'provider' && <ProviderDelivery currentUser={user} />}
      </MainLayout>

      <GuideModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
        onStartTraining={() => {
          setShowGuideModal(false);
          setView('training');
        }}
      />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} url={shareData.url} title={shareData.title} />

      <div className="fixed inset-0 flex flex-col items-end px-4 py-6 pt-safe pointer-events-none z-[9999] gap-4">
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} notification={toast} onDismiss={handleToastDismiss} onReadAndNavigate={() => handleToastNavigation(toast)} />
        ))}
      </div>
    </>
  );
};

export default App;