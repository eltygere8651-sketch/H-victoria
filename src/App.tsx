import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { User, UserRole, AppNotification, CartItem, NotificationType, TaskRecurrence, TaskStatus } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';
import { ShareModal } from './components/ShareModal';
import { GuideModal } from './components/GuideModal';
import { MainLayout } from './components/MainLayout';

import ProviderDelivery from './pages/ProviderDelivery';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [view, setView] = useState<'inventory' | 'replenish' | 'admin' | 'tasks'>(() => {
    const lastView = storageService.getLastView();
    const sessionUser = storageService.getSession();
    let defaultView: 'inventory' | 'replenish' | 'tasks' = 'replenish';
    if (sessionUser?.role === UserRole.ADMIN) defaultView = 'inventory';
    if (sessionUser?.role === UserRole.GUEST) defaultView = 'tasks';
    if (lastView && (['inventory', 'replenish', 'admin', 'tasks'] as string[]).includes(lastView)) return lastView as any;
    return defaultView;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [notificationVolume, setNotificationVolume] = useState(() => {
    const saved = localStorage.getItem('hub_notification_volume');
    return saved ? Number(saved) : 0.3;
  });

  const [soundType, setSoundType] = useState(() => {
    const saved = localStorage.getItem('hub_sound_type');
    return saved || 'Default';
  });

  // Synchronize refs with state immediately to avoid stale closures in subscriptions
  const volumeRef = useRef(notificationVolume);
  const soundTypeRef = useRef(soundType);
  volumeRef.current = notificationVolume;
  soundTypeRef.current = soundType;

  useEffect(() => {
    localStorage.setItem('hub_notification_volume', notificationVolume.toString());
  }, [notificationVolume]);

  useEffect(() => {
    localStorage.setItem('hub_sound_type', soundType);
  }, [soundType]);

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
  const [hasPendingDailyTasks, setHasPendingDailyTasks] = useState(false);
  
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
      const minSplashTime = new Promise(resolve => setTimeout(resolve, 800));
      
      const authPromise = storageService.ensureAnonymousAuth();
      
      await Promise.all([authPromise, minSplashTime]);

      if (providerMode === 'true' && !storageService.getSession()) {
        const providerUser: User = { id: 'provider-' + Date.now(), name: 'Proveedor', role: UserRole.PROVIDER, contraseña: '' };
        setUser(providerUser);
        setView('provider' as any);
      } else if (publicMode === 'true' && !storageService.getSession()) {
        const guestUser: User = { id: 'guest-' + Date.now(), name: 'Invitado', role: UserRole.GUEST, contraseña: '' };
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
    if (user && user.role === UserRole.ADMIN) {
      storageService.ensureAdminSession(user);
      if (!cleanupPerformed.current) {
        storageService.cleanupCompletedTasks();
        cleanupPerformed.current = true;
      }
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
    localStorage.setItem('hub_notification_volume', notificationVolume.toString());
  }, [notificationVolume]);

  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    const currentVol = volumeRef.current;
    if (currentVol <= 0) return;
    const currentType = soundTypeRef.current;
    
    try {
      if (!audioContextRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return;
        audioContextRef.current = new AudioCtor();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playBeep = (timeOffset: number, freq: number, duration = 0.3, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        
        const startTime = ctx.currentTime + timeOffset;
        const volumeValue = currentVol * currentVol; 
        
        const attack = 0.02;
        const release = 0.05;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volumeValue, startTime + attack);
        gainNode.gain.linearRampToValueAtTime(volumeValue, startTime + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
      };

      const type = currentType.toLowerCase();
      // Global behavior: 3 repetitions of the selected tone
      const playTonePattern = (offset: number) => {
        if (type === 'modern') {
          playBeep(offset, 784, 0.08, 'sine'); // G5
          playBeep(offset + 0.1, 1046, 0.12, 'sine'); // C6
        } else if (type === 'crystal') {
          playBeep(offset, 1568, 0.05, 'triangle'); // G6
          playBeep(offset + 0.06, 1760, 0.05, 'triangle'); // A6
          playBeep(offset + 0.12, 1975, 0.08, 'triangle'); // B6
        } else if (type === 'retro') {
          playBeep(offset, 523, 0.1, 'square'); // C5
          playBeep(offset + 0.12, 784, 0.15, 'square'); // G5
        } else {
          // Default Basic
          playBeep(offset, 2500, 0.15, 'square');
        }
      };

      // Play 3 times as requested by user
      playTonePattern(0);
      playTonePattern(0.6);
      playTonePattern(1.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const playTestSound = (typeOverride?: string) => {
    const currentVol = volumeRef.current;
    if (currentVol <= 0) return;
    const currentType = typeOverride || soundTypeRef.current;
    
    try {
      if (!audioContextRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return;
        audioContextRef.current = new AudioCtor();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playQuick = (freq: number, dur: number, type: OscillatorType, offset: number = 0) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
        const startTime = ctx.currentTime + offset;
        const volumeValue = currentVol * currentVol; 
        
        const attack = 0.02;
        const release = 0.05;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volumeValue, startTime + attack);
        gainNode.gain.linearRampToValueAtTime(volumeValue, startTime + dur - release);
        gainNode.gain.linearRampToValueAtTime(0, startTime + dur);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
      };

      const type = currentType.toLowerCase();
      const playTonePattern = (offset: number) => {
        if (type === 'modern') {
          playQuick(784, 0.08, 'sine', offset); // G5
          playQuick(1046, 0.12, 'sine', offset + 0.1); // C6
        } else if (type === 'crystal') {
          playQuick(1568, 0.05, 'triangle', offset); // G6
          playQuick(1760, 0.05, 'triangle', offset + 0.06); // A6
          playQuick(1975, 0.08, 'triangle', offset + 0.12); // B6
        } else if (type === 'retro') {
          playQuick(523, 0.1, 'square', offset); // C5
          playQuick(784, 0.15, 'square', offset + 0.12); // G5
        } else {
          playQuick(2500, 0.15, 'square', offset);
        }
      };

      // Play 3 times to demo the actual notification pattern
      playTonePattern(0);
      playTonePattern(0.6);
      playTonePattern(1.2);
    } catch (e) {
      console.error(e);
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
    
    // Keyboard shortcut for Guide (v)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in any input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // We want ONLY the 'v' key, without modifiers (ctrl, meta, etc)
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowGuideModal(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    
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
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isInitializing || !user || user.role === UserRole.GUEST) return;
    
    let isInitialLoad = true;

    const unsubNotifs = storageService.subscribeToNotifications((notifications) => {
      const relevantNotifications = user.role === UserRole.ADMIN 
        ? notifications 
        : notifications.filter(n => 
            n.type === NotificationType.NEW_TASK || 
            n.type === NotificationType.DAILY_TASK_ALERT ||
            n.type === NotificationType.TASK_COMPLETED
          );

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
          
          // Only play notification sound if it's not redundant.
          // We previously blocked it if message included user name, but the user wants to hear it too.
          // We only block if the batch ID matches the one we just processed in THIS session to avoid double trigger if onSnapshot fires twice.
          const isRedundantBatch = newToasts.some(n => 
            n.payload?.orderBatchId && localStorage.getItem('last_processed_batch') === n.payload.orderBatchId
          );
          
          if (!isRedundantBatch) {
            playNotificationSound();
          }
        }
      }
      
      if (user.role === UserRole.ADMIN) {
        setUnreadAdminNotifications(unread);
      }
    }, true);
    
    const unsubTasks = storageService.subscribeToTasks((tasks) => {
      setHasUnreadTasks(tasks.some(task => !task.seenBy?.includes(user.id)));
      setHasPendingDailyTasks(tasks.some(task => task.recurrence === TaskRecurrence.DAILY && task.status !== TaskStatus.COMPLETED));
    });

    // Hourly check for pending daily tasks and cleanup finished unique tasks
    const checkDailyTasksAndCleanup = () => {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
        storageService.checkPendingDailyTasksAndNotify();
        storageService.cleanupCompletedTasks();
      }
    };

    checkDailyTasksAndCleanup(); // Initial check
    const dailyTaskInterval = setInterval(checkDailyTasksAndCleanup, 15 * 60 * 1000); // Check every 15 mins
    
    return () => { unsubNotifs(); unsubTasks(); clearInterval(dailyTaskInterval); };
  }, [user, isInitializing]);

  const handleLogin = (u: User) => { setUser(u); storageService.saveSession(u); };
  const handleLogout = async () => { await storageService.clearSession(); setUser(null); };
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
    if (notif.type === NotificationType.NEW_TASK || notif.type === NotificationType.DAILY_TASK_ALERT || notif.type === NotificationType.TASK_COMPLETED) {
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

  // --- MAIN RENDER LOGIC ---
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

  // Determine core content based on auth state
  let mainContent;
  if (sharedTaskId && !user) {
    mainContent = <PublicTaskViewer taskId={sharedTaskId} setShowGuideModal={setShowGuideModal} />;
  } else if (!user) {
    mainContent = <Login onLogin={handleLogin} setShowGuideModal={setShowGuideModal} />;
  } else {
    mainContent = (
      <MainLayout
        user={user} view={view} setView={setView} cart={cart}
        darkMode={darkMode} setDarkMode={setDarkMode}
        soundEnabled={notificationVolume > 0} setSoundEnabled={(enabled) => setNotificationVolume(enabled ? 0.3 : 0)}
        notificationVolume={notificationVolume} setNotificationVolume={setNotificationVolume}
        soundType={soundType} setSoundType={setSoundType}
        playTestSound={playTestSound}
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
        hasPendingDailyTasks={hasPendingDailyTasks}
        unreadAdminNotificationsCount={unreadAdminNotifications.length}
      >
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && user.role !== UserRole.PROVIDER && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} notificationVolume={notificationVolume} soundType={soundType} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} initialTaskId={sharedTaskId} />}
        {(view as any) === 'provider' && <ProviderDelivery currentUser={user} />}
      </MainLayout>
    );
  }

  return (
    <>
      <div className={`transition-opacity duration-500 ${showGuideModal ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        {mainContent}
      </div>

      <GuideModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
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