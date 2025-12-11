import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Replenishment from './pages/Replenishment';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import { PublicTaskViewer } from './components/PublicTaskViewer';
import * as storageService from './services/storageService';
import { Logo } from './components/Logo';
import { LayoutGrid, ClipboardList, ShieldCheck, LogOut, Moon, Sun, Download, Share2, PlusSquare, ShoppingCart, ClipboardCheck, CircleHelp } from 'lucide-react';
import { User, UserRole, AppNotification, CartItem } from './types';
import { NotificationToast } from './components/NotificationToast';
import { initializePushNotifications } from './services/pushNotificationService';
import { ShareModal } from './components/ShareModal';

// --- Guide Modal ---
interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 relative shadow-xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          onClick={onClose}
        >
          <LogOut size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Guía de Hub</h2>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          <strong>Hub</strong> es una <strong>Plataforma de Gestión Operativa Integral</strong> diseñada para optimizar la logística y la comunicación interna de negocios como hoteles, restaurantes o comercios.
        </p>

        <h3 className="text-lg font-semibold mb-2">Funciones Principales:</h3>
        <ul className="list-none space-y-2 text-gray-700 dark:text-gray-300">
          <li><strong>📦 Inventario y Stock:</strong> Control en tiempo real de productos con alertas automáticas cuando el stock es bajo.</li>
          <li><strong>🛒 Pedidos Internos:</strong> Sistema de "carrito de compras" para que los departamentos (Bar o Cocina) soliciten reposición de suministros fácilmente.</li>
          <li><strong>✅ Gestión de Tareas:</strong> Asignación de tareas con prioridades (Alta, Media, Baja), fotos de evidencia y chat de comentarios para el equipo.</li>
          <li><strong>🛡️ Administración:</strong> Panel para gestionar usuarios, roles, seguridad por PIN y generar reportes PDF de pedidos.</li>
          <li><strong>🌐 Acceso Público:</strong> Posibilidad de compartir tareas o listas con personal externo o invitados mediante enlaces.</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4 mb-2">Utilidad:</h3>
        <p className="text-gray-700 dark:text-gray-300">
          Centraliza toda la operativa diaria en una <strong>Web App Progresiva (PWA)</strong> moderna y rápida, accesible desde cualquier dispositivo (móvil o PC), eliminando el caos de los mensajes de texto y el papel.
        </p>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(storageService.getSession());
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });
  const [showGuide, setShowGuide] = useState(false);

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

  // --- APP INITIALIZATION ---
  useEffect(() => {
    const initializeApp = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get('shareId');
      const publicMode = searchParams.get('public');
      if (shareId) setSharedTaskId(shareId);

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

  // --- DARK MODE ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#111827' : '#ffffff');
  }, [darkMode]);

  // --- PWA INSTALL ---
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

  // --- NAV BUTTON COMPONENT ---
  const NavButton = ({ icon: Icon, label, isActive, onClick, hasAlert = false, specialColor = false }: any) => (
    <button 
      onClick={onClick} 
      className={`
        relative flex items-center justify-center gap-2 px-3 py-3.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        outline-none select-none touch-manipulation active:scale-95 group
        ${isActive 
          ? 'flex-[2] bg-red-600 text-white shadow-neon dark:shadow-red-900/50' 
          : specialColor 
             ? 'flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
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
      <div className={`
        overflow-hidden transition-all duration-300 ease-out flex flex-col justify-center
        ${isActive ? 'w-auto opacity-100 max-w-[100px] ml-1' : 'w-0 opacity-0 max-w-0 ml-0'}
      `}>
        <span className="text-[11px] font-bold leading-none whitespace-nowrap tracking-wide">{label}</span>
      </div>
    </button>
  );

  // --- INITIAL RENDER LOGIC ---
  if (isInitializing) return <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-slate-950"><Logo size="lg" className="animate-pulse" /></div>;
  if (sharedTaskId) return <PublicTaskViewer taskId={sharedTaskId} />;
  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  return (
    <div className={`h-full w-full flex flex-col font-sans transition-colors duration-300 antialiased ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-slate-950`}>
      {/* HEADER */}
      <header className="flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm z-30 p-4 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300 sticky top-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-extrabold text-2xl text-gray-900 dark:text-white hidden sm:inline">Hub</span>
            {user.role === UserRole.GUEST && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-bold">Invitado</span>}
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÓN DE AYUDA DESTACADO */}
            <button
              onClick={() => setShowGuide(true)}
              className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 shadow-lg hover:shadow-xl animate-pulse transition-all active:scale-95"
              title="Guía de la App"
            >
              <CircleHelp size={20} strokeWidth={2.5} />
            </button>

            {!isInstalled && deferredPrompt && (
              <button onClick={async () => deferredPrompt.prompt()} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95"><Download size={16} /> Instalar</button>
            )}

            {!isInstalled && isIOS && !(window.navigator as any).standalone && (
                <button onClick={() => setShowIOSPrompt(true)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg font-bold text-sm hidden md:flex items-center gap-2 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95"><PlusSquare size={16} /> Instalar</button>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button onClick={() => { storageService.clearSession(); window.location.reload(); }} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-colors"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {view === 'inventory' && user.role === UserRole.ADMIN && <Inventory currentUser={user} />}
        {view === 'replenish' && user.role !== UserRole.GUEST && <Replenishment currentUser={user} cart={cart} setCart={setCart} showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart} />}
        {view === 'admin' && user.role === UserRole.ADMIN && <Admin currentUser={user} unreadNotificationsCount={unreadAdminNotifications.length} initialTab={initialAdminTab} />}
        {view === 'tasks' && <Tasks currentUser={user} />}
      </main>

      {/* NAVIGATION */}
      <div className="fixed bottom-6 inset-x-0 z-20 flex justify-center px-4 pointer-events-none pb-safe">
        <nav className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-dock dark:shadow-dock-dark rounded-full p-2 flex items-center justify-between gap-2 w-full max-w-md transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5">
          <NavButton icon={ClipboardCheck} label="Tareas" isActive={view==='tasks'} onClick={()=>setView('tasks')} hasAlert={hasUnreadTasks}/>
          {user.role !== UserRole.GUEST && <NavButton icon={ClipboardList} label="Pedido" isActive={view==='replenish'} onClick={()=>setView('replenish')} />}
          {user.role === UserRole.ADMIN && <NavButton icon={LayoutGrid} label="Stock" isActive={view==='inventory'} onClick={()=>setView('inventory')} />}
          {user.role === UserRole.ADMIN && <NavButton icon={ShieldCheck} label="Admin" isActive={view==='admin'} onClick={()=>setView('admin')} hasAlert={unreadAdminNotifications.length>0}/>}
          {user.role === UserRole.ADMIN && <NavButton icon={Share2} label="Compartir" isActive={false} onClick={()=>setShowShareModal(true)} specialColor={true}/>}
        </nav>
      </div>

      {/* SHARE MODAL */}
      <ShareModal isOpen={showShareModal} onClose={()=>setShowShareModal(false)} url={shareData.url} title={shareData.title} />

      {/* GUIDE MODAL */}
      <GuideModal isOpen={showGuide} onClose={()=>setShowGuide(false)} />
    </div>
  );
};

export default App;