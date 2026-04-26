import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { authorizeQrSession, getSession } from '../services/storageService';

const QrAuthorize: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('sessionId');
  const currentUser = getSession();
  
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      // Si no hay sesión, avisar al usuario
      setError("Debes iniciar sesión primero en este dispositivo");
      setStatus('ERROR');
    }
  }, [currentUser]);

  const handleAuthorize = async () => {
    if (!sessionId || !currentUser) return;
    
    setStatus('LOADING');
    try {
      await authorizeQrSession(sessionId, currentUser);
      setStatus('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setError(err.message || 'Error al autorizar la sesión');
    }
  };

  const handleGoBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800 text-center"
      >
        {status === 'IDLE' && (
          <>
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={40} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Autorizar Acceso</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Están intentando acceder a tu cuenta desde un ordenador. ¿Deseas permitir el acceso?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleAuthorize}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                Sí, Autorizar PC
              </button>
              <button
                onClick={handleGoBack}
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all"
              >
                No, Cancelar
              </button>
            </div>
          </>
        )}

        {status === 'LOADING' && (
          <div className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Procesando autorización...</p>
          </div>
        )}

        {status === 'SUCCESS' && (
          <>
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={40} />
            </div>
            <h1 className="text-2xl font-bold mb-2">¡Completado!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              El ordenador ya ha iniciado sesión correctamente. Puedes cerrar esta ventana.
            </p>
            <button
               onClick={handleGoBack}
               className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> Volver al Inicio
            </button>
          </>
        )}

        {status === 'ERROR' && (
          <>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="text-red-600 dark:text-red-400" size={40} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="text-red-500 mb-8 font-medium">
              {error}
            </p>
            <button
              onClick={() => setStatus('IDLE')}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all"
            >
              Reintentar
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default QrAuthorize;
