import React, { useRef, useState } from 'react';
import { Logo } from '../components/Logo';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Layout, 
  Package, 
  ClipboardCheck, 
  Bell, 
  Users, 
  Shield, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const slides = [
  {
    title: "Hub: Ecosistema Operativo",
    subtitle: "Presentación y Formación de Usuario",
    content: "Hub es una plataforma centralizada diseñada para elevar la eficiencia operativa, garantizando visibilidad en tiempo real y trazabilidad absoluta en cada proceso logístico y de gestión.",
    icon: Layout,
    color: "bg-red-600",
    points: [
      "Plataforma única para múltiples departamentos",
      "Interfaz optimizada para escritorio y móvil",
      "Seguridad basada en PIN y roles de usuario",
      "Sincronización en tiempo real con la nube"
    ]
  },
  {
    title: "Gestión de Inventario",
    subtitle: "Control de Existencias y Umbrales",
    content: "El módulo de inventario permite un control exhaustivo de los productos, permitiendo a los administradores gestionar el stock de manera proactiva.",
    icon: Package,
    color: "bg-blue-600",
    points: [
      "Visualización de stock por categorías y departamentos",
      "Alertas automáticas de stock bajo (Umbrales)",
      "Historial de movimientos y trazabilidad",
      "Edición rápida de cantidades y metadatos"
    ]
  },
  {
    title: "Pedidos y Reabastecimiento",
    subtitle: "Flujo de Solicitudes Internas",
    content: "Optimiza la comunicación entre departamentos mediante un sistema de pedidos digitales que elimina el papel y reduce errores.",
    icon: ClipboardCheck,
    color: "bg-amber-600",
    points: [
      "Creación de carritos de pedido por departamento",
      "Generación automática de albaranes en PDF",
      "Validación de entrega mediante firmas digitales",
      "Notificaciones instantáneas de nuevos pedidos"
    ]
  },
  {
    title: "Gestión de Tareas (Tasks)",
    subtitle: "Protocolos y Tareas Diarias",
    content: "Asegura el cumplimiento de los estándares operativos mediante un sistema de tareas dinámico con recurrencia y evidencia.",
    icon: CheckCircle2,
    color: "bg-emerald-600",
    points: [
      "Tareas con listas de verificación (Checklists)",
      "Recurrencia diaria con reinicio automático",
      "Evidencia fotográfica y comentarios en tiempo real",
      "Detección automática de turnos (Mañana/Tarde)"
    ]
  },
  {
    title: "Alertas y Notificaciones",
    subtitle: "Comunicación Crítica",
    content: "Mantente informado de lo que importa. El sistema de notificaciones garantiza que las acciones urgentes sean atendidas de inmediato.",
    icon: Bell,
    color: "bg-purple-600",
    points: [
      "Alertas sonoras para nuevos pedidos y tareas",
      "Notificaciones horarias de tareas diarias pendientes",
      "Registro de turnos incumplidos por el sistema",
      "Toasts interactivos para navegación rápida"
    ]
  },
  {
    title: "Administración y Seguridad",
    subtitle: "Control de Acceso y Reportes",
    content: "Herramientas avanzadas para la gestión de usuarios, departamentos y análisis de datos operativos.",
    icon: Shield,
    color: "bg-slate-900",
    points: [
      "Gestión de usuarios y asignación de PIN",
      "Configuración de departamentos dinámicos",
      "Reportes de actividad y analítica de consumo",
      "Limpieza automática de datos antiguos"
    ]
  }
];

export const Training: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const exportToPDF = async () => {
    if (!presentationRef.current) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        // Wait for animation to finish and state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(presentationRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#f8fafc'
        });
        
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      }

      pdf.save('Hub_Presentacion_Formacion.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const current = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060812] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">
            Hub <span className="text-red-600">Training</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
              Slide {currentSlide + 1} / {slides.length}
            </span>
          </div>
          
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {isExporting ? 'Exportando...' : <><Download size={14} /> Descargar PDF</>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center p-4 sm:p-12 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div 
          ref={presentationRef}
          className="w-full max-w-5xl aspect-video bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col sm:flex-row relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row w-full h-full"
            >
              {/* Left Side: Visual/Icon */}
              <div className={`w-full sm:w-2/5 ${current.color} p-12 flex flex-col justify-between text-white relative overflow-hidden`}>
                <div className="absolute -top-10 -left-10 opacity-10 rotate-12 scale-[3] pointer-events-none">
                  <current.icon size={200} />
                </div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8">
                    <current.icon size={32} />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">
                    {current.title.split(':').map((part, i) => (
                      <span key={i} className={i === 1 ? 'block text-white/60 text-2xl mt-2' : ''}>{part}</span>
                    ))}
                  </h2>
                </div>

                <div className="relative z-10">
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">
                    Hub Operational Intelligence
                  </p>
                </div>
              </div>

              {/* Right Side: Content */}
              <div className="w-full sm:w-3/5 p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
                <div className="mb-8">
                  <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.4em] mb-2">{current.subtitle}</h3>
                  <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {current.content}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {current.points.map((point, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (idx * 0.1) }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="mt-1">
                        <CheckCircle2 size={18} className="text-red-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation Controls */}
      <footer className="h-24 flex items-center justify-center gap-8 shrink-0 relative z-20">
        <button
          onClick={prevSlide}
          className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-red-600 hover:text-white transition-all active:scale-90 border border-slate-100 dark:border-slate-700"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentSlide === idx ? 'w-8 bg-red-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-red-600 hover:text-white transition-all active:scale-90 border border-slate-100 dark:border-slate-700"
        >
          <ChevronRight size={24} />
        </button>
      </footer>
    </div>
  );
};

export default Training;
