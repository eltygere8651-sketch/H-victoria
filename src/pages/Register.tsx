import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { UserRole } from '../types';
import { Loader2, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle, Lock, Fingerprint, EyeOff, ShieldAlert } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden');
      return;
    }

    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 números');
      return;
    }

    setLoading(true);
    
    try {
      await storageService.addUser({
        name,
        role: UserRole.STAFF,
        pin,
        permissions: []
      });
      setSuccess(true);
    } catch (err) {
      setError('Error al registrar usuario. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#060812] flex flex-col items-center justify-center p-4 font-sans transition-colors duration-700">
        <div className="w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-lg animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">¡Registro Seguro!</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Tu cuenta ha sido creada y encriptada correctamente. <br/><strong>Solo tú conoces tu PIN de acceso.</strong>
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
             <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest justify-center">
                <Lock size={14} /> Encriptación SHA-256 Activa
             </div>
             <p className="text-[10px] text-slate-500">Tus datos han sido procesados a través de nuestro protocolo de seguridad interna.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
          >
            Entrar a la Aplicación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#060812] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-700">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10 animate-fade-in duration-1000">
        
        {/* Security Messaging Header */}
        <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-5 text-white shadow-xl flex items-center gap-4 border border-blue-400 dark:border-blue-500/30">
           <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <ShieldCheck size={28} className="text-white" />
           </div>
           <div>
              <h2 className="font-black uppercase tracking-tight text-lg leading-none">Registro Altamente Seguro</h2>
              <p className="text-[11px] opacity-80 mt-1 font-medium leading-relaxed">
                Utilizamos encriptación <strong>SHA-256</strong> integrada. Tu PIN es personal e intransferible; el administrador jamás sabrá cuál es tu código.
              </p>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-all duration-500 relative">
          <div className="pt-8 pb-4 px-8 flex flex-col items-center justify-center">
            <div className="mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white text-center">Protocolo de Registro</h1>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
               <Fingerprint size={14} className="text-blue-500" /> Identidad Verificada por Hub
            </div>
          </div>

          <div className="px-8 pb-10">
            <form onSubmit={handleRegister} className="space-y-4">
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                    placeholder="Tu nombre y apellido"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                    Elegir PIN (4 dígitos)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tracking-widest font-black"
                      placeholder="••••"
                      maxLength={4}
                      required
                      disabled={loading}
                    />
                    <EyeOff size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                    Confirmar PIN
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tracking-widest font-black"
                      placeholder="••••"
                      maxLength={4}
                      required
                      disabled={loading}
                    />
                    <CheckCircle2 size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${pin === confirmPin && pin.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold text-center animate-shake border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-3">
                   <AlertCircle size={18} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 disabled:opacity-70 mt-4 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <span className="uppercase tracking-widest text-xs">Validar y Registrar Identidad</span> 
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 pt-4 text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">
                 <span className="flex items-center gap-1"><Lock size={10} /> SHA-256</span>
                 <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                 <span className="flex items-center gap-1"><ShieldCheck size={10} /> SSL-HUB</span>
                 <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                 <span className="flex items-center gap-1">AES-V</span>
              </div>
            </form>
          </div>
        </div>

        {/* Floating Privacy Note */}
        <div className="bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-slate-200/50 dark:border-slate-700/50">
           <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">
             "Privacidad por Diseño: El administrador principal no posee herramientas para reconstruir tu PIN a partir de los datos guardados."
           </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
