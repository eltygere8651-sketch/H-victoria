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
  Loader2,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateSlideExplanation } from '../services/geminiService';
import { User, CartItem } from '../types';
import { useSpeech } from '../context/SpeechContext';

const staffSlides = [
  {
    title: "Hub: Tu herramienta diaria",
    subtitle: "Cómo usar la aplicación",
    content: "Hub es la aplicación que usaremos para que todo en el hotel funcione de forma sencilla. Olvida las libretas: aquí tienes tus tareas, tus pedidos y el inventario en un solo lugar.",
    icon: Layout,
    color: "bg-blue-600",
    points: [
      "Úsala en tu móvil o en la tablet",
      "Entra con tu PIN personal",
      "Todo se guarda automáticamente",
      "Di adiós al papel y a los líos"
    ],
    speech: "Bienvenido a Hub. A partir de ahora, olvida las notas en papel. Esta es la herramienta donde vas a encontrar todo lo que necesitas para tu turno: desde tus tareas hasta lo que tienes que pedir. Es muy fácil de usar y la llevas siempre contigo."
  },
  {
    title: "Saber qué hay",
    subtitle: "Mira el Almacén",
    content: "Mira qué productos quedan en cada estante. Si algo se está acabando, el sistema te avisará en rojo para que nunca te quedes sin nada importante.",
    icon: Package,
    color: "bg-slate-800",
    points: [
      "Busca productos por su nombre",
      "Mira cuántas unidades quedan",
      "Aviso rojo cuando queda poco",
      "Cambia las cantidades tú mismo"
    ],
    speech: "¿Quieres saber si queda algún producto? Solo búscalo en la lista. Verás la cantidad exacta y, si ves algo en rojo, es que hay que pedirlo pronto. Así de simple: lo que ves es lo que hay."
  },
  {
    title: "Pedir lo que falta",
    subtitle: "Haz pedidos en segundos",
    content: "Hacer un pedido es como comprar por internet. Eliges lo que necesitas, pones cuánto quieres y lo envías. Sin llamadas y sin errores.",
    icon: ClipboardCheck,
    color: "bg-amber-600",
    points: [
      "Añade productos al carrito",
      "Confirma al recibir el pedido",
      "Todo queda registrado solo",
      "Sin papeles que se pierdan"
    ],
    speech: "Si necesitas algo, búscalo, añádelo al carrito y dale a enviar. Ya no tienes que buscar hojas ni escribir correos. Cuando llegue el pedido, lo confirmas en la pantalla y ya está. Todo queda guardado."
  },
  {
    title: "Tus tareas de hoy",
    subtitle: "Qué tienes que hacer",
    content: "Aquí verás tu lista de cosas por hacer. Cuando termines una, la marcas y le haces una foto. Así no se te olvidará nada importante.",
    icon: CheckCircle2,
    color: "bg-emerald-600",
    points: [
      "Lista con tus tareas del día",
      "Haz fotos para enseñar el resultado",
      "Se reinicia solo cada día",
      "Diferencia mañana y tarde"
    ],
    speech: "En la sección de tareas tienes tu hoja de ruta. Marca lo que vayas terminando y, en las tareas importantes, haz una foto para que todos vean el buen trabajo que has hecho. Así trabajarás con la tranquilidad de que todo está bajo control."
  }
];

const adminSlides = [
  {
    title: "Panel de Control Admin",
    subtitle: "Visibilidad Total",
    content: "Como administrador, tienes una visión global de todo el hotel. Desde aquí controlas el inventario real y los pedidos activos.",
    icon: Shield,
    color: "bg-slate-900",
    points: [
      "Gestión de usuarios y permisos",
      "Control de stock a tiempo real",
      "Histórico de pedidos y entregas",
      "Configuración de alertas críticas"
    ],
    speech: "Bienvenido al panel de administración. Aquí tienes el control total del ecosistema Hub. Puedes gestionar quién accede, ver qué está pasando en el almacén en este preciso instante y revisar todo el historial de movimientos. Es tu centro de mando."
  },
  {
    title: "Gestión de Pedidos",
    subtitle: "Validación y Proveedores",
    content: "Supervisa las solicitudes del equipo y valida las recepciones. Mantén un flujo constante de suministros sin cuellos de botella.",
    icon: Smartphone,
    color: "bg-red-700",
    points: [
      "Validación de albaranes digitales",
      "Recepción de pedidos por proveedor",
      "Ajustes de inventario manuales",
      "Exportación de informes PDF"
    ],
    speech: "Gestionar los suministros nunca ha sido tan eficiente. Revisa las peticiones de tu equipo, valida las entradas de mercancía y genera informes en PDF para contabilidad en un solo clic. Todo digital, todo trazable."
  },
  {
    title: "Protocolos y Tareas",
    subtitle: "Garantía de Calidad",
    content: "Define los estándares de excelencia del hotel. Crea tareas diarias para asegurar que cada rincón cumple con los protocolos.",
    icon: ClipboardCheck,
    color: "bg-blue-900",
    points: [
      "Creación de flujos de trabajo",
      "Auditoría visual por fotos",
      "Registro de incidencias",
      "Análisis de cumplimiento"
    ],
    speech: "Asegura la excelencia operativa creando protocolos claros. Podrás auditar el trabajo del equipo mediante las fotos que suben y detectar incidencias antes de que se conviertan en problemas. Hub te da la visibilidad que necesitas para dirigir con precisión."
  }
];

