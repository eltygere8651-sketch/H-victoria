import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateSlideExplanation, generateSpeech } from '../services/geminiService';

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
    ],
    speech: "Bienvenido a Hub, su ecosistema operativo centralizado. Esta plataforma ha sido diseñada para elevar la eficiencia de cada departamento, garantizando visibilidad total en tiempo real y una trazabilidad absoluta en todos sus procesos logísticos."
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
    ],
    speech: "El módulo de inventario es el corazón del control de existencias. Aquí podrá gestionar productos por categorías, configurar alertas automáticas de stock bajo y revisar el historial completo de movimientos para una gestión proactiva."
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
    ],
    speech: "Digitalizamos el flujo de pedidos internos. Olvide el papel: cree carritos de pedido, genere albaranes automáticos y valide entregas con firmas digitales, todo con notificaciones instantáneas para los departamentos implicados."
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
    ],
    speech: "La gestión de tareas asegura que sus protocolos se cumplan rigurosamente. Con listas de verificación dinámicas, recurrencia diaria y detección automática de turnos, el equipo siempre sabrá qué hacer y cuándo hacerlo."
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
    ],
    speech: "Nuestro sistema de alertas le mantiene siempre informado. Desde notificaciones sonoras para nuevos pedidos hasta recordatorios horarias de tareas pendientes, garantizamos que nada importante pase desapercibido."
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
    ],
    speech: "Finalmente, el panel de administración le otorga el control total. Gestione usuarios mediante PIN, configure departamentos y acceda a reportes detallados para tomar decisiones basadas en datos reales."
  },
  {
    title: "Liderando el Futuro de la Hospitalidad",
    subtitle: "Excelencia, Innovación y Resultados",
    content: "Hub no es solo una plataforma; es el catalizador de una nueva era operativa. Juntos, transformamos la complejidad en precisión y el esfuerzo en resultados excepcionales.",
    icon: Sparkles,
    color: "bg-slate-950",
    points: [
      "Cultura de alto rendimiento y precisión",
      "Decisiones estratégicas basadas en datos",
      "Soporte técnico y mejora continua",
      "Compromiso absoluto con el huésped"
    ],
    speech: "Hemos concluido este recorrido estratégico. Hub representa nuestro compromiso con la vanguardia tecnológica y la excelencia en el servicio. Esta herramienta ha sido diseñada para empoderarles, eliminando la fricción operativa y permitiéndoles brillar en lo que mejor saben hacer: crear experiencias memorables para nuestros huéspedes. Agradecemos profundamente su asistencia y su disposición para adoptar este nuevo estándar. Recuerden que el soporte técnico está siempre a su disposición para cualquier consulta. ¡Muchas gracias y éxito en esta nueva etapa operativa!"
  }
];

