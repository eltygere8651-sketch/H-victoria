import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User, UserRole } from '../types';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle, Smartphone, QrCode, X } from 'lucide-react';
import { GuideModal } from '../components/GuideModal';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { QRCodeSVG } from 'qrcode.react';

interface LoginProps {
  onLogin: (user: User) => void;
  setShowGuideModal: (show: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, setShowGuideModal }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [providerDisabled, setProviderDisabled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // QR Login state
  const [showQrLogin, setShowQrLogin] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);

  // Check for existing Google session with listener
  useEffect(() => {
    const unsubscribe = storageService.auth.onAuthStateChanged((currentUser) => {
      if (currentUser && currentUser.email === storageService.SUPER_ADMIN_EMAIL && !storageService.getSession()) {
        console.log("Auto-logging in owner via Auth listener...");
        const ownerUser: User = {
          id: currentUser.uid,
          name: currentUser.displayName || 'Propietario',
          role: UserRole.ADMIN,
          pin: '****',
          permissions: ['CAN_MANAGE_TASKS'],
          email: currentUser.email || undefined
        };
        storageService.saveSession(ownerUser);
        onLogin(ownerUser);
      }
    });
    return () => unsubscribe();
  }, [onLogin]);

  // QR Session listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (showQrLogin && qrSessionId) {
      unsubscribe = storageService.listenToQrSession(
        qrSessionId,
        (user) => {
          console.log("QR Authorization received for user:", user.name);
          storageService.saveSession(user);
          onLogin(user);
        },
        (err) => {
          setError("Error en la sesión QR: " + err.message);
          setShowQrLogin(false);
        }
      );
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [showQrLogin, qrSessionId, onLogin]);

  const handleStartQrLogin = async () => {
    setIsQrLoading(true);
    setError('');
    try {
      const sessionId = await storageService.createQrSession();
      setQrSessionId(sessionId);
      setShowQrLogin(true);
    } catch (err: any) {
      setError("No se pudo iniciar sesión por QR: " + err.message);
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(async () => {
      const user = await storageService.login(username, pin);
      setLoading(false);
      
      if (user) {
        onLogin(user);
      } else {
        setError('Credenciales inválidas');
      }
    }, 600);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    setUnauthorizedDomain(null);
    setProviderDisabled(false);
    try {
      const user = await storageService.signInWithGoogle();
      if (user && user.email === storageService.SUPER_ADMIN_EMAIL) {
        // Log in as owner
        const ownerUser: User = {
          id: user.uid,
          name: user.displayName || 'Propietario',
          role: UserRole.ADMIN,
          pin: '****',
          permissions: ['CAN_MANAGE_TASKS'],
          email: user.email
        };
        storageService.saveSession(ownerUser);
        onLogin(ownerUser);
      } else {
        setError('Este correo no está autorizado como Súper Admin');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado');
      } else if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
        setError('Configuración de Firebase incompleta: este dominio no está autorizado.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setProviderDisabled(true);
        setError('Google Sign-In no está habilitado en tu proyecto de Firebase.');
      } else {
        setError('Error al iniciar con Google: ' + err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#060812] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-700">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-all duration-500 animate-pop-in relative z-10">
        
        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center justify-center relative">
          <div className="flex flex-col items-center">
            <div className="mb-6 cursor-pointer active:scale-95 transition-transform" onClick={() => setShowGuideModal(true)}>
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Bienvenido a Hub</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" /> Acceso Seguro
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5 group">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">Usuario único</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold"
                placeholder="Nombre de usuario"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-1.5 group">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">Contraseña Personal</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all tracking-[0.5em] font-black"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium text-center animate-shake border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center gap-2">
                 <div className="flex items-center gap-2">
                   <AlertCircle size={16} /> {error}
                 </div>
                 
                 {unauthorizedDomain && (
                   <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg text-[11px] text-left border border-red-200 dark:border-red-800 space-y-2 w-full shadow-sm">
                     <p className="font-bold text-red-700 dark:text-red-300 mb-1 uppercase tracking-tighter">Solución Crítica (Firebase Admin):</p>
                     <p>Debes añadir este dominio a la lista blanca de Firebase para permitir el acceso:</p>
                     <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                       <code className="text-[10px] break-all flex-1">{unauthorizedDomain}</code>
                       <button 
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(unauthorizedDomain);
                           alert('Dominio copiado al portapapeles');
                         }}
                         className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-bold"
                       >
                         COPIAR
                       </button>
                     </div>
                     <a 
                       href={`https://console.firebase.google.com/project/bm-contigo-a8ca6/authentication/providers`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="block text-center py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors"
                     >
                       IR A CONFIGURACIÓN FIREBASE
                     </a>
                     <p className="text-[9px] text-slate-500 italic">Pega el dominio en la sección "Authorized domains" dentro de la pestaña "Settings" de Authentication.</p>
                   </div>
                 )}

                 {providerDisabled && (
                   <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg text-[11px] text-left border border-amber-200 dark:border-amber-800 space-y-2 w-full shadow-sm">
                     <p className="font-bold text-amber-700 dark:text-amber-300 mb-1 uppercase tracking-tighter">Acción Necesaria (Activar Google):</p>
                     <p>El método de inicio de sesión con Google está desactivado en tu consola.</p>
                     <a 
                       href={`https://console.firebase.google.com/project/bm-contigo-a8ca6/authentication/providers`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="block text-center py-2 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition-colors"
                     >
                       HABILITAR GOOGLE EN FIREBASE
                     </a>
                     <div className="text-[9px] text-slate-500 space-y-1">
                       <p>1. Pulsa el botón de arriba.</p>
                       <p>2. Haz clic en "Add new provider".</p>
                       <p>3. Selecciona "Google" y pulsa "Enable" (y guarda).</p>
                     </div>
                   </div>
                 )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-red-600/20 hover:shadow-red-600/40 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Iniciar Sesión</span> 
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Otras formas de acceso</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || isQrLoading}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
              >
                {googleLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStartQrLogin}
                disabled={loading || googleLoading || isQrLoading}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
              >
                {isQrLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <QrCode size={18} className="text-blue-500" />
                    <span>Acceso QR</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* QR Modal Overlay */}
          {showQrLogin && qrSessionId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl flex flex-col items-center text-center animate-pop-in">
                <button 
                  onClick={() => setShowQrLogin(false)}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="text-blue-600" size={32} />
                </div>
                
                <h3 className="text-xl font-bold mb-2">Acceso con QR</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Escanea este código con el móvil donde ya tienes iniciada tu sesión para entrar sin contraseña.
                </p>
                
                <div className="bg-white p-6 rounded-3xl shadow-inner border border-slate-100 flex items-center justify-center mb-8">
                  <QRCodeSVG 
                    value={`${window.location.origin}/qr-auth?sessionId=${qrSessionId}`} 
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-blue-600 animate-progress origin-left"></div>
                </div>
                
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Esperando autorización...
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
             <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
               Hub Operational Intelligence
             </p>
          </div>
        </div>
      </div>

      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default Login;