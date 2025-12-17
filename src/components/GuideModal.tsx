import React, { useState } from 'react';
import { X, Package, ShoppingCart, ClipboardCheck, ShieldCheck, Zap, Globe, PlayCircle, LayoutGrid } from 'lucide-react';
import { Logo } from './Logo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'video'>('overview');

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

  // Specific Vimeo Video URL
  const currentVideo = "https://player.vimeo.com/video/1147276431?title=0&byline=0&portrait=0";

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
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
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

            {/* Tabs Navigation */}
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-white text-red-600 shadow-md' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <LayoutGrid size={16} /> Resumen
              </button>
              <button 
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'video' 
                    ? 'bg-white text-red-600 shadow-md' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <PlayCircle size={16} /> Vista rápida
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 dark:bg-slate-950/50">
          
          {activeTab === 'overview' ? (
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
          ) : (
            <div className="flex flex-col h-full animate-fade-in space-y-6">
              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black border-4 border-white dark:border-slate-800 relative group">
                <iframe 
                  className="w-full h-full" 
                  src={currentVideo}
                  title="Hub Video Guide" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                   <div>
                     <h4 className="font-bold text-gray-900 dark:text-white text-sm">Inicio de Sesión</h4>
                     <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Usa tu PIN personal para acceder según tu rol (Admin o Personal).</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                   <div>
                     <h4 className="font-bold text-gray-900 dark:text-white text-sm">Realizar Pedidos</h4>
                     <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Selecciona departamento, añade productos al carrito y finaliza para notificar.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                   <div>
                     <h4 className="font-bold text-gray-900 dark:text-white text-sm">Gestión de Tareas</h4>
                     <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Sigue las prioridades (Rojo = Urgente). Sube fotos y completa tareas.</p>
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hub v1.0 • Sistema Operativo</p>
        </div>
      </div>
    </div>
  );
};