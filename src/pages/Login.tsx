import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User } from '../types';
import { Loader2, ArrowRight, HelpCircle, ShieldCheck, AlertCircle } from 'lucide-react';
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#060812] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-700">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800/50 transition-all duration-500 animate-pop-in relative z-10">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-slate-900 via-red-950 to-red-800 py-12 px-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-8 -translate-y-8 scale-150">
            <Logo size="xl" solid />
          </div>
          
          <button 
            onClick={() => setShowGuide(true)}
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 z-50 border border-white/10"
            type="button"
          >
            <HelpCircle size={22} />
          </button>
          
          <div className="relative z-10 flex flex-col items-center">
              <div className="p-3.5 bg-white/10 backdrop-blur-2xl rounded-[1.25rem] border border-white/20 shadow-2xl mb-5 group hover:scale-110 transition-transform duration-500">
                <Logo size="md" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-center mb-1 uppercase italic">Hub</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                <ShieldCheck size={12} /> Enterprise Secure
              </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Identificador</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 outline-none transition-all duration-300"
                placeholder="Usuario"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Código PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 outline-none transition-all duration-300 tracking-[0.5em]"
                placeholder="••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-black text-center animate-shake border border-red-100 dark:border-red-900/20 flex items-center justify-center gap-2 uppercase tracking-tight">
                 <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-600/30 hover:shadow-red-600/50 active:scale-95 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:grayscale"
            >
              {loading ? (
                <Loader2 className="animate-spin text-white" size={24} />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">Acceder al Panel</span> 
                  <ArrowRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
             <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">
               Operational Intelligence • v1.0
             </p>
          </div>
        </div>
      </div>

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default Login;