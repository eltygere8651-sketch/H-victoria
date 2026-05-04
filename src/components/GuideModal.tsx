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
      title: "Gestión de Existencias",
      desc: "Monitorización precisa de inventario con analítica de consumo y automatización avanzada de pedidos.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ConciergeBell,
      title: "Reservas Premium",
      desc: "Gestión inteligente de reservas, asignación de mesas y seguimiento de comensales en tiempo real.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ClipboardCheck,
      title: "Flujos de Trabajo",
      desc: "Auditoría de protocolos operativos con verificación de cumplimiento y trazabilidad completa.",
      colorClass: "text-red-500 bg-red-50 dark:bg-red-900/10",
    },
    {
      icon: ShieldCheck,
      title: "Logística Digitalizada",
      desc: "Gestión integral de albaranes y registros con exportación certificada a PDF para una operativa de élite.",
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
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-8 text-white overflow-hidden shrink-0 border-b border-white/10 flex justify-between items-center shadow-lg">
          {/* Animated decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-2 flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-[linear-gradient(110deg,#fff,45%,#fbbf24,55%,#fff)] bg-[length:200%_100%] animate-shine">Hub Intelligence</span>
            </h2>
            <p className="text-red-50 font-medium text-sm leading-relaxed max-w-sm">
              Plataforma de gestión operativa de élite. Centraliza, audita y eleva cada detalle de tu establecimiento.
            </p>
          </div>
          
          <div className="relative z-10 shrink-0 ml-6 p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl group hover:scale-105 transition-transform duration-500">
             <Logo size="md" strokeColor="#ffffff" />
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/10 hover:bg-black/20 text-white transition-all z-20 rounded-xl active:scale-95"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-slate-950 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md hover:-translate-y-0.5 group">
                <div className={`p-3 rounded-2xl shrink-0 ${item.colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1 uppercase tracking-tight">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* QR Section - Enhanced visibility */}
          <div className="bg-gradient-to-br from-red-700 via-red-800 to-slate-900 rounded-[2.5rem] p-8 flex flex-row items-center justify-between text-left gap-6 shadow-xl border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000"></div>
             
             <div className="bg-white p-3 rounded-[1.5rem] shadow-2xl relative z-10">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}&margin=10&color=991b1b`} 
                  alt="QR" 
                  className="w-24 h-24"
                />
             </div>
             <div className="flex-1 relative z-10">
                <h5 className="text-lg font-black text-white uppercase tracking-tight mb-2">Instala en tu móvil</h5>
                <p className="text-xs text-red-100/70 font-medium leading-relaxed max-w-[200px]">
                  Acceso directo a la plataforma desde tu dispositivo para un control total en tiempo real.
                </p>
             </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
