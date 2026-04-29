import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { UserRole } from '../types';
import { Loader2, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle, Lock, User as UserIcon, Eye, EyeOff, KeyRound } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
  setShowGuideModal: (show: boolean) => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, setShowGuideModal }) => {
  const [username, setUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    
    try {
      await storageService.cambiar(username.trim(), oldPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        setError('El nombre de usuario no existe. Asegúrate de escribirlo correctamente.');
      } else if (err.message === 'INVALID_OLD_PASSWORD') {
        setError('La contraseña anterior es incorrecta. Por seguridad, verifica tus datos.');
      } else {
        setError(`Error: ${err.message || 'Fallo de conexión con el servidor'}`);
      }
      console.error('Error de cambio de contraseña:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-[#060812] flex flex-col items-center justify-center p-4 font-sans selection:bg-red-500/30">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 text-center space-y-8 animate-pop-in">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-full flex items-center justify-center mx-auto text-white shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse">
            <CheckCircle2 size={56} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tight text-balance">Contraseña Actualizada</h2>
            <p className="text-slate-400 text-lg">Tu nueva contraseña ha sido configurada con éxito.</p>
          </div>
          <div className="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/20 space-y-3">
             <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-[0.2em] justify-center">
                <Lock size={14} /> SEGURIDAD SHA-256
             </div>
             <p className="text-[11px] text-blue-400/70 leading-relaxed font-medium">Ya puedes iniciar sesión con tu nueva contraseña de acceso. El cambio ha sido aplicado a tu perfil de STAFF o ADMIN.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-[0_10px_25px_rgba(220,38,38,0.4)] active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-3"
          >
            Entrar ahora <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#060812] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-red-500/30">
        {/* Cinematic Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] bg-red-600/5 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        {/* Micro-Interaction Grid Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-lg flex flex-col gap-8 relative z-10 animate-fade-in">
        
        {/* Minimalist Professional Logo Section */}
        <div className="flex flex-col items-center text-center space-y-4">
            <div 
              className="p-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl hover:scale-105 transition-transform duration-500 cursor-pointer group active:scale-95"
              onClick={() => setShowGuideModal(true)}
            >
              <Logo size="xl" />
            </div>
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Cambiar Contraseña</h1>
                <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase text-balance">Hub: Gestión de Seguridad Staff & Admin</p>
            </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-3xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5 transition-all duration-700 animate-slide-up">
          <div className="p-10">
            <form onSubmit={handleChangePin} className="space-y-6">
              
              <div className="space-y-5">
                {/* Username Input */}
                <div className="space-y-2 group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 group-focus-within:text-blue-500 transition-colors">
                    <UserIcon size={12} /> Tu Usuario
                  </label>
                  <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-6 py-4.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-slate-600 focus:bg-white/10 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all font-bold text-lg"
                        placeholder="Nombre de usuario"
                        required
                        disabled={loading}
                      />
                  </div>
                </div>

                {/* Old Password Input */}
                <div className="space-y-2 group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 group-focus-within:text-amber-500 transition-colors">
                    <Lock size={12} /> Contraseña Anterior (Seguridad)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-6 pr-14 py-4.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-slate-600 focus:bg-white/10 focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 outline-none transition-all font-bold text-lg tracking-widest [&:not(:placeholder-shown)]:tracking-[0.8em]"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* New Password Input */}
                <div className="space-y-2 group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 group-focus-within:text-red-500 transition-colors">
                    <KeyRound size={12} /> Nueva Contraseña de acceso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-6 pr-14 py-4.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-slate-600 focus:bg-white/10 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold text-lg tracking-widest [&:not(:placeholder-shown)]:tracking-[0.8em]"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2 group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 group-focus-within:text-red-500 transition-colors">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-6 pr-14 py-4.5 rounded-2xl border border-white/5 bg-white/5 text-white placeholder-slate-600 focus:bg-white/10 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold text-lg tracking-widest [&:not(:placeholder-shown)]:tracking-[0.8em]"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        {newPassword && confirmPassword && (
                            newPassword === confirmPassword ? 
                            <CheckCircle2 size={20} className="text-emerald-500 animate-pop-in" /> : 
                            <AlertCircle size={20} className="text-red-500 animate-shake" />
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-500 p-5 rounded-3xl text-sm font-bold text-center animate-shake border border-red-500/20 flex items-center justify-center gap-3">
                   <AlertCircle size={20} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-[0_15px_30px_rgba(220,38,38,0.3)] hover:shadow-[0_20px_40px_rgba(220,38,38,0.4)] active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-50 mt-4 group overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <span className="uppercase tracking-[0.2em] text-sm text-balance">Cambiar mi contraseña de acceso</span> 
                    <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
                {/* Shine Animation */}
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-[1000ms] ease-in-out pointer-events-none"></div>
              </button>

              <div className="flex flex-col items-center gap-4 pt-6">
                 <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> AES-256</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                    <span className="flex items-center gap-1.5"><Lock size={12} className="text-blue-500" /> SECURE</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                    <span className="flex items-center gap-1.5">SHA-256</span>
                 </div>
                 <p className="text-[10px] text-slate-500 font-bold italic tracking-tight opacity-70">
                   "Debes conocer tu contraseña actual para poder establecer una nueva."
                 </p>
              </div>
            </form>
          </div>
        </div>

        {/* Back Link */}
        <button 
            onClick={onBack}
            className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all group"
        >
            <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default Register;
