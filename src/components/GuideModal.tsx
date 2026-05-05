import React from 'react';
import { X, Package, ClipboardCheck, ShieldCheck, Smartphone, ArrowRight, CheckCircle2, ConciergeBell } from 'lucide-react';
import { Logo } from './Logo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: Package,
      title: "Inventario",
      desc: "Control de existencias, analítica de consumo y pedidos automatizados.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ConciergeBell,
      title: "Reservas",
      desc: "Gestión de mesas y seguimiento de comensales en tiempo real.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ClipboardCheck,
      title: "Operaciones",
      desc: "Auditoría de protocolos y verificación de cumplimiento diario.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ShieldCheck,
      title: "Logística",
      desc: "Gestión de albaranes y registros con exportación protegida a PDF.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-950 w-full max-w-xl max-h-[90dvh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-5 text-white overflow-hidden shrink-0 border-b border-white/10 flex justify-between items-center shadow-lg">
          {/* Animated decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex-1">
            <h2 className="text-xl font-black tracking-tighter uppercase italic mb-1 flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-[linear-gradient(110deg,#fff,45%,#fbbf24,55%,#fff)] bg-[length:200%_100%] animate-shine">Hub Eco System</span>
            </h2>
            <p className="text-red-50 font-medium text-[11px] leading-snug max-w-xs opacity-90">
              Centraliza inventario, pedidos y tareas en un solo flujo inteligente para maximizar la eficiencia de tu negocio.
            </p>
          </div>
          
          <div className="relative z-10 shrink-0 ml-4 p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 shadow-xl group hover:scale-105 transition-transform duration-500">
             <Logo size="sm" strokeColor="#ffffff" />
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-black/10 hover:bg-black/20 text-white transition-all z-20 rounded-lg active:scale-95"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-950 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((item, idx) => (
              <div key={idx} className="flex gap-2.5 items-start p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm group">
                <div className={`p-2 rounded-xl shrink-0 ${item.colorClass} shadow-sm group-hover:scale-105 transition-transform`}>
                  <item.icon size={16} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-[10px] mb-0.5 uppercase tracking-tight">{item.title}</h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* QR Section - Even more compact */}
          <div className="bg-gradient-to-br from-red-700 via-red-800 to-slate-900 rounded-2xl p-4 flex flex-row items-center justify-between text-left gap-4 shadow-xl border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
             
             <div className="bg-white p-2 rounded-2xl shadow-2xl relative z-10 shrink-0">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}&margin=10&color=991b1b`} 
                  alt="QR" 
                  className="w-20 h-20"
                />
             </div>
             <div className="flex-1 relative z-10">
                <h5 className="text-[12px] font-black text-white uppercase tracking-tight mb-0.5">Acceso Móvil</h5>
                <p className="text-[9px] text-red-100/70 font-medium leading-tight max-w-[140px]">
                   Escanea para gestión en tiempo real desde tu dispositivo.
                </p>
             </div>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
