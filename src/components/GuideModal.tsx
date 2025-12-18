import React from 'react';
import { X, Package, ShoppingCart, ClipboardCheck, ShieldCheck, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo } from './Logo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const solutions = [
    {
      icon: Package,
      title: "Inventario Inteligente",
      desc: "Monitoreo de stock en tiempo real con algoritmos de alerta predictiva.",
      tag: "Precisión",
      colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: ShoppingCart,
      title: "Logística Digital",
      desc: "Gestión de pedidos internos con generación automática de albaranes PDF.",
      tag: "Agilidad",
      colorClass: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    },
    {
      icon: ClipboardCheck,
      title: "Gestión Operativa",
      desc: "Asignación de tareas con evidencia fotográfica y trazabilidad completa.",
      tag: "Control",
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: ShieldCheck,
      title: "Seguridad de Datos",
      desc: "Control de acceso por PIN, roles jerárquicos y auditoría de eventos.",
      tag: "Confianza",
      colorClass: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in border-t border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed to support Safe Area in iOS */}
        <div className="relative bg-gradient-to-br from-slate-900 via-red-950 to-red-800 p-8 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 text-white overflow-hidden shrink-0 border-b border-white/5">
          {/* Decorative Logo Background */}
          <div className="absolute -top-4 -right-4 opacity-10 rotate-12 scale-150 pointer-events-none">
            <Logo size="xl" solid />
          </div>
          
          {/* Close Button - Optimized for iOS Notch Integration */}
          <button 
            onClick={onClose}
            className="absolute right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-md border border-white/10 z-20 active:scale-90 shadow-lg"
            style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            aria-label="Cerrar guía"
          >
            <X size={24} strokeWidth={2.5} />
          </button>

          <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl mb-6 inline-block">
               <Logo size="md" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 leading-none text-white uppercase italic">
              Hub <span className="text-red-500">Ecosystem</span>
            </h2>
            <p className="text-red-100/70 font-medium text-sm sm:text-base max-w-sm">
              La plataforma definitiva para la inteligencia operativa y el control total de su organización.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 dark:bg-[#0a0f1e] space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {solutions.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex gap-4 items-start group hover:border-red-500/30 transition-all">
                <div className={`p-3 rounded-2xl shrink-0 ${item.colorClass} group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{item.title}</h4>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400">{item.tag}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Installation Section */}
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden shadow-xl border border-white/5 relative">
             <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="flex-1 text-center md:text-left">
                   <h5 className="text-xl font-black mb-2 flex items-center justify-center md:justify-start gap-2 text-red-400 uppercase tracking-tight">
                     <Smartphone size={20} /> App Descargable
                   </h5>
                   <p className="text-xs text-slate-300 font-medium mb-4 leading-relaxed">
                     Hub utiliza tecnología <strong>PWA</strong>. Instálela para obtener acceso instantáneo y rendimiento nativo.
                   </p>
                   <div className="space-y-2 inline-block text-left">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-white/5 p-2 rounded-lg border border-white/5">
                        <CheckCircle2 size={14} className="text-red-500" /> iOS: Compartir &gt; "Añadir a inicio"
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-white/5 p-2 rounded-lg border border-white/5">
                        <CheckCircle2 size={14} className="text-red-500" /> Android: Menú &gt; "Instalar"
                      </div>
                   </div>
                </div>
                <div className="shrink-0 bg-white p-3 rounded-2xl shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin)}&margin=4`} 
                      alt="QR App" 
                      className="w-24 h-24"
                    />
                    <p className="text-[8px] font-black text-center mt-2 uppercase tracking-tighter text-slate-400">Escanee para instalar</p>
                </div>
             </div>
          </div>
        </div>
        
        {/* Footer Action */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center pb-safe">
            <button 
              onClick={onClose}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
            >
              Entendido <ArrowRight size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};