import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const user = await storageService.login(username, pin);
    setLoading(false);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas. Intenta "Admin" y "1234"');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-pop-in overflow-hidden border border-gray-100 dark:border-slate-700/50 transition-colors duration-300 animate-pop-in">
        <div className="bg-gradient-to-br from-red-600 to-red-800 dark:from-red-700 dark:to-red-900 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          
          <Logo size="xl" className="shadow-2xl shadow-red-900/50 drop-shadow-lg mb-6 bg-white/10 backdrop-blur-sm border border-white/20" />
          <h1 className="text-4xl font-extrabold tracking-tight text-center drop-shadow-md">Hub</h1>
          <p className="opacity-90 mt-2 font-medium text-red-100 text-sm max-w-xs text-center drop-shadow-sm">Centraliza el inventario, agiliza los pedidos y conecta a tu equipo.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600/50 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 focus:border-red-500 outline-none transition-all bg-gray-50 dark:bg-slate-700/50 dark:text-white focus:bg-white dark:focus:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm"
                placeholder="Ej. Admin"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">PIN de Acceso</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600/50 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 focus:border-red-500 outline-none transition-all bg-gray-50 dark:bg-slate-700/50 dark:text-white focus:bg-white dark:focus:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm"
                placeholder="••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium animate-pulse border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-button-red active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {loading ? <Loader2 className="animate-spin text-white" /> : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-400 dark:text-slate-500">
             Sistema de Gestión v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;