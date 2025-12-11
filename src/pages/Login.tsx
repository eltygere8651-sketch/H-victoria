import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User } from '../types';
import { Loader2, ArrowRight, HelpCircle } from 'lucide-react';
import { GuideModal } from '../components/GuideModal';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Artificial delay for better UX
    setTimeout(async () => {
        const user = await storageService.login(username, pin);
        setLoading(false);
        
        if (user) {
          onLogin(user);
        } else {
          setError('Credenciales incorrectas.');
        }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans relative">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 dark:border-slate-700/50 transition-all duration-300 animate-pop-in relative">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-red-700 to-red-900 py-10 px-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
          {/* Subtle Texture/Pattern Overlay */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Help Button inside the header - High Z-Index */}
          <button 
            onClick={() => setShowGuide(true)}
            className="absolute top-4 right-4 text-white hover:text-red-100 bg-white/20 hover:bg-white/30 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 z-50 shadow-sm border border-white/20"
            title="¿Qué es Hub?"
            type="button"
          >
            <HelpCircle size={24} strokeWidth={2.5} />
          </button>
          
          <div className="relative z-10 flex flex-col items-center">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl mb-4">
                <Logo size="md" className="drop-shadow-md" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-center drop-shadow-md mb-2">Hub</h1>
              <p className="font-medium text-red-100 text-sm max-w-[260px] text-center leading-relaxed opacity-90">
                La estrategia inteligente detrás de tus mejores resultados.
              </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white font-semibold placeholder-gray-400 focus:bg-white dark:focus:bg-slate-800 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 outline-none transition-all duration-200"
                placeholder="Ej. Administrador"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">PIN de Acceso</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white font-semibold placeholder-gray-400 focus:bg-white dark:focus:bg-slate-800 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 outline-none transition-all duration-200 tracking-widest"
                placeholder="••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold text-center animate-shake border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                 <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin text-white" />
              ) : (
                <>
                  Iniciar Sesión <ArrowRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/50 text-center">
             <p className="text-[10px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">
               Sistema de Gestión v1.0
             </p>
          </div>
        </div>
      </div>

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default Login;