interface TrainingProps {
  onBack?: () => void;
  currentUser: User;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showMobileCart: boolean;
  setShowMobileCart: (show: boolean) => void;
  notificationVolume?: number;
  soundType?: string;
}

export const Training: React.FC<TrainingProps> = ({ 
  onBack, 
  currentUser, 
  cart, 
  setCart, 
  showMobileCart, 
  setShowMobileCart,
  notificationVolume = 0.3,
  soundType = 'Default'
}) => {
  const { playSpeech: globalPlaySpeech, stopSpeech: globalStopSpeech, isSpeaking: globalIsSpeaking } = useSpeech();
  
  // Choose slides based on role
  const isStaff = currentUser.role !== 'ADMIN';
  const slides = isStaff ? staffSlides : adminSlides;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [useSmartAI, setUseSmartAI] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  
  const [showOverlay, setShowOverlay] = useState(false);
  
  const presentationRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const autoPlayNextRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => setCurrentSlide((prev) => (prev + 1) % slides.length), []);
  const prevSlide = useCallback(() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length), []);

  // Show overlay when slide changes
  useEffect(() => {
    setShowOverlay(true);
    const timer = setTimeout(() => setShowOverlay(false), 3000); 
    return () => clearTimeout(timer);
  }, [currentSlide]);

  // Speech Logic
  const stopSpeech = useCallback(() => {
    globalStopSpeech();
    setIsAutoPlaying(false);
    if (autoPlayNextRef.current) clearTimeout(autoPlayNextRef.current);
  }, [globalStopSpeech]);

  const playSpeech = useCallback(async (isAuto = false) => {
    if (isAuto) setIsAutoPlaying(true);
    
    const slide = slides[currentSlide];
    let textToRead = "";

    if (useSmartAI) {
      if (aiExplanations[currentSlide]) {
        textToRead = aiExplanations[currentSlide];
      } else {
        setIsGeneratingAI(true);
        const aiText = await generateSlideExplanation(slide.title, slide.subtitle, slide.content, slide.points);
        setIsGeneratingAI(false);
        if (aiText) {
          setAiExplanations(prev => ({ ...prev, [currentSlide]: aiText }));
          textToRead = aiText;
        } else {
          textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
        }
      }
    } else {
      textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
    }

    if (!textToRead) return;

    globalPlaySpeech(textToRead, slide.title, slide.subtitle, () => {
      if (isAutoPlaying || isAuto) {
        if (currentSlide < slides.length - 1) {
          autoPlayNextRef.current = setTimeout(() => {
            nextSlide();
          }, 1500);
        } else {
          setIsAutoPlaying(false);
        }
      }
    }, notificationVolume);
  }, [currentSlide, globalPlaySpeech, useSmartAI, aiExplanations, isAutoPlaying, nextSlide]);

  const toggleSpeech = () => {
    if (globalIsSpeaking) {
      stopSpeech();
    } else {
      playSpeech(false);
    }
  };

  const startAutoPlay = () => {
    setCurrentSlide(0);
    setTimeout(() => playSpeech(true), 100);
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
  }, [globalIsSpeaking, currentSlide, toggleSpeech]);

  // Auto-play effect
  useEffect(() => {
    if (isAutoPlaying && !globalIsSpeaking) {
      playSpeech(true);
    }
  }, [currentSlide, isAutoPlaying, globalIsSpeaking, playSpeech]);

  // Manual navigation that doesn't kill speech if the user is in "Presentation Mode"
  useEffect(() => {
    // We only stop speech if we are NOT in auto-playing mode AND we are moving TO a slide 
    // that the user has NOT heard yet or if they explicitly choose to stop.
    // However, the user request is to NOT cut the voice.
    // So we'll let the current speech finish even if they change slides manually.
  }, [currentSlide]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoPlayNextRef.current) clearTimeout(autoPlayNextRef.current);
    };
  }, []);

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
          
          {/* PDF Export Button */}
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
                globalIsSpeaking ? 'text-red-600 animate-pulse' : 
                isGeneratingAI ? 'text-slate-300' : 'text-slate-400 hover:text-red-600'
              }`}
              title={globalIsSpeaking ? "Detener voz" : isGeneratingAI ? "Generando explicación IA..." : "Escuchar formación"}
            >
              {isGeneratingAI ? <Loader2 size={24} className="animate-spin" /> : 
               globalIsSpeaking ? <Volume2 size={24} /> : <Play size={24} />}
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
          className="w-full max-w-5xl h-full max-h-[80vh] aspect-video bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col sm:row relative z-10"
        >
          {/* Play All Trigger Layer */}
          {!globalIsSpeaking && !isAutoPlaying && currentSlide === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 text-center"
            >
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white/20 max-w-sm">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-600/30 animate-bounce">
                   <Play size={40} className="text-white ml-2" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">
                  Masterclass Hub: {isStaff ? 'Personal' : 'Administrador'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                  Pulsa el botón para iniciar la formación {isStaff ? 'operativa' : 'de gestión'} asistida por voz. Aprenderás todo en pocos minutos.
                </p>
                <button 
                  onClick={startAutoPlay}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                  Empezar Formación
                </button>
              </div>
            </motion.div>
          )}

          {/* Slide Number Popup */}
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

      {/* Footer & Progress dots removed */}
      <footer className="h-6 sm:h-8 flex items-center justify-center shrink-0 relative z-20 px-4">
        {/* Progress dots removed */}
      </footer>
    </div>
  );
};

export default Training;
