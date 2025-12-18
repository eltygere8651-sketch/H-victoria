import React from 'react';
import { X, Package, ShoppingCart, ClipboardCheck, ShieldCheck, Zap, Smartphone, ArrowRight } from 'lucide-react';
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
      title: "Precisión de Inventario",
      desc: "Monitoreo inteligente en tiempo real con algoritmos de alerta preventiva para existencias críticas.",
      tag: "Optimización",
      colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
      borderHover: "hover:border-blue-500/30"
    },
    {
      icon: ShoppingCart,
      title: "Logística Digital",
      desc: "Gestión de pedidos internos sin fricción con generación instantánea de albaranes técnicos en PDF.",
      tag: "Agilidad",
      colorClass: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
      borderHover: "hover:border-green-500/30"
    },
    {
      icon: ClipboardCheck,
      title: "Ejecución de Tareas",
      desc: "Arquitectura de tareas con evidencia fotográfica y trazabilidad completa de comentarios técnicos.",
      tag: "Control",
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
      borderHover: "hover:border-amber-500/30"
    },
    {
      icon: ShieldCheck,
      title: "Seguridad Estructural",
      desc: "Control de acceso mediante roles jerárquicos, autenticación por PIN y auditoría de actividad.",
      tag: "Confianza",
      colorClass: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
      borderHover: "hover:border-red-500/30"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in border border-white/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-red-900 to-red-700 p-8 md:p-12 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-12 -translate-y-12 scale-150">
            <Logo size="xl" solid />
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-md border border-white/10 z-20"
          >
            <X size={20} />
          </button>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Zap size={12} fill="currentColor" /> Business Intelligence
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-none">
              Impulse su <br /> <span className="text-red-400">Eficiencia Operativa</span>
            </h2>
            <p className="text-red-100/80 font-medium text-sm md:text-lg max-w-md leading-relaxed">
              Hub es el ecosistema digital diseñado para centralizar, acelerar y profesionalizar cada proceso de su organización.
            </p>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-[#0a0f1e]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {solutions.map((item, idx) => (
              <div key={idx} className={`group bg-white dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-xl transition-all duration-300 ${item.borderHover}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${item.colorClass} group-hover:scale-110 transition-transform`}>
                    <item.icon size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.tag}</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Installation & Tech Section */}
          <div className="bg-slate-900 dark:bg-red-950/20 rounded-[2rem] p-8 text-white relative overflow-hidden">
             <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                   <h5 className="text-2xl font-black mb-3 flex items-center justify-center md:justify-start gap-2 text-red-400">
                     <Smartphone size={24} /> Experiencia Nativa
                   </h5>
                   <p className="text-slate-300 font-medium mb-6">
                     Hub utiliza tecnología <strong>PWA</strong> para ofrecer un rendimiento superior. Instálela en su dispositivo para acceder instantáneamente sin depender de un navegador.
                   </p>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                        <Smartphone size={16} /> iOS: Compartir &gt; Inicio
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                        <Smartphone size={16} /> Android: Menú &gt; Instalar
                      </div>
                   </div>
                </div>
                <div className="shrink-0 bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                   <div className="bg-white p-3 rounded-2xl shadow-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin)}&margin=4`} 
                        alt="QR App" 
                        className="w-24 h-24"
                      />
                   </div>
                   <p className="text-[10px] font-black text-center mt-3 uppercase tracking-tighter text-red-400">Acceso Rápido</p>
                </div>
             </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center px-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Hub Ecosystem • v1.0</p>
            <button 
              onClick={onClose}
              className="text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
            >
              Comenzar ahora <ArrowRight size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};