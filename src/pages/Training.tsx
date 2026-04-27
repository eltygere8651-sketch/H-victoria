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
  User2,
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
    title: "Bienvenido a Hub",
    subtitle: "Tu Ecosistema Digital",
    content: "Hub no es solo una aplicación, es la columna vertebral tecnológica de este establecimiento. Diseñado para optimizar toda la operativa, desde la trazabilidad de stock hasta el cumplimiento de protocolos, eliminando la burocracia física y mitigando errores operativos.",
    icon: Sparkles,
    color: "bg-red-600",
    points: [
      "Digitalización integral de la operativa",
      "Sincronización estratégica de equipos",
      "Optimización de recursos y procesos",
      "Escalabilidad funcional constante"
    ],
    speech: "Bienvenido a Hub. Te encuentras ante la nueva infraestructura digital de este establecimiento. Hub nace con el objetivo de profesionalizar y simplificar tu operativa diaria, suprimiendo las barreras del papel y centralizando la gestión de inventarios y tareas estratégicas. Es fundamental comprender que este es un ecosistema en constante evolución tecnológica, diseñado para integrar capacidades inteligentes que transformarán tu entorno de trabajo en una experiencia más eficiente y productiva."
  },
  {
    title: "Hub: Tu Identidad Digital",
    subtitle: "Acceso Seguro y Personal",
    content: "Como personal operativo, tu acceso está optimizado para tu trabajo real. Entra con tu PIN personal y accede solo a las herramientas que necesitas: tus tareas y tus pedidos de stock.",
    icon: Shield,
    color: "bg-blue-600",
    points: [
      "ID único vinculado a tu PIN",
      "Interfaz simplificada sin distracciones",
      "Privacidad de tus acciones y fotos",
      "Acceso directo a Tareas y Pedidos"
    ],
    speech: "Bienvenido a Hub. Tu perfil es único y está vinculado a tu PIN personal. Al entrar, verás una interfaz diseñada específicamente para tu trabajo: sin botones innecesarios, solo tus tareas y tus pedidos de stock. Todo lo que hagas queda registrado a tu nombre para mayor claridad."
  },
  {
    title: "Almacén Inteligente",
    subtitle: "Stock y Departamentos",
    content: "Encuentra lo que buscas al instante. El inventario está organizado por departamentos (Bar, Restaurante) para que la búsqueda sea ultra rápida.",
    icon: Package,
    color: "bg-slate-800",
    points: [
      "Productos filtrados por departamento",
      "Indicadores de stock en tiempo real",
      "Aviso visual por colores (Rojo = Crítico)",
      "Buscador predictivo por nombre"
    ],
    speech: "¿Necesitas algo del almacén? Ahora es más fácil que nunca. Los productos están agrupados por departamentos: Bar o Restaurante. Si ves un producto en rojo, es que queda muy poco. Usa el buscador para encontrar cualquier artículo en milisegundos."
  },
  {
    title: "Pedidos en la Nube",
    subtitle: "Draft Sync y Validación",
    content: "¡No pierdas ni un segundo! Puedes empezar tu pedido en el móvil mientras recorres el almacén y terminarlo después en la tablet. El carrito se guarda solo en la nube.",
    icon: Smartphone,
    color: "bg-amber-600",
    points: [
      "Sincronización de carrito entre dispositivos",
      "Envío directo a validación admin",
      "Notificación instantánea de pedidos",
      "Histórico de tus albaranes"
    ],
    speech: "Una de las mejores funciones es la sincronización del carrito. Puedes ir anotando lo que falta en tu móvil y, luego, abrir Hub en la tablet para revisarlo y enviarlo. Una vez enviado, el administrador recibirá el aviso para validar el pedido y la factura digital."
  },
  {
    title: "Protocolos Auditables",
    subtitle: "Tareas con Foto y Video",
    content: "Tu trabajo diario es la base del éxito. Completa tus tareas asignadas y sube fotos o videos para demostrar que el estándar de calidad se ha cumplido perfectamente.",
    icon: ClipboardCheck,
    color: "bg-emerald-600",
    points: [
      "Tareas asignadas por turno (M/T/N)",
      "Subida de fotos y videos de evidencia",
      "Checklists inteligentes paso a paso",
      "Alertas si algo queda pendiente"
    ],
    speech: "En la sección de tareas tienes tu hoja de ruta. Al terminar cada punto, márcalo y sube una foto o video si el protocolo lo requiere. Recuerda que si una tarea diaria queda pendiente al final de tu turno, el sistema generará una alerta para el siguiente compañero. ¡Tu rigor es clave!"
  }
];

