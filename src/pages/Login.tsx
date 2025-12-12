import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User } from '../types';
import { Loader2, ArrowRight, HelpCircle, Play, Sparkles } from 'lucide-react';
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
  
  // Demo Mode States
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

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

  const handleDemoMode = async () => {
    setIsDemoLoading(true);
    const steps = [
      "Conectando a servidor seguro...",
      "Limpiando entorno de pruebas...",
      "Generando inventario inteligente...",
      "Simulando historial de pedidos...",
      "Cargando tareas con evidencia visual...",
      "Finalizando configuración..."
    ];

    // Play visual sequence
    for (let i = 0; i < steps.length; i++) {
      setDemoStep(i);
      await new Promise(r => setTimeout(r, 800)); // Delay for effect
    }

    // Actual data injection
    const demoUser = await storageService.injectShowcaseData();
    
    setIsDemoLoading(false);
    if (demoUser) {
      onLogin(demoUser);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-gray-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300 font-sans relative overflow-y-auto">
      
      {/* DEMO LOADING OVERLAY */}
      {isDemoLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white">
          <div className="w-24 h-24 mb-8 relative">
             <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-red-500 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <Logo size="sm" solid />
             </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Preparando Demo</h2>
          <div className="h-8 flex items-center justify-center">
             <p className="text-slate-400 font-mono text-sm animate-pulse">
               {["Conectando...", "Generando Datos...", "Configurando...", "Sincronizando...", "Listo..."][Math.min(demoStep, 4)]}
             </p>
          </div>
          <div className="mt-8 w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${((demoStep + 1) / 6) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 dark:border-slate-700/50 transition-all duration-300 animate-pop-in relative my-auto">
        
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
              className="w-full mt-4 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Iniciar Sesión <ArrowRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-800 px-2 text-gray-400 dark:text-slate-500 font-bold tracking-widest">O prueba la experiencia</span>
            </div>
          </div>

          {/* DEMO BUTTON */}
          <button
            onClick={handleDemoMode}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
            <Sparkles size={20} className="text-yellow-200 animate-pulse" />
            <span>Modo Demo Showcase</span>
            <Play size={16} fill="currentColor" className="opacity-80" />
          </button>

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