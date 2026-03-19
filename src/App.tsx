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
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unreadAdminNotifications, setUnreadAdminNotifications] = useState<AppNotification[]>([]);
  const [initialAdminTab, setInitialAdminTab] = useState<'requests' | 'users' | 'reports'>('requests');
  const [cart, setCart] = useState<CartItem[]>(storageService.getDraftCart());
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [hasUnreadTasks, setHasUnreadTasks] = useState(false);
  
  const displayedToastIds = useRef<Set<string>>(new Set());
  const cleanupPerformed = useRef(false);

  useEffect(() => {
    const initializeApp = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get('shareId');
      const publicMode = searchParams.get('public');
      if (shareId) setSharedTaskId(shareId);
      
      // Artificial delay for splash screen visibility (optional, improves perceived quality)
      const minSplashTime = new Promise(resolve => setTimeout(resolve, 2000));
      
      const authPromise = storageService.ensureAnonymousAuth();
      
      await Promise.all([authPromise, minSplashTime]);

      if (publicMode === 'true' && !storageService.getSession()) {
        const guestUser: User = { id: 'guest-' + Date.now(), name: 'Invitado', role: UserRole.GUEST, pin: '' };
        setUser(guestUser);
        setView('tasks');
      }
      setIsInitializing(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (user && user.role !== UserRole.GUEST) initializePushNotifications(user);
    if (user && user.role === UserRole.ADMIN && !cleanupPerformed.current) {
      storageService.cleanupCompletedTasks();
      cleanupPerformed.current = true;
    }
  }, [user]);

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
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  useEffect(() => {
    if (!user || user.role === UserRole.GUEST) return;
    const unsubNotifs = storageService.subscribeToNotifications((notifications) => {
      const unread = notifications.filter(n => !n.readStatus);
      const newToasts = unread.filter(n => !displayedToastIds.current.has(n.id));
      if (newToasts.length > 0) {
        setToasts(prev => [...prev, ...newToasts]);
        newToasts.forEach(n => displayedToastIds.current.add(n.id));
        playNotificationSound();
      }
      if (user.role === UserRole.ADMIN) setUnreadAdminNotifications(unread);
    }, true);
    const unsubTasks = storageService.subscribeToTasks((tasks) => {
      setHasUnreadTasks(tasks.some(task => !task.seenBy?.includes(user.id)));
    });
    return () => { unsubNotifs(); unsubTasks(); };
  }, [user]);

  const handleLogin = (u: User) => { setUser(u); storageService.saveSession(u); };
  const handleLogout = () => { storageService.clearSession(); setUser(null); };
  const handleSharePublicAccess = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('public', 'true');
    setShareData({ url: url.toString(), title: 'Acceso Público Hub' });
    setShowShareModal(true);
  };

  const handleToastNavigation = (notif: AppNotification) => {
    if (user?.role === UserRole.ADMIN) { setInitialAdminTab('reports'); setView('admin'); }
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
          {/* Logo Container with Glass Effect */}
          <div className="p-10 bg-white/40 dark:bg-white/5 rounded-[3rem] backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl mb-8 relative">
             <div className="absolute inset-0 bg-white/20 dark:bg-white/5 rounded-[3rem] blur-xl -z-10"></div>
             {/* AQUÍ ESTÁ EL CAMBIO PRINCIPAL: Animated = True */}
             <Logo size="2xl" animated={true} />
          </div>
          
          <div className="absolute bottom-10 flex flex-col items-center justify-center animate-fade-in">
            <div className="animate-spin">
              <Logo size="sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sharedTaskId) return <PublicTaskViewer taskId={sharedTaskId} />;
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
        setShowIOSPrompt={setShowIOSPrompt}
        showIOSPrompt={showIOSPrompt}
        deferredPrompt={deferredPrompt}
        isInstalled={isInstalled} isIOS={isIOS}
        hasUnreadTasks={hasUnreadTasks}
        unreadAdminNotificationsCount={unreadAdminNotifications.length}
      >
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} />}
      </MainLayout>

      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
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