export const Training: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [useSmartAI, setUseSmartAI] = useState(true);
  
  const [showOverlay, setShowOverlay] = useState(false);
  
  const presentationRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // Show overlay when slide changes
  useEffect(() => {
    setShowOverlay(true);
    const timer = setTimeout(() => setShowOverlay(false), 3000); // Increased to 3s
    return () => clearTimeout(timer);
  }, [currentSlide]);

  // Speech Logic
  const stopSpeech = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const playSpeech = useCallback(async () => {
    stopSpeech();
    
    const slide = slides[currentSlide];
    let textToRead = "";

    setIsGeneratingAI(true);
    
    if (useSmartAI) {
      if (aiExplanations[currentSlide]) {
        textToRead = aiExplanations[currentSlide];
      } else {
        const aiText = await generateSlideExplanation(
          slide.title,
          slide.subtitle,
          slide.content,
          slide.points
        );
        if (aiText) {
          setAiExplanations(prev => ({ ...prev, [currentSlide]: aiText }));
          textToRead = aiText;
        }
      }
    }

    if (!textToRead) {
      textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
    }

    const base64Audio = await generateSpeech(textToRead);
    setIsGeneratingAI(false);

    if (!base64Audio) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini TTS returns 24kHz PCM (16-bit)
      const audioData = new Int16Array(bytes.buffer);
      const floatData = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        floatData[i] = audioData[i] / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      source.start();
      setIsSpeaking(true);
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsSpeaking(false);
    }
  }, [currentSlide, stopSpeech, useSmartAI, aiExplanations]);

  const toggleSpeech = () => {
    if (isSpeaking) stopSpeech();
    else playSpeech();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
        e.preventDefault();
        toggleSpeech();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpeaking, currentSlide, toggleSpeech]);

  // Stop speech when slide changes
  useEffect(() => {
    stopSpeech();
  }, [currentSlide, stopSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSpeech();
  }, [stopSpeech]);

  const exportToPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    stopSpeech();

    try {
      // Create PDF in landscape A4
      const pdf = new jsPDF('l', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      const exportContainer = exportRef.current;
      const slideElements = exportContainer.querySelectorAll('.slide-to-export');

      for (let i = 0; i < slideElements.length; i++) {
        const slide = slideElements[i] as HTMLElement;
        
        // Ensure slide is visible for capture
        slide.style.display = 'flex';
        
        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 1280, // Force a desktop-like width for the capture
          height: 720
        });
        
        // Hide it back
        slide.style.display = 'none';

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      }

      pdf.save('Hub_Formacion_Profesional.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const current = slides[currentSlide];

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#060812] flex flex-col font-sans overflow-hidden">
      {/* Hidden Export Container - Ensures PDF is always high quality and desktop-layout */}
      <div ref={exportRef} className="fixed top-[-9999px] left-[-9999px] w-[1280px]">
        {slides.map((slide, idx) => (
          <div 
            key={idx} 
            className="slide-to-export w-[1280px] h-[720px] flex bg-white text-slate-900 overflow-hidden"
            style={{ display: 'none' }}
          >
            <div className={`w-2/5 ${slide.color} p-16 flex flex-col justify-between text-white relative`}>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-10">
                  <slide.icon size={40} />
                </div>
                <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-6 whitespace-pre-line">
                  {slide.title.replace(':', '\n')}
                </h2>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-white/60">Hub Ecosystem</p>
            </div>
            <div className="w-3/5 p-16 flex flex-col justify-center bg-white">
              <div className="mb-10">
                <h3 className="text-sm font-black text-red-600 uppercase tracking-[0.4em] mb-3">{slide.subtitle}</h3>
                <p className="text-2xl text-slate-600 font-medium leading-relaxed">{slide.content}</p>
              </div>
              <div className="space-y-4">
                {slide.points.map((p, pi) => (
                  <div key={pi} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 size={24} className="text-red-600 shrink-0" />
                    <p className="text-lg font-bold text-slate-800">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo size="sm" />
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">
            Hub <span className="text-red-600">Training</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
          
          {/* Smart AI Toggle */}
          <button
            onClick={() => setUseSmartAI(!useSmartAI)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              useSmartAI 
                ? 'bg-red-600/10 text-red-600 border border-red-600/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-transparent'
            }`}
          >
            <Sparkles size={12} className={useSmartAI ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">IA Inteligente</span>
          </button>
          
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {isExporting ? '...' : <><Download size={14} className="hidden sm:block" /> PDF</>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Navigation Controls - Subtle Glass Overlay */}
        <div className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
          <div className="flex flex-col bg-white/5 dark:bg-slate-800/5 backdrop-blur-sm rounded-2xl p-1 border border-white/10 dark:border-slate-700/10 hover:bg-white/10 dark:hover:bg-slate-800/10 transition-all group">
            <button
              onClick={prevSlide}
              className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors active:scale-90"
              title="Anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="h-px bg-white/10 dark:bg-slate-700/10 mx-2" />
            
            {/* Voice Control Button */}
            <button
              onClick={toggleSpeech}
              disabled={isGeneratingAI}
              className={`w-12 h-12 flex items-center justify-center transition-all active:scale-90 ${
                isSpeaking ? 'text-red-600 animate-pulse' : 
                isGeneratingAI ? 'text-slate-300' : 'text-slate-400 hover:text-red-600'
              }`}
              title={isSpeaking ? "Detener voz" : isGeneratingAI ? "Generando explicación IA..." : "Escuchar formación"}
            >
              {isGeneratingAI ? <Loader2 size={24} className="animate-spin" /> : 
               isSpeaking ? <Volume2 size={24} /> : <Play size={24} />}
            </button>

            <div className="h-px bg-white/10 dark:bg-slate-700/10 mx-2" />
            <button
              onClick={nextSlide}
              className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors active:scale-90"
              title="Siguiente"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div 
          ref={presentationRef}
          className="w-full max-w-5xl h-full max-h-[80vh] aspect-video bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col sm:row relative z-10"
        >
          {/* Slide Number Popup - Medium Size, Centered Vertically on the Left */}
          <AnimatePresence>
            {showOverlay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1, x: 30 }}
                transition={{ type: "spring", damping: 18, stiffness: 250 }}
                className="absolute top-1/2 -translate-y-1/2 left-8 sm:left-12 z-50 pointer-events-none"
              >
                <div className="bg-black/30 backdrop-blur-2xl border border-white/20 px-6 py-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                  <p className="flex flex-col items-center leading-none">
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2">Slide</span>
                    <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      {currentSlide === slides.length - 1 ? 'FINAL' : (currentSlide + 1).toString().padStart(2, '0')}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row w-full h-full"
            >
              {/* Left Side: Visual/Icon */}
              <div className={`w-full sm:w-2/5 ${current.color} p-6 sm:p-12 flex flex-col justify-between text-white relative overflow-hidden shrink-0`}>
                <div className="absolute -top-10 -left-10 opacity-10 rotate-12 scale-[2] sm:scale-[3] pointer-events-none">
                  <current.icon size={200} />
                </div>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 sm:w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-8">
                    <current.icon size={24} className="sm:w-8 sm:h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none mb-2 sm:mb-4">
                    {current.title.split(':').map((part, i) => (
                      <span key={i} className={i === 1 ? 'block text-white/60 text-lg sm:text-2xl mt-1 sm:mt-2' : ''}>{part}</span>
                    ))}
                  </h2>
                </div>

                <div className="relative z-10 hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
                    Hub Ecosystem
                  </p>
                </div>
              </div>

              {/* Right Side: Content */}
              <div className="w-full sm:w-3/5 p-6 sm:p-12 flex flex-col justify-center bg-white dark:bg-slate-900 overflow-y-auto">
                <div className="mb-4 sm:mb-8">
                  <h3 className="text-[10px] sm:text-xs font-black text-red-600 uppercase tracking-[0.4em] mb-1 sm:mb-2">{current.subtitle}</h3>
                  <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {current.content}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:gap-4">
                  {current.points.map((point, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="mt-0.5 shrink-0">
                        <CheckCircle2 size={16} className="text-red-600 sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation Controls - Progress Removed as requested */}
      <footer className="h-6 sm:h-8 flex items-center justify-center shrink-0 relative z-20 px-4">
        {/* Progress dots removed */}
      </footer>
    </div>
  );
};

export default Training;
