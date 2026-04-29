import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, User, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import * as storageService from '../services/storageService';
import { UserRole } from '../types';

interface RegisterProps {
  onRegister: (user: any) => void;
  onBack: () => void;
  setShowGuideModal: (show: boolean) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (username.trim().length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    
    try {
      const newUser = await storageService.addUser({
        name: username.trim(),
        contraseña: password,
        role: UserRole.STAFF, // Por defecto Personal
      });
      
      setSuccess(true);
      setTimeout(() => {
        if (newUser) onRegister(newUser);
      }, 1500);
    } catch (err: any) {
      if (err.message === 'USERNAME_EXISTS') {
        setError('Este nombre de usuario ya está registrado. Prueba con otro.');
      } else {
        setError(`Error: ${err.message || 'Fallo de conexión con el servidor'}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-black/50 overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <motion.div 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="inline-flex p-4 bg-red-50 dark:bg-red-500/10 rounded-3xl text-red-600 dark:text-red-500 mb-6"
            >
              <UserPlus size={40} strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Crear Cuenta</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Únete al equipo de Hotel Victoria</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 group">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">Nombre de Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold"
                  placeholder="Tu nombre o nick"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-14 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold tracking-widest"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 outline-none transition-all font-bold tracking-widest"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/20"
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden ${
                success 
                ? 'bg-emerald-500 text-white shadow-emerald-500/25' 
                : 'bg-red-600 text-white shadow-red-600/25 hover:bg-red-700'
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="animate-spin" size={20} />
                  </motion.div>
                ) : success ? (
                  <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    <span>¡REGISTRO ÉXITOSO!</span>
                  </motion.div>
                ) : (
                  <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <span>COMIENZA AHORA</span>
                    <ArrowRight size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-red-600 transition-colors"
            >
              ¿Ya tienes cuenta? Inicia Sesión
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
