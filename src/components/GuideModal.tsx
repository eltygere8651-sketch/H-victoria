import React from 'react';
import { X, Package, ClipboardCheck, ShieldCheck, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo } from './Logo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTraining?: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, onStartTraining }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: Package,
      title: "Gestión de Existencias",
      desc: "Monitorización precisa de inventario con analítica de consumo y automatización de pedidos internos.",
      colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: ClipboardCheck,
      title: "Flujos de Trabajo",
      desc: "Asignación y seguimiento de protocolos operativos con verificación de cumplimiento y auditoría de procesos.",
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: ShieldCheck,
      title: "Documentación Digital",
      desc: "Gestión integral de albaranes y registros con exportación certificada a PDF para una logística sin papel.",
      colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90dvh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="relative bg-slate-900 p-6 sm:p-8 text-white overflow-hidden shrink-0 border-b border-slate-800">
          <div className="absolute -top-10 -right-10 opacity-10 rotate-12 scale-150 pointer-events-none">
            <Logo size="xl" solid />
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-500 hover:text-white transition-colors p-2"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
               <Logo size="sm" />
               <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic">
                 Hub
               </h2>
            </div>
            <p className="text-slate-400 font-medium text-xs sm:text-sm leading-relaxed">
              Centraliza y eleva cada operación en una plataforma única, con visibilidad en tiempo real, para ofrecer una experiencia superior en cada detalle.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900 custom-scrollbar">
          <div className="space-y-4">
            {features.map((item, idx) => (
              <div key={idx} className="flex gap-4 sm:gap-5 items-start p-3 sm:p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className={`p-3 rounded-2xl shrink-0 ${item.colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1">{item.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* QR Section - Enhanced visibility */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center gap-4">
             <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-slate-100 ring-4 ring-slate-50 dark:ring-slate-800/10 transition-transform hover:rotate-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}&margin=10&color=dc2626`} 
                  alt="QR" 
                  className="w-32 h-32 sm:w-40 sm:h-40"
                />
             </div>
             <div>
                <h5 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Descarga Hub en tu Móvil</h5>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[200px]">
                  Escanea con tu cámara para instalar la aplicación y recibir notificaciones críticas.
                </p>
             </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3">
          {onStartTraining && (
            <button 
              onClick={onStartTraining}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ArrowRight size={18} className="text-red-600" />
              Formación Profesional
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
