import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User, UserRole } from '../types';
import { Loader2, ArrowRight, HelpCircle, ShieldCheck, AlertCircle, Smartphone } from 'lucide-react';
import { GuideModal } from '../components/GuideModal';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Check for existing Google session on mount
  React.useEffect(() => {
    const checkExistingAuth = async () => {
      const currentUser = storageService.auth.currentUser;
      if (currentUser && currentUser.email === 'eltygere8651@gmail.com' && !storageService.getSession()) {
        console.log("Auto-logging in owner...");
        const ownerUser: User = {
          id: 'owner',
          name: 'Propietario',
          role: UserRole.ADMIN,
          pin: '****',
          permissions: ['CAN_MANAGE_TASKS']
        };
        onLogin(ownerUser);
      }
    };
    checkExistingAuth();
  }, [onLogin]);

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
    setLoading(true);
    setError('');
    try {
      const googleUser = await storageService.loginWithGoogle();
      const userEmail = googleUser?.email;
      
      console.log("Google Login Success, Email:", userEmail);
      
      if (userEmail === 'eltygere8651@gmail.com') {
        // Owner bypass - create a temporary admin session
        const ownerUser: User = {
          id: 'owner',
          name: 'Propietario',
          role: UserRole.ADMIN,
          pin: '****',
          email: 'eltygere8651@gmail.com',
          permissions: ['CAN_MANAGE_TASKS']
        };
        onLogin(ownerUser);
      } else if (userEmail) {
        // Check if this Google user is registered in our users collection
        const registeredUser = await storageService.getUserByEmail(userEmail);
        
        if (registeredUser) {
          // If the user is found by email but the document ID is not their Google UID,
          // we should link them so Firestore rules can identify them by UID.
          if (registeredUser.id !== googleUser.uid) {
            console.log("Linking Google UID to user document...");
            const { id, ...userData } = registeredUser;
            // Create/Update document with UID as ID
            await storageService.db.collection('hotel_victoria_users').doc(googleUser.uid).set({
              ...userData,
              email: userEmail // Ensure email is set
            }, { merge: true });
            
            // Optionally delete the old document if it was auto-generated
            if (id.length < 20) { // Simple check to see if it's an auto-id vs UID
               // For safety in this demo, we'll keep both or just use the new one
            }
            
            registeredUser.id = googleUser.uid;
          }
          onLogin(registeredUser);
        } else {
          // Sign out if not authorized
          await storageService.logoutGoogle();
          setError(`Acceso denegado para ${userEmail}. Este correo no está autorizado en el sistema.`);
        }
      } else {
        setError('No se pudo obtener el correo electrónico de la cuenta de Google.');
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError(`Error al iniciar sesión: ${err.message || 'Inténtalo de nuevo.'}`);
      }
    } finally {
      setLoading(false);
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
          <button 
            onClick={() => setShowGuide(true)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-full transition-all active:scale-95"
            type="button"
            title="Ayuda"
          >
            <HelpCircle size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="mb-6">
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
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                placeholder="Ingresa tu usuario"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all tracking-widest"
                placeholder="••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium text-center animate-shake border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                 <AlertCircle size={16} /> {error}
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
          </form>

          <div className="mt-6 flex flex-col gap-3">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-100 dark:border-slate-800 w-full"></div>
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">O</span>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              <span>Acceso Propietario</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
             <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
               Hub Operational Intelligence
             </p>
          </div>
        </div>
      </div>

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />

      {/* Floating Guide Button */}
      <button 
        onClick={() => setShowGuide(true)}
        className="fixed bottom-6 right-6 z-[60] bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl shadow-black/20 flex items-center gap-3 font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:pr-6 group"
      >
        <HelpCircle size={20} className="group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">Guía & App</span>
      </button>
    </div>
  );
};

export default Login;