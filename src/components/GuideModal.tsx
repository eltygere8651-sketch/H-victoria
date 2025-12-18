import React from 'react';
import { X, Package, ShoppingCart, ClipboardCheck, ShieldCheck, Zap, Globe } from 'lucide-react';
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
      title: "Control de Inventario",
      desc: "Gestión de stock en tiempo real con alertas automáticas de nivel bajo para evitar roturas de stock.",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
    },
    {
      icon: ShoppingCart,
      title: "Pedidos Internos",
      desc: "Sistema digital de reposición entre departamentos. Elimina el papel y centraliza las solicitudes.",
      color: "text-green-500 bg-green-50 dark:bg-green-900/20"
    },
    {
      icon: ClipboardCheck,
      title: "Gestión de Tareas",
      desc: "Asignación de tareas con prioridades, evidencia fotográfica y comentarios para una comunicación fluida.",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
    },
    {
      icon: ShieldCheck,
      title: "Administración Total",
      desc: "Gestión de usuarios, roles de seguridad, PINs de acceso y auditoría de actividad.",
      color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in border border-gray-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-red-600 to-red-800 p-6 md:p-8 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-10 -translate-y-10">
            <Logo size="xl" solid />
          </div>
          
          <div className="absolute top-4 right-4 z-20">
             <button 
               onClick={onClose}
               className="bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md"
             >
               <X size={20} />
             </button>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg">
                 <Logo size="md" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-1">Bienvenido a Hub</h2>
                <p className="text-red-100 font-medium text-sm md:text-base opacity-90 max-w-md">
                  Plataforma de Inteligencia Operativa Integral
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 dark:bg-slate-950/50">
          <div className="space-y-8 animate-fade-in">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
                <strong className="text-gray-900 dark:text-white">Hub</strong> centraliza la logística y comunicación de tu negocio en una sola aplicación. Diseñada para optimizar flujos de trabajo, reducir errores y conectar a tu equipo en tiempo real.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm flex gap-4 items-start hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.color}`}>
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{feature.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-100 dark:bg-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                   <Zap size={20} fill="currentColor" className="text-blue-600 dark:text-blue-400" />
                 </div>
                 <div>
                   <h5 className="font-bold text-gray-900 dark:text-white text-sm">Tecnología PWA</h5>
                   <p className="text-xs text-gray-500 dark:text-slate-400">Instalable, rápida y funciona offline.</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                   <Globe size={20} />
                 </div>
                 <div>
                   <h5 className="font-bold text-gray-900 dark:text-white text-sm">Acceso Público</h5>
                   <p className="text-xs text-gray-500 dark:text-slate-400">Comparte tareas externamente.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hub v1.0 • Sistema Operativo</p>
        </div>
      </div>
    </div>
  );
};