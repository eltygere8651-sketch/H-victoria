import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment, TaskChecklistItem, TaskRecurrence } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, MessagesSquare, Check, Camera, AlertTriangle, Share2, Send, Image, Info, Flame, Bold, Calendar, Clock, List, FileText, Zap, Users, Phone, Hash, ChevronRight, User as UserIcon, Wand2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';
import { ImageViewer } from '../components/ImageViewer';
import { DeletionTimer } from '../components/DeletionTimer';
import { ShareModal } from '../components/ShareModal';
import { sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { TaskPdfDocument } from '../components/TaskPdfDocument';
import { TaskCard } from '../components/TaskCard';

interface TasksProps {
  currentUser: User;
  initialTaskId?: string | null;
}

const Tasks: React.FC<TasksProps> = ({ currentUser, initialTaskId }) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DAILY'>('ACTIVE');
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  const [activeCommentTaskId, setActiveCommentTaskId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });

  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (initialTaskId && allTasks.length > 0) {
      const task = allTasks.find(t => t.id === initialTaskId);
      if (task) {
        // Set the correct tab
        if (task.recurrence === TaskRecurrence.DAILY) {
          setActiveTab('DAILY');
        } else {
          setActiveTab('ACTIVE');
        }
        
        // Scroll to the task after a short delay to allow tab switching and rendering
        setTimeout(() => {
          const element = taskRefs.current[initialTaskId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight effect
            element.classList.add('ring-4', 'ring-red-500', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-red-500', 'ring-opacity-50');
            }, 3000);
          }
        }, 500);
      }
    }
  }, [initialTaskId, allTasks]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  const formatDateTimeLocal = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const parseDateTimeLocal = (val: string) => {
    if (!val) return undefined;
    return new Date(val).getTime();
  };

  // Derived state for the task currently being commented on
  const activeTaskForComments = allTasks.find(t => t.id === activeCommentTaskId);

  // Permission Check
  const canManageTasks = currentUser.role === UserRole.ADMIN || 
                         (currentUser.role === UserRole.STAFF && currentUser.permissions?.includes('CAN_MANAGE_TASKS'));

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((tasks) => {
      setAllTasks(tasks);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments(setDepartments);

    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
    };
  }, []);

  const handleSaveTask = async () => {
    if (!editingTask?.title || !editingTask?.departmentId) {
      setSaveError('Título y Departamento son obligatorios');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const department = departments.find(d => d.id === editingTask.departmentId);
      
      const taskData: Partial<Task> = {
        ...editingTask,
        departmentName: department?.name || 'General',
        priority: editingTask.priority || TaskPriority.MEDIUM,
        status: editingTask.status || TaskStatus.PENDING,
        type: TaskType.TASK,
        createdBy: editingTask.createdBy || currentUser.name,
        createdById: editingTask.createdById || currentUser.id,
        createdAt: editingTask.createdAt || Date.now(),
      };

      // Save as regular Task
      await storageService.saveTask(taskData, selectedImages);
      setShowTaskModal(false);
      setEditingTask(null);
      setSelectedImages([]);
      setPreviews([]);
      setNewChecklistItemText('');
    } catch (error) {
      console.error(error);
      setSaveError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      await storageService.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  // Auto-deletion logic for completed tasks after 12 hours
  useEffect(() => {
    const DELETION_WINDOW_MS = 12 * 60 * 60 * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const tasksToDelete = allTasks.filter(task => 
        task.recurrence !== TaskRecurrence.DAILY && // EXCLUDE DAILY
        task.status === TaskStatus.COMPLETED && 
        task.completedAt && 
        (now - task.completedAt) > DELETION_WINDOW_MS
      );

      tasksToDelete.forEach(task => {
        storageService.deleteTask(task.id);
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [allTasks]);

  // Reset logic for daily tasks after 4 hours of completion
  useEffect(() => {
    const RESET_WINDOW_MS = 4 * 60 * 60 * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const tasksToReset = allTasks.filter(task => 
        task.recurrence === TaskRecurrence.DAILY &&
        task.status === TaskStatus.COMPLETED && 
        task.completedAt && 
        typeof task.completedAt === 'number' &&
        (now - task.completedAt) >= RESET_WINDOW_MS
      );

      if (tasksToReset.length > 0) {
        console.log(`[DAILY RESET] Reiniciando ${tasksToReset.length} tareas diarias...`);
        tasksToReset.forEach(task => {
          storageService.resetDailyTask(task.id).catch(err => console.error('Error resetting task:', err));
        });
      }
    }, 5000); // Check every 5 seconds for faster testing

    return () => clearInterval(interval);
  }, [allTasks]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsCompressing(true);
      // Fix: Explicitly cast to File[] or verify typing. 
      // Array.from on FileList sometimes infers unknown[] in certain TS configs.
      const filesArray = Array.from(e.target.files);
      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      try {
        for (const file of filesArray) {
          // Explicitly cast file to File to satisfy TS
          const compressed = await compressImage(file as File);
          compressedFiles.push(compressed);
          newPreviews.push(URL.createObjectURL(compressed));
        }
        setSelectedImages(prev => [...prev, ...compressedFiles]);
        setPreviews(prev => [...prev, ...newPreviews]);
      } catch (error) {
        console.error("Error compressing images", error);
        alert("Error al procesar las imágenes.");
      } finally {
        setIsCompressing(false);
        // Reset input value to allow selecting the same file again if needed
        if (e.target) e.target.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim()) return;
    await storageService.addCommentToTask(taskId, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: newComment.trim(),
      timestamp: Date.now()
    });
    setNewComment('');
  };

  const handleToggleChecklistItem = useCallback(async (task: Task, itemIndex: number) => {
    const updatedChecklist = [...(task.checklist || [])];
    const item = updatedChecklist[itemIndex];
    item.isCompleted = !item.isCompleted;
    if (item.isCompleted) {
      item.completedBy = currentUser.name;
      item.completedAt = Date.now();
    } else {
      item.completedBy = undefined;
      item.completedAt = undefined;
    }

    const allCompleted = updatedChecklist.every(i => i.isCompleted);
    const updateData: any = { id: task.id, checklist: updatedChecklist };
    
    if (allCompleted && updatedChecklist.length > 0) {
      if (task.recurrence && task.recurrence !== TaskRecurrence.NONE && task.recurrence !== TaskRecurrence.DAILY) {
        // Recurring task completed (Weekly/Monthly): delete it so it "disappears" until the next one
        await storageService.deleteTask(task.id);
        return;
      }
      updateData.status = TaskStatus.COMPLETED;
      updateData.completedBy = currentUser.name;
      updateData.completedAt = Date.now();
    }

    await storageService.saveTask(updateData);
  }, [currentUser.name]);

  const handleStartTask = useCallback(async (taskId: string) => {
    await storageService.saveTask({ id: taskId, status: TaskStatus.IN_PROGRESS });
  }, []);

  const handleCompleteTask = useCallback(async (task: Task) => {
    if (task.recurrence && task.recurrence !== TaskRecurrence.NONE && task.recurrence !== TaskRecurrence.DAILY) {
      // Recurring task completed (Weekly/Monthly): delete it so it "disappears" until the next one
      await storageService.deleteTask(task.id);
      return;
    }
    await storageService.saveTask({ id: task.id, status: TaskStatus.COMPLETED, completedBy: currentUser.name, completedAt: Date.now() });
  }, [currentUser.name]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  }, []);

  const handleDeleteTaskConfirm = useCallback((task: Task) => {
    setTaskToDelete(task);
  }, []);

  const handleCommentTask = useCallback((taskId: string) => {
    setActiveCommentTaskId(taskId);
  }, []);

  const handleViewImagesAction = useCallback((images: string[], index: number) => {
    setViewingImages({ images, startIndex: index });
  }, []);

  const handleAddChecklistItem = () => {
    if (!newChecklistItemText.trim()) return;
    const newItem: TaskChecklistItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: newChecklistItemText.trim(),
      isCompleted: false,
    };
    
    setEditingTask({
      ...editingTask,
      checklist: [...(editingTask?.checklist || []), newItem]
    });
    setNewChecklistItemText('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    const updatedChecklist = [...(editingTask?.checklist || [])];
    updatedChecklist.splice(index, 1);
    setEditingTask({ ...editingTask, checklist: updatedChecklist });
  };

  const handleShareTask = useCallback((task: Task) => {
    try {
      const url = new URL(window.location.href);
      url.search = ''; 
      url.hash = '';
      url.searchParams.set('shareId', task.id);
      const shareUrl = url.toString();

      setShareData({ url: shareUrl, title: task.title });
      setShowShareModal(true);
    } catch (error) {
      console.error("Failed to construct share URL", error);
    }
  }, []);

  const handleShareTaskAction = useCallback((task: Task) => {
    handleShareTask(task);
  }, [handleShareTask]);

  const handleSharePdfAction = useCallback(async (task: Task) => {
    try {
      const filename = `Tarea_${task.id}_${task.departmentName}.pdf`;
      const text = 'Aquí tienes los detalles de la tarea en formato PDF.';
      await sharePdfFromReactComponent(<TaskPdfDocument task={task} preview={false} />, filename, `Tarea: ${task.title}`, text);
    } catch (error) {
      console.error("PDF Share Failed:", error);
      alert('Hubo un error al compartir el PDF.');
    }
  }, []);

  // Helper to insert *bold* syntax in textarea
  const insertUrgentMarker = () => {
    if (!descriptionInputRef.current) return;
    
    const textarea = descriptionInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editingTask?.description || '';
    
    // If text is selected, wrap it. If not, insert markers and position cursor.
    if (start === end) {
      const newText = text.slice(0, start) + '**' + text.slice(end);
      setEditingTask({ ...editingTask, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    } else {
      const selection = text.slice(start, end);
      const newText = text.slice(0, start) + '*' + selection + '*' + text.slice(end);
      setEditingTask({ ...editingTask, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1 + selection.length + 1, start + 1 + selection.length + 1);
      }, 0);
    }
  };

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
      const deptMatch = departmentFilter === 'ALL' || task.departmentId === departmentFilter;
      
      // Tab filtering
      if (activeTab === 'DAILY') {
        return statusMatch && deptMatch && task.recurrence === TaskRecurrence.DAILY;
      } else if (activeTab === 'ACTIVE') {
        return statusMatch && deptMatch && task.recurrence !== TaskRecurrence.DAILY;
      }
      
      return statusMatch && deptMatch;
    }).sort((a, b) => {
      // 1. Completed tasks go to the bottom
      if (a.status !== TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) return -1;
      if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;

      // 2. Sort by dueDate (ascending) if available
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // 3. Sort by startDate (ascending) if available
      if (a.startDate && b.startDate) return a.startDate - b.startDate;
      if (a.startDate && !b.startDate) return -1;
      if (!a.startDate && b.startDate) return 1;

      // 4. Fallback to createdAt (descending - newest first)
      return b.createdAt - a.createdAt;
    });
  }, [allTasks, statusFilter, departmentFilter, activeTab]);

  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);

  const listTasks = useMemo(() => {
    return filteredTasks.filter(t => {
      // Daily tasks should always be visible in the DAILY tab regardless of the week filter
      if (activeTab === 'DAILY') return true;
      
      // Assign each task to exactly one week based on its most relevant date
      const taskDate = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
      return taskDate >= currentWeekStart && taskDate <= currentWeekEnd;
    });
  }, [filteredTasks, activeTab, currentWeekStart, currentWeekEnd]);

  const generateRandomHospitalityTask = async (recurrence: TaskRecurrence = TaskRecurrence.NONE) => {
    const categories = [
      {
        name: "Desayunos",
        templates: [
          { 
            title: "Montaje de Buffet de Desayuno", 
            desc: "Preparar el buffet siguiendo los estándares. Revisar fruta fresca.", 
            checklist: ["Mantelería", "Cubertería", "Zumos", "Café", "Bollería"], 
            imgIds: ["photo-1504754524776-8f4f37790ca0", "photo-1496048970073-17329c9b07ea"], 
            imgTitle: "Estándar Buffet" 
          },
          { 
            title: "Reposición de Estación de Calientes", 
            desc: "Asegurar que los huevos y bacon estén siempre calientes.", 
            checklist: ["Huevos revueltos", "Bacon", "Salchichas", "Champiñones", "Limpieza de bandejas"], 
            imgIds: ["photo-1525351484163-7529414344d8", "photo-1533089860892-a7c6f0a88666"], 
            imgTitle: "Zona Calientes" 
          }
        ]
      },
      {
        name: "Cafetería",
        templates: [
          { 
            title: "Apertura de Barra y Cafetería", 
            desc: "Preparar la barra para el primer servicio. Encender máquinas y revisar stock.", 
            checklist: ["Encender cafetera y molinos", "Revisar stock de leche y café", "Montar vitrina de bollería", "Limpiar barra y taburetes", "Preparar cambio de caja"], 
            imgIds: ["photo-1495474472287-4d71bcdd2085", "photo-1501339847302-ac426a4a7cbb"], 
            imgTitle: "Montaje de Barra" 
          },
          { 
            title: "Limpieza de Máquina de Café", 
            desc: "Limpieza profunda tras el turno. Desinfectar vaporizador y portafiltros.", 
            checklist: ["Limpiar filtros y duchas", "Descalcificar vaporizadores", "Limpiar bandeja de goteo", "Vaciar cajón de posos", "Brillo exterior de acero"], 
            imgIds: ["photo-1510972527921-ce03766a1cf1", "photo-1442512595331-e89e73853f31"], 
            imgTitle: "Limpieza Cafetera" 
          }
        ]
      },
      {
        name: "Restaurante",
        templates: [
          { 
            title: "Montaje de Mesas y Comedor", 
            desc: "Preparar el salón para el servicio de almuerzo/cena.", 
            checklist: ["Colocar mantelería/caminos", "Disponer cubertería y copas", "Revisar limpieza de sillas", "Colocar servilletas dobladas", "Revisar saleros y aceiteras"], 
            imgIds: ["photo-1517248135467-4c7edcad34c4", "photo-1550966841-300ad55a3923"], 
            imgTitle: "Montaje de Comedor" 
          },
          { 
            title: "Repaso de Cristalería y Cubiertos", 
            desc: "Asegurar que todo el material brille antes del servicio.", 
            checklist: ["Repasar copas con vapor", "Pulir cubiertos de acero", "Revisar platos desportillados", "Organizar en aparador"], 
            imgIds: ["photo-1513519245088-0e12902e5a38", "photo-1574936145840-28808d77a0b6"], 
            imgTitle: "Calidad de Menaje" 
          }
        ]
      },
      {
        name: "Limpieza",
        templates: [
          { 
            title: "Limpieza Profunda Habitación VIP", 
            desc: "Atención especial a los detalles. Revisar minibar.", 
            checklist: ["Cambio lencería", "Desinfección baño", "Aspirado", "Polvo en molduras", "Amenities VIP"], 
            imgIds: ["photo-1566073771259-6a8506099945", "photo-1590490360182-c33d57733427"], 
            imgTitle: "Resultado VIP" 
          },
          { 
            title: "Desinfección de Zonas Comunes", 
            desc: "Limpieza de pasillos y ascensores.", 
            checklist: ["Limpiar espejos", "Desinfectar botones", "Fregar suelos", "Limpiar barandillas"], 
            imgIds: ["photo-1564501049412-61c2a3083791", "photo-1582719478250-c89cae4dc85b"], 
            imgTitle: "Zonas Comunes" 
          }
        ]
      },
      {
        name: "Mantenimiento",
        templates: [
          { 
            title: "Revisión de Aire Acondicionado", 
            desc: "Limpieza de filtros en planta 3.", 
            checklist: ["Desmontar rejillas", "Limpiar filtros", "Comprobar gas", "Probar mando"], 
            imgIds: ["photo-1581092160562-40aa08e78837", "photo-1621905251189-08b45d6a269e"], 
            imgTitle: "Mantenimiento A/C" 
          },
          { 
            title: "Control de Piscina y Spa", 
            desc: "Medir niveles de cloro y pH.", 
            checklist: ["Test de agua", "Limpiar bordes", "Revisar depuradora", "Reponer toallas"], 
            imgIds: ["photo-1560185127-6ed189bf02f4", "photo-1576013551627-0cc20b96c2a7"], 
            imgTitle: "Control Piscina" 
          }
        ]
      }
    ];

    const category = categories[Math.floor(Math.random() * categories.length)];
    const template = category.templates[Math.floor(Math.random() * category.templates.length)];
    
    const variations = ["", " (Urgente)", " - Turno Mañana", " - Turno Tarde", " (Prioritario)"];
    const dynamicTitle = template.title + variations[Math.floor(Math.random() * variations.length)];

    const selectedChecklist = template.checklist.map((text, i) => ({
      id: Date.now().toString() + i + Math.random().toString(36).substr(2, 5),
      text,
      isCompleted: false
    }));

    const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];

    const matchingDept = departments.find(d => 
      d.name.toLowerCase().includes(category.name.toLowerCase()) || 
      category.name.toLowerCase().includes(d.name.toLowerCase())
    );
    const randomDept = matchingDept || (departments.length > 0 
      ? departments[Math.floor(Math.random() * departments.length)] 
      : { id: 'general', name: 'General' });

    const now = Date.now();
    const randomStartOffset = (Math.floor(Math.random() * 3) - 1) * 24 * 60 * 60 * 1000;
    const randomDuration = (Math.floor(Math.random() * 4) + 1) * 60 * 60 * 1000;
    const startDate = now + randomStartOffset;
    const dueDate = startDate + randomDuration;

    // Use curated Unsplash IDs for 100% relevance
    const imageUrls = template.imgIds.map(id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`);

    const testTask: Partial<Task> = {
      title: dynamicTitle,
      description: template.desc,
      departmentId: randomDept.id,
      departmentName: randomDept.name,
      priority: randomPriority,
      status: TaskStatus.PENDING,
      type: TaskType.TASK,
      recurrence,
      createdBy: currentUser.name,
      createdById: currentUser.id,
      createdAt: now,
      startDate: recurrence === TaskRecurrence.DAILY ? undefined : startDate,
      dueDate: recurrence === TaskRecurrence.DAILY ? undefined : dueDate,
      checklist: selectedChecklist,
      imageUrls,
      imagesTitle: template.imgTitle
    };

    await storageService.saveTask(testTask);
    setShowGeneratorModal(false);
  };

  const handleDayClick = (date: Date) => {
    if (!canManageTasks) return;
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(18, 0, 0, 0);

    setEditingTask({
      startDate: start.getTime(),
      dueDate: end.getTime(),
    });
    setSelectedImages([]);
    setPreviews([]);
    setShowTaskModal(true);
  };

  const renderCalendarView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday, 6 = Sunday

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const today = () => setCurrentMonth(new Date());

    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-800 p-2 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-4">
          <h3 className="text-xl md:text-2xl font-black uppercase text-gray-900 dark:text-white text-center">
            {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="px-3 py-2 md:px-4 bg-gray-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">&lt;</button>
            <button onClick={today} className="px-3 py-2 md:px-4 bg-gray-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Hoy</button>
            <button onClick={nextMonth} className="px-3 py-2 md:px-4 bg-gray-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">&gt;</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-tighter md:tracking-widest truncate">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[100px] bg-gray-50/50 dark:bg-slate-900/50 rounded-lg md:rounded-xl border border-dashed border-gray-200 dark:border-slate-800"></div>;
            
            const isToday = new Date().toDateString() === date.toDateString();
            
            // Find tasks for this day
            const dayTasks = filteredTasks.filter(t => {
              if (activeTab === 'DAILY') return true; // Show daily routines on every day in the calendar
              
              if (t.startDate && t.dueDate) {
                const start = new Date(t.startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(t.dueDate);
                end.setHours(23, 59, 59, 999);
                return date >= start && date <= end;
              }
              const taskDate = t.dueDate ? new Date(t.dueDate) : t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
              return taskDate.toDateString() === date.toDateString();
            });

            return (
              <div 
                key={date.toISOString()} 
                onClick={() => handleDayClick(date)}
                className={`min-h-[60px] md:min-h-[100px] p-1 md:p-2 rounded-lg md:rounded-xl border ${isToday ? 'border-red-500 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'} flex flex-col ${canManageTasks ? 'cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors' : ''}`}
              >
                <div className={`text-center md:text-right text-xs md:text-sm font-bold mb-1 ${isToday ? 'text-red-600' : 'text-gray-500 dark:text-slate-400'}`}>
                  {date.getDate()}
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[60px] md:max-h-[120px] no-scrollbar">
                  {dayTasks.map(t => (
                    <div 
                      key={t.id} 
                      onClick={(e) => { e.stopPropagation(); setEditingTask(t); setShowTaskModal(true); }}
                      className={`text-[8px] md:text-[10px] font-bold p-1 md:p-1.5 rounded md:rounded-lg cursor-pointer truncate ${t.status === TaskStatus.COMPLETED ? 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500 line-through' : t.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="font-sans pb-24 bg-gray-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="sticky top-[var(--header-h)] z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 px-4 pt-4 pb-3 md:px-6 shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Servicios</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none drop-shadow-sm">
                Tareas <span className="text-red-600 dark:text-red-500 italic">{activeTab === 'ACTIVE' ? 'Activas' : activeTab === 'DAILY' ? 'Diarias' : 'Programadas'}</span>
              </h2>
            </div>
            
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mx-4">
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Activas
              </button>
              <button
                onClick={() => setActiveTab('DAILY')}
                className={`relative px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden group ${
                  activeTab === 'DAILY' 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-600/30 text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="relative z-10 flex items-center gap-1.5">
                  <span>Diarias</span>
                  {allTasks.some(t => t.recurrence === TaskRecurrence.DAILY && t.status !== TaskStatus.COMPLETED) && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className={`flex items-center justify-center w-4 h-4 rounded-full ${activeTab === 'DAILY' ? 'bg-white text-red-600' : 'bg-red-600 text-white shadow-lg shadow-red-600/40'}`}
                    >
                      <AlertTriangle size={10} fill="currentColor" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
                {activeTab === 'DAILY' && (
                  <motion.div 
                    layoutId="daily-glow"
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  />
                )}
              </button>
            </div>
            
            {/* Mobile View Mode Toggle */}
            <div className="flex sm:hidden bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'CALENDAR' ? 'LIST' : 'CALENDAR')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
            {/* Desktop View Mode Toggle */}
            <div className="hidden sm:flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                title="Vista de Lista"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'CALENDAR' ? 'LIST' : 'CALENDAR')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                title="Vista de Calendario"
              >
                <Calendar size={18} />
              </button>
            </div>

            {/* Only Admins or Staff with 'CAN_MANAGE_TASKS' permission can create new tasks */}
            {canManageTasks && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowGeneratorModal(true)}
                  className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                  title="Generar Tarea de Prueba"
                >
                  <Zap size={14} fill="white" />
                </button>
                <button 
                  onClick={() => {
                    setEditingTask({});
                    setSelectedImages([]);
                    setPreviews([]);
                    setShowTaskModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Nueva Tarea</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Week Navigation inside sticky header */}
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
                className="flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-xl font-bold text-[10px] sm:text-xs bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm appearance-none text-center"
              >
                <option value="ALL">Estados</option>
                <option value={TaskStatus.PENDING}>Pendientes</option>
                <option value={TaskStatus.IN_PROGRESS}>En Curso</option>
                <option value={TaskStatus.COMPLETED}>Completadas</option>
              </select>

              <select 
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-xl font-bold text-[10px] sm:text-xs bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm appearance-none text-center"
              >
                <option value="ALL">Dptos.</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {viewMode === 'LIST' && (
              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800/50">
                <button 
                  onClick={() => setCurrentWeekStart(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-1.5 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <ChevronDown size={16} className="rotate-90" />
                </button>
                <div className="text-center flex items-center gap-2">
                  <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Semana:</p>
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white">
                    {currentWeekStart.getDate()} {currentWeekStart.toLocaleString('es-ES', { month: 'short' })} - {currentWeekEnd.getDate()} {currentWeekEnd.toLocaleString('es-ES', { month: 'short' })}
                  </p>
                  <button 
                    onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}
                    className="text-[9px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Hoy
                  </button>
                </div>
                <button 
                  onClick={() => setCurrentWeekStart(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-1.5 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <ChevronDown size={16} className="-rotate-90" />
                </button>
              </div>
            )}
          </div>
      </div>

      <div className="p-4 md:p-6 space-y-10">
        {/* SECTION: TASKS (HIGH IMPACT ACTION STYLE) */}
        {viewMode === 'LIST' ? (
          <div className="space-y-6">
            {listTasks.length === 0 ? (
              <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-dashed border-gray-200 dark:border-slate-800 shadow-inner">
                <ClipboardCheck size={80} className="mx-auto mb-6 text-gray-300 dark:text-slate-700" />
                <p className="text-3xl font-black text-gray-400 dark:text-slate-600 uppercase tracking-tighter">
                  {activeTab === 'ACTIVE' ? 'Sin Tareas Activas' : 'Sin Tareas Diarias'}
                </p>
                <p className="text-gray-400 dark:text-slate-500 font-medium mt-2">
                  {activeTab === 'ACTIVE' ? '¡Todo al día en esta semana!' : 'No hay rutinas diarias configuradas.'}
                </p>
                {(statusFilter !== 'ALL' || departmentFilter !== 'ALL') && (
                  <button 
                    onClick={() => { setStatusFilter('ALL'); setDepartmentFilter('ALL'); }}
                    className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-bold uppercase text-xs tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            ) : (
              listTasks.map(task => (
                <div 
                  key={task.id} 
                  ref={el => taskRefs.current[task.id] = el}
                  className="w-full transition-all duration-500 rounded-[2.5rem]"
                >
                  <TaskCard 
                    task={task}
                    currentUser={currentUser}
                    onToggleChecklist={handleToggleChecklistItem}
                    onStart={handleStartTask}
                    onComplete={handleCompleteTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTaskConfirm}
                    onComment={handleCommentTask}
                    onShare={handleShareTaskAction}
                    onSharePdf={handleSharePdfAction}
                    onViewImages={handleViewImagesAction}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          renderCalendarView()
        )}
      </div>

      {/* NEW COMMENTS MODAL (Bottom Sheet Style for Mobile) */}
      {activeTaskForComments && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
           {/* Dismiss Overlay */}
           <div className="absolute inset-0" onClick={() => setActiveCommentTaskId(null)}></div>
           
           <div className="relative bg-white dark:bg-slate-900 w-full h-[85dvh] md:h-auto md:max-h-[80vh] md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col animate-slide-up border-t border-x border-gray-200 dark:border-slate-800 overflow-hidden">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Comentarios</h3>
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide truncate max-w-[200px]">{activeTaskForComments.title}</p>
                 </div>
                 <button onClick={() => setActiveCommentTaskId(null)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-slate-950/50">
                 {activeTaskForComments.comments?.map(comment => {
                   const isSystem = comment.userId === 'system';
                   const isMe = comment.userId === currentUser.id;

                   return (
                    <div 
                      key={comment.id} 
                      className={`p-4 rounded-2xl shadow-sm transition-all ${
                        isMe 
                          ? 'bg-blue-600 text-white ml-auto rounded-tr-sm max-w-[85%]' 
                          : isSystem
                            ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 w-full flex items-start gap-3 relative overflow-hidden'
                            : 'bg-white dark:bg-slate-800 mr-auto rounded-tl-sm border border-gray-100 dark:border-slate-700 max-w-[85%]'
                      }`}
                    >
                      {isSystem && (
                        <>
                          <div className="absolute top-0 right-0 p-1 opacity-10">
                            <Flame size={40} className="text-red-600" />
                          </div>
                          <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        </>
                      )}
                      
                      <div className="flex-1">
                        <p className={`text-[10px] font-black mb-1 flex justify-between gap-4 uppercase tracking-widest ${
                          isMe ? 'text-blue-200' : isSystem ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'
                        }`}>
                          <span>{isSystem ? 'SISTEMA / REPORTE' : comment.userName}</span>
                          <span>{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </p>
                        <p className={`text-base font-bold ${isMe ? 'text-white' : isSystem ? 'text-red-900 dark:text-red-100' : 'text-gray-800 dark:text-slate-200'}`}>
                          {comment.message}
                        </p>
                      </div>
                    </div>
                  );
                 })}
                 
                 {(!activeTaskForComments.comments || activeTaskForComments.comments.length === 0) && (
                   <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-50">
                      <MessagesSquare size={48} className="mb-4 text-gray-400" />
                      <p className="font-bold text-gray-500 dark:text-slate-400">No hay comentarios aún.</p>
                      <p className="text-xs font-semibold text-gray-400">¡Sé el primero en escribir!</p>
                   </div>
                 )}
              </div>
              
              {/* Input Area (Fixed at bottom) */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 pb-safe md:pb-4">
                 <div className="flex gap-2 items-center bg-gray-100 dark:bg-slate-800 p-1.5 rounded-[1.25rem]">
                    <input 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un comentario..."
                      className="flex-1 px-4 py-3 bg-transparent outline-none font-bold text-gray-700 dark:text-white placeholder-gray-400"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleAddComment(activeTaskForComments.id)}
                    />
                    <button 
                       onClick={() => handleAddComment(activeTaskForComments.id)} 
                       disabled={!newComment.trim()} 
                       className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 active:scale-95 transition-all shadow-md"
                    >
                       <Send size={20} className="ml-0.5" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: NEW / EDIT TASK */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg h-[95dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-2 border-gray-100 dark:border-slate-700">
             
             {/* Modal Header */}
             <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {editingTask?.id ? 'Editar Tarea' : 'Nueva Tarea'}
                </h3>
                <button onClick={() => setShowTaskModal(false)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-red-600 transition-colors">
                  <X size={24} strokeWidth={2.5} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Título de la Tarea</label>
                   <input 
                     disabled={!canManageTasks}
                     value={editingTask?.title || ''}
                     onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                     className="w-full px-5 py-4 text-xl font-black bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white placeholder-gray-400"
                     placeholder="¿QUÉ HAY QUE HACER?"
                     autoFocus
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Inicio (Opcional)</label>
                      <input 
                        disabled={!canManageTasks}
                        type="datetime-local"
                        value={formatDateTimeLocal(editingTask?.startDate)}
                        onChange={e => setEditingTask({ ...editingTask, startDate: parseDateTimeLocal(e.target.value) })}
                        className="w-full px-4 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Fin / Límite (Opcional)</label>
                      <input 
                        disabled={!canManageTasks}
                        type="datetime-local"
                        value={formatDateTimeLocal(editingTask?.dueDate)}
                        onChange={e => setEditingTask({ ...editingTask, dueDate: parseDateTimeLocal(e.target.value) })}
                        className="w-full px-4 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Departamento</label>
                      <div className="relative">
                        <select 
                          disabled={!canManageTasks}
                          value={editingTask?.departmentId || ''}
                          onChange={e => setEditingTask({ ...editingTask, departmentId: e.target.value })}
                          className="w-full pl-4 pr-10 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm"
                        >
                          <option value="" disabled>Seleccionar</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Prioridad</label>
                      <div className="relative">
                        <select 
                          disabled={!canManageTasks}
                          value={editingTask?.priority || TaskPriority.MEDIUM}
                          onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                          className="w-full pl-4 pr-10 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm"
                        >
                          <option value={TaskPriority.LOW}>Baja</option>
                          <option value={TaskPriority.MEDIUM}>Normal</option>
                          <option value={TaskPriority.HIGH}>Alta / Urgente</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                   </div>
                </div>

                {/* Recurrence Field */}
                {currentUser.role === UserRole.ADMIN && (
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Recurrencia (Programar)</label>
                     <div className="relative">
                       <select 
                         disabled={!canManageTasks}
                         value={editingTask?.recurrence || TaskRecurrence.NONE}
                         onChange={e => setEditingTask({ ...editingTask, recurrence: e.target.value as TaskRecurrence })}
                         className="w-full pl-4 pr-10 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm"
                       >
                         <option value={TaskRecurrence.NONE}>Ninguna (Tarea Única)</option>
                         <option value={TaskRecurrence.DAILY}>Diaria (Permanente con reinicio cada 4h)</option>
                        </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-2 ml-1 italic">
                       * Las tareas diarias son permanentes y se reinician automáticamente 4 horas después de completarse.
                     </p>
                  </div>
                )}

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                      
                      {/* Editor Toolbar */}
                      <button 
                        onClick={insertUrgentMarker}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95"
                        type="button"
                        title="Resaltar texto seleccionado como urgente"
                      >
                        <Flame size={12} fill="currentColor" />
                        Resaltar Urgencia
                      </button>
                   </div>
                   
                   <textarea 
                     disabled={!canManageTasks}
                     ref={descriptionInputRef}
                     value={editingTask?.description || ''}
                     onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                     className="w-full px-5 py-4 font-bold text-base bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all min-h-[140px] dark:text-white placeholder-gray-400 resize-none"
                     placeholder="Instrucciones detalladas..."
                   />
                   <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5 ml-1">
                     <Info size={12} />
                     <span>Tip: Usa <span className="text-red-500 font-mono bg-red-50 dark:bg-red-900/20 px-1 rounded">*asteriscos*</span> para marcar texto urgente.</span>
                   </p>
                </div>

                {/* Checklist Input */}
                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Lista de Tareas (Checklist)</label>
                   
                   {/* Existing Checklist Items */}
                   {editingTask?.checklist && editingTask.checklist.length > 0 && (
                     <div className="space-y-2 mb-3">
                       {editingTask.checklist.map((item, index) => (
                         <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl border border-gray-200 dark:border-slate-700">
                           <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-slate-600 flex-shrink-0"></div>
                           <span className="flex-1 text-sm font-bold text-gray-700 dark:text-slate-300">{item.text}</span>
                           <button 
                             onClick={() => handleRemoveChecklistItem(index)}
                             className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                           >
                             <X size={16} strokeWidth={3} />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Add New Item */}
                   <div className="flex gap-2">
                     <input 
                       value={newChecklistItemText}
                       onChange={e => setNewChecklistItemText(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                       className="flex-1 px-4 py-3 font-bold text-sm bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white placeholder-gray-400"
                       placeholder="Añadir elemento a la lista..."
                     />
                     <button 
                       onClick={handleAddChecklistItem}
                       disabled={!newChecklistItemText.trim()}
                       className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black uppercase tracking-wider rounded-xl disabled:opacity-50 transition-all active:scale-95"
                     >
                       Añadir
                     </button>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Título para las Imágenes (Opcional)</label>
                   <input 
                     disabled={!canManageTasks}
                     value={editingTask?.imagesTitle || ''}
                     onChange={e => setEditingTask({ ...editingTask, imagesTitle: e.target.value })}
                     className="w-full px-5 py-3 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none transition-all dark:text-white placeholder-gray-400 text-sm"
                     placeholder="Ej: Así es como debe quedar..."
                   />
                </div>

                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Imágenes</label>
                   <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {/* BUTTON 1: CAMERA (Forced Environment Capture) */}
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-all flex-shrink-0 group"
                      >
                        <Camera size={28} className="group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-black mt-1 uppercase tracking-wide">FOTO</span>
                      </button>

                      {/* BUTTON 2: GALLERY (File Picker) */}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex-shrink-0 group"
                      >
                        <Image size={28} className="group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-black mt-1 uppercase tracking-wide">GALERÍA</span>
                      </button>

                      {/* Hidden Input for CAMERA */}
                      <input 
                        type="file" 
                        ref={cameraInputRef} 
                        onChange={handleImageSelect} 
                        className="hidden" 
                        accept="image/*" 
                        capture="environment"
                      />

                      {/* Hidden Input for GALLERY */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageSelect} 
                        className="hidden" 
                        accept="image/*" 
                        multiple
                      />
                      
                      {/* Existing Images (Edit Mode) */}
                      {editingTask?.imageUrls?.map((url, i) => (
                        <div key={`existing-${i}`} className="relative w-24 h-24 flex-shrink-0">
                           <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-gray-200 dark:border-slate-700" />
                           <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-1 rounded-b-[14px]">Guardada</span>
                        </div>
                      ))}

                      {/* New Preview Images */}
                      {previews.map((url, i) => (
                        <div key={`new-${i}`} className="relative w-24 h-24 flex-shrink-0 group">
                           <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-red-500 shadow-md" />
                           <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"><X size={14} strokeWidth={3} /></button>
                        </div>
                      ))}
                   </div>
                </div>

                {saveError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-center font-bold text-sm border-2 border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                    <AlertTriangle size={18} /> {saveError}
                  </div>
                )}
             </div>

             {/* Modal Footer */}
             <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex gap-4 sticky bottom-0 z-10">
                <button onClick={() => setShowTaskModal(false)} className="flex-1 py-4 font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  {canManageTasks ? 'Cancelar' : 'Cerrar'}
                </button>
                {canManageTasks && (
                  <button 
                    onClick={handleSaveTask} 
                    disabled={isSaving || isCompressing}
                    className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-button-red active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  >
                    {isSaving || isCompressing ? <Loader2 className="animate-spin" strokeWidth={3} /> : <Save size={22} strokeWidth={3} />}
                    {isSaving ? 'Guardando...' : isCompressing ? 'Procesando...' : 'PUBLICAR TAREA'}
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-2 border-gray-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-500 shadow-inner">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight">¿Eliminar Tarea?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8 font-bold text-lg">Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-4 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleDeleteTask} className="flex-1 py-4 font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 shadow-lg shadow-button-red transition-all">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Generator Selection Modal */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-scale-up border border-gray-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-500 shadow-inner">
               <Wand2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight text-center">Generador de Tareas</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8 font-bold text-center">¿Qué tipo de tarea deseas generar para el equipo?</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => generateRandomHospitalityTask(TaskRecurrence.DAILY)}
                className="w-full flex items-center gap-4 p-5 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-3xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <RotateCcw size={24} />
                </div>
                <div className="text-left">
                  <div className="font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">Tarea Diaria</div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Permanente con reinicio cada 4h</div>
                </div>
              </button>

              <button 
                onClick={() => generateRandomHospitalityTask(TaskRecurrence.NONE)}
                className="w-full flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-900/30 rounded-3xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all group"
              >
                <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <ClipboardCheck size={24} />
                </div>
                <div className="text-left">
                  <div className="font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Tarea Única</div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Tarea puntual para el turno actual</div>
                </div>
              </button>

              <button 
                onClick={() => setShowGeneratorModal(false)}
                className="w-full py-4 font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingImages && (
        <ImageViewer 
          images={viewingImages.images}
          startIndex={viewingImages.startIndex}
          onClose={() => setViewingImages(null)}
        />
      )}

      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        url={shareData.url} 
        title={shareData.title} 
      />

      {/* Floating Action Button for Mobile removed for cleaner UI */}

    </div>
  );
};

export default Tasks;