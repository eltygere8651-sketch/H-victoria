import React from 'react';
import { Smartphone, X, Download, CheckCircle2, QrCode } from 'lucide-react';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const appUrl = window.location.origin;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2"
          >
            <X size={20} />
          </button>

          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
            <Smartphone size={40} className="text-red-600 dark:text-red-400" />
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Instalar Hub App</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
            Lleva el control de tu hotel a todas partes con nuestra aplicación nativa.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&margin=10&color=dc2626`} 
                alt="QR Code" 
                className="w-40 h-40"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest">
              <QrCode size={16} /> Escanea para descargar
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-black text-xs">iOS</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">iPhone / iPad</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Pulsa "Compartir" y luego "Añadir a pantalla de inicio".</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <span className="text-green-600 dark:text-green-400 font-black text-xs">AND</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Android</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Pulsa el menú de 3 puntos y selecciona "Instalar aplicación".</p>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-8 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