const adminSlides = [
  {
    title: "Centro de Mando",
    subtitle: "Visibilidad y Permisos",
    content: "Como Administrador, asumes el control estratégico del sistema. Gestiona identidades, define niveles de acceso y supervisa el rendimiento global del establecimiento desde una interfaz de inteligencia centralizada.",
    icon: Shield,
    color: "bg-slate-900",
    points: [
      "Administración jerárquica de usuarios",
      "Supervisión operativa en tiempo real",
      "Auditoría de actividad global",
      "Configuración de alertas de stock"
    ],
    speech: "Bienvenido a tu centro de mando estratégico. Aquí dispones de la autoridad absoluta sobre el ecosistema: desde la gestión de capital humano y su despliegue operativo, hasta la monitorización analítica de cada proceso del establecimiento. Tu visión integral garantiza una ejecución impecable y la previsión ante cualquier contingencia."
  },
  {
    title: "Gestión de Facturas",
    subtitle: "Validación de Suministros",
    content: "Recibe los pedidos de tu equipo, comprueba la mercancía y valida las facturas digitales. Mantén la contabilidad al día sin errores manuales.",
    icon: Layout,
    color: "bg-red-700",
    points: [
      "Validación de albaranes del personal",
      "Control de entradas de proveedores",
      "Verificación de costes y cantidades",
      "Exportación de reportes PDF mensuales"
    ],
    speech: "La gestión financiera es ahora digital. Cuando el equipo envía un pedido, tú lo recibes para validarlo. Puedes comparar lo solicitado con lo recibido, adjuntar la factura digital y tener un control exacto de tus costes operativos en todo momento."
  },
  {
    title: "Optimización Operativa",
    subtitle: "Análisis de Rendimiento",
    content: "Usa la inteligencia de Hub para mejorar. Revisa las fotos de los protocolos, analiza las alertas de sistema y ajusta los flujos de trabajo.",
    icon: Bell,
    color: "bg-blue-900",
    points: [
      "Auditoría visual de tareas (Fotos/Videos)",
      "Gestión de alertas por tareas fallidas",
      "Mantenimiento preventivo de stock",
      "Histórico de incidencias y soluciones"
    ],
    speech: "Aprovecha los datos para mejorar cada día. Revisa las evidencias visuales que sube el equipo para asegurar la calidad. El sistema te avisará si algo no se ha cumplido, permitiéndote tomar decisiones rápidas basadas en evidencias reales, no en suposiciones."
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
  
  // Persistence logic - initialize from localStorage
  const [trainingMode, setTrainingMode] = useState<'SELECT' | 'STAFF' | 'ADMIN'>(() => {
    const saved = localStorage.getItem('hub_training_mode');
    return (saved === 'STAFF' || saved === 'ADMIN') ? saved : 'SELECT';
  });
  
  // Choose slides based on selection
  const slides = trainingMode === 'ADMIN' ? adminSlides : staffSlides;

  const [currentSlide, setCurrentSlide] = useState(() => {
    const saved = localStorage.getItem('hub_training_slide');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return (parsed >= 0 && parsed < (trainingMode === 'ADMIN' ? adminSlides.length : staffSlides.length)) ? parsed : 0;
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [useSmartAI, setUseSmartAI] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(() => {
    return localStorage.getItem('hub_training_autoplay') === 'true';
  });
  
  const [showOverlay, setShowOverlay] = useState(false);
  
  const presentationRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const autoPlayNextRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence Effects
  useEffect(() => {
    if (trainingMode !== 'SELECT') {
      localStorage.setItem('hub_training_mode', trainingMode);
    }
  }, [trainingMode]);

  useEffect(() => {
    localStorage.setItem('hub_training_slide', currentSlide.toString());
  }, [currentSlide]);

  useEffect(() => {
    localStorage.setItem('hub_training_autoplay', isAutoPlaying.toString());
  }, [isAutoPlaying]);

  // Autoresume on mount if in a session
  useEffect(() => {
    if (trainingMode !== 'SELECT' && isAutoPlaying && !globalIsSpeaking) {
      // Small delay to ensure voices are loaded and state is ready
      const timer = setTimeout(() => {
        playSpeech(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const nextSlide = useCallback(() => {
    if (trainingMode === 'SELECT') return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [trainingMode, slides.length]);

  const prevSlide = useCallback(() => {
    if (trainingMode === 'SELECT') return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [trainingMode, slides.length]);

  // Reset session ONLY when manually returning to SELECT or starting over
  const resetSession = () => {
    setTrainingMode('SELECT');
    setCurrentSlide(0);
    setAiExplanations({});
    globalStopSpeech();
    setIsAutoPlaying(false);
    localStorage.removeItem('hub_training_mode');
    localStorage.removeItem('hub_training_slide');
    localStorage.removeItem('hub_training_autoplay');
  };

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

  const activeSpeechRequestRef = useRef<number>(0);

  const playSpeech = useCallback(async (isAuto = false) => {
    const requestId = ++activeSpeechRequestRef.current;
    if (isAuto) setIsAutoPlaying(true);
    
    const slide = slides[currentSlide];
    let textToRead = "";

    if (useSmartAI) {
      if (aiExplanations[currentSlide]) {
        textToRead = aiExplanations[currentSlide];
      } else {
        setIsGeneratingAI(true);
        try {
          const aiText = await generateSlideExplanation(slide.title, slide.subtitle, slide.content, slide.points);
          // If a new request has started while we were waiting, discard this one
          if (requestId !== activeSpeechRequestRef.current) return;
          
          setIsGeneratingAI(false);
          if (aiText) {
            setAiExplanations(prev => ({ ...prev, [currentSlide]: aiText }));
            textToRead = aiText;
          } else {
            textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
          }
        } catch (error) {
          if (requestId !== activeSpeechRequestRef.current) return;
          setIsGeneratingAI(false);
          textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
        }
      }
    } else {
      textToRead = `${slide.title}. ${slide.subtitle}. ${slide.speech}`;
    }

    if (!textToRead || requestId !== activeSpeechRequestRef.current) return;

    globalPlaySpeech(textToRead, slide.title, slide.subtitle, () => {
      if (requestId !== activeSpeechRequestRef.current) return;
      
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
  }, [currentSlide, globalPlaySpeech, useSmartAI, aiExplanations, isAutoPlaying, nextSlide, slides, notificationVolume]);

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
      {/* Hidden Export Container */}
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
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                x: [-20, 20, -20],
                y: [-20, 20, -20]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full blur-[120px]"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
                x: [20, -20, 20],
                y: [20, -20, 20]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"
            />
        </div>

        {trainingMode === 'SELECT' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 z-10 px-4"
          >
            <div className="md:col-span-2 text-center mb-4 sm:mb-8">
              <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs mb-3 block">Formación Profesional</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">¿Qué quieres aprender hoy?</h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">Selecciona tu perfil para recibir una formación personalizada con voz e inteligencia artificial.</p>
            </div>

            <button 
              onClick={() => {
                setTrainingMode('STAFF');
                setIsAutoPlaying(true);
                setCurrentSlide(0);
              }}
              className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 border-2 border-transparent hover:border-red-600 transition-all text-left shadow-xl hover:shadow-red-600/10 active:scale-95"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                <Users size={32} className="text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Personal Operativo</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Aprende a gestionar el inventario, realizar pedidos rápidos y completar tus tareas diarias con éxito.</p>
              <div className="mt-8 flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-[10px]">
                <span>Empezar Formación</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => {
                setTrainingMode('ADMIN');
                setIsAutoPlaying(true);
                setCurrentSlide(0);
              }}
              className="group relative bg-[#060812] rounded-[2.5rem] p-8 sm:p-12 border-2 border-transparent hover:border-red-600 transition-all text-left shadow-xl hover:shadow-red-600/10 active:scale-95"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                <Shield size={32} className="text-slate-900" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter mb-4 italic">Administrador</h3>
              <p className="text-white/50 font-medium leading-relaxed">Dashboard global, validación de facturas, gestión de usuarios y auditoría de protocolos de calidad.</p>
              <div className="mt-8 flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-[10px]">
                <span>Acceso Control</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </motion.div>
        ) : (
          <>
            {/* Navigation Controls */}
            <div className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
              <div className="flex flex-col bg-white/5 dark:bg-slate-800/5 backdrop-blur-sm rounded-2xl p-1 border border-white/10 dark:border-slate-700/10 hover:bg-white/10 dark:hover:bg-slate-800/10 transition-all group">
                <button
                  onClick={resetSession}
                  className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors active:scale-90"
                  title="Volver a Selección"
                >
                  <Users size={20} />
                </button>
                <div className="h-px bg-white/10 dark:bg-slate-700/10 mx-2" />
                <button
                  onClick={() => {
                    setTrainingMode('STAFF');
                    setCurrentSlide(0);
                    setIsAutoPlaying(true);
                  }}
                  className={`w-12 h-12 flex items-center justify-center transition-colors active:scale-90 ${trainingMode === 'STAFF' ? 'text-red-600 bg-red-600/10' : 'text-slate-400 hover:text-red-600'}`}
                  title="Modo Personal"
                >
                  <User2 size={20} />
                </button>
                <button
                  onClick={() => {
                    setTrainingMode('ADMIN');
                    setCurrentSlide(0);
                    setIsAutoPlaying(true);
                  }}
                  className={`w-12 h-12 flex items-center justify-center transition-colors active:scale-90 ${trainingMode === 'ADMIN' ? 'text-red-600 bg-red-600/10' : 'text-slate-400 hover:text-red-600'}`}
                  title="Modo Administrador"
                >
                  <Shield size={20} />
                </button>
                <div className="h-px bg-white/10 dark:bg-slate-700/10 mx-2" />
                <button
                  onClick={prevSlide}
                  className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors active:scale-90"
                  title="Anterior"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="h-px bg-white/10 dark:bg-slate-700/10 mx-2" />
                
                <button
                  onClick={toggleSpeech}
                  disabled={isGeneratingAI}
                  className={`w-12 h-12 flex items-center justify-center transition-all active:scale-90 ${
                    globalIsSpeaking ? 'text-red-600 animate-pulse' : 
                    isGeneratingAI ? 'text-slate-300' : 'text-slate-400 hover:text-red-600'
                  }`}
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
                        <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter">
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
                          key={point}
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
          </>
        )}
      </main>

      <footer className="h-6 sm:h-12 flex flex-col items-center justify-center shrink-0 relative z-20 px-4">
        {trainingMode !== 'SELECT' && (
          <div className="w-full max-w-5xl px-8 flex items-center gap-4">
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default Training;
