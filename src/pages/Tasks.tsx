import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment, TaskChecklistItem, TaskRecurrence } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, MessagesSquare, Check, Camera, AlertTriangle, Share2, Send, Image, Info, Flame, Bold, Calendar, Clock, List, FileText, ConciergeBell, Users, Phone, Hash, ChevronRight, User as UserIcon, Video, Megaphone, LayoutDashboard, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';
import { ImageViewer } from '../components/ImageViewer';
import { DeletionTimer } from '../components/DeletionTimer';
import { ShareModal } from '../components/ShareModal';
import { sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { TaskPdfDocument } from '../components/TaskPdfDocument';
import { TaskCard } from '../components/TaskCard';
import { ReservationViewModal } from '../components/ReservationViewModal';

interface TasksProps {
  currentUser: User;
  initialTaskId?: string | null;
  initialTab?: 'ACTIVE' | 'DAILY' | 'RESERVATIONS' | 'ANNOUNCEMENTS' | 'ARRIVED';
}

const Tasks: React.FC<TasksProps> = ({ currentUser, initialTaskId, initialTab }) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DAILY' | 'RESERVATIONS' | 'ANNOUNCEMENTS' | 'ARRIVED' | 'ALL_RESERVATIONS'>(initialTab || 'ACTIVE');

  // Update active tab when prop changes
  useEffect(() => {
    if (initialTab && !initialTaskId) {
      setActiveTab(initialTab);
    }
  }, [initialTab, initialTaskId]);
  const [activeLocation, setActiveLocation] = useState<string>('restaurante');
  const [reservationSearchTerm, setReservationSearchTerm] = useState('');
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
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
        if (task.type === TaskType.ANNOUNCEMENT) {
          setActiveTab('ANNOUNCEMENTS');
          if (task.location) {
            setActiveLocation(task.location);
          }
        } else if (task.type === TaskType.RESERVATION) {
          setActiveTab('RESERVATIONS');
          if (task.location) {
            setActiveLocation(task.location);
          }
        } else if (task.recurrence === TaskRecurrence.DAILY) {
          setActiveTab('DAILY');
        } else {
          setActiveTab('ACTIVE');
        }
        
        // Set viewing task or highlight
        if (task.type === TaskType.ANNOUNCEMENT || task.type === TaskType.RESERVATION) {
          setViewingTask(task);
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
        }, 800);
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
    const isAnnouncement = editingTask?.type === TaskType.ANNOUNCEMENT;
    const isReservation = editingTask?.type === TaskType.RESERVATION;
    const isSpecialType = isAnnouncement || isReservation;
    
    if (!editingTask?.title) {
      setSaveError(isReservation ? 'El nombre del cliente es obligatorio' : 'El título es obligatorio');
      return;
    }

    if (!isSpecialType && !editingTask?.departmentId) {
      setSaveError('El departamento es obligatorio');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const department = departments.find(d => d.id === editingTask.departmentId);
      
      const taskData: Partial<Task> = {
        ...editingTask,
        type: editingTask.type || TaskType.TASK,
        location: isSpecialType ? (editingTask.location || 'restaurante') : undefined,
        departmentName: isSpecialType ? `Salón: ${editingTask.location || 'restaurante'}` : (department?.name || 'General'),
        departmentId: isSpecialType ? `salon-${editingTask.location || 'restaurante'}` : (editingTask.departmentId || 'general'),
        reservationDate: isReservation && !editingTask.reservationDate 
          ? new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : editingTask.reservationDate,
        priority: editingTask.priority || TaskPriority.MEDIUM,
        status: editingTask.status || TaskStatus.PENDING,
        createdBy: editingTask.createdBy || currentUser.name,
        createdById: editingTask.createdById || currentUser.id,
        createdAt: editingTask.createdAt || Date.now(),
      };

      // Save as regular Task
      await storageService.saveTask(taskData, selectedImages, selectedVideos);
      setShowTaskModal(false);
      setEditingTask(null);
      setSelectedImages([]);
      setSelectedVideos([]);
      setPreviews([]);
      setVideoPreviews([]);
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
      if (taskToDelete.type === TaskType.ANNOUNCEMENT) {
        if (deletePassword === 'bn2020') {
          await storageService.deleteTask(taskToDelete.id);
          setTaskToDelete(null);
          setDeletePassword('');
        } else {
          alert('Contraseña incorrecta');
        }
      } else {
        // For tasks or reservations, no password needed
        await storageService.deleteTask(taskToDelete.id);
        setTaskToDelete(null);
      }
    }
  };

  const handleMarkAsNoShow = useCallback(async (task: Task) => {
    if (!canManageTasks) return;
    await storageService.deleteTask(task.id);
  }, [canManageTasks]);

  // Helper to get reservation count for a specific location for today
  const getReservationCount = (location: string) => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return allTasks.filter(t => 
      t.type === TaskType.RESERVATION && 
      (t.location || 'restaurante') === location && 
      t.reservationDate === todayStr &&
      !t.clientArrived
    ).length;
  };

  // Auto-deletion logic for completed tasks and arrived reservations
  useEffect(() => {
    const RECURRING_DELETION_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours for recurring tasks (non-daily)
    const ARRIVED_DELETION_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours for arrived reservations

    const interval = setInterval(() => {
      const now = Date.now();
      const tasksToDelete = allTasks.filter(task => {
        // Handle deletion of reservations marked as "arrived" -> delete after 4 hours
        if (task.type === TaskType.RESERVATION && task.clientArrived && task.arrivedAt) {
          if ((now - task.arrivedAt) > ARRIVED_DELETION_WINDOW_MS) {
            return true;
          }
        }
        
        if (task.type === TaskType.ANNOUNCEMENT) return false;
        if (task.recurrence === TaskRecurrence.DAILY) return false;
        if (task.status !== TaskStatus.COMPLETED || !task.completedAt) return false;
        
        const isUnique = !task.recurrence || task.recurrence === TaskRecurrence.NONE;
        
        // Unique tasks are now deleted immediately by the service, 
        // but this acts as a cleanup for any that might have been missed.
        // We'll set a very short safety window for unique tasks (e.g., 5 seconds) 
        // to give the UI time to animate/update before it disappears if needed, 
        // but since saveTask now manages it, we mostly focus on recurring ones here.
        const window = isUnique ? 5000 : RECURRING_DELETION_WINDOW_MS;
        
        return (now - task.completedAt) > window;
      });

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
      const filesArray = Array.from(e.target.files);
      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      try {
        for (const file of filesArray) {
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
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newVideoFiles: File[] = [];
      const newPreviews: string[] = [];

      filesArray.forEach(file => {
        // Limit video size roughly to 50MB for free tier stability
        if (file.size > 50 * 1024 * 1024) {
          alert(`El video ${file.name} es demasiado grande. Máximo 50MB.`);
          return;
        }
        newVideoFiles.push(file as File);
        newPreviews.push(URL.createObjectURL(file as File));
      });

      setSelectedVideos(prev => [...prev, ...newVideoFiles]);
      setVideoPreviews(prev => [...prev, ...newPreviews]);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
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
      if (task.type !== TaskType.ANNOUNCEMENT && task.recurrence && task.recurrence !== TaskRecurrence.NONE && task.recurrence !== TaskRecurrence.DAILY) {
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
    if (task.type !== TaskType.ANNOUNCEMENT && task.recurrence && task.recurrence !== TaskRecurrence.NONE && task.recurrence !== TaskRecurrence.DAILY) {
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearServiceConfirm, setShowClearServiceConfirm] = useState(false);
  const [reservationCount, setReservationCount] = useState(0);

  const [isCounting, setIsCounting] = useState(false);

  const handleClearAllReservations = async () => {
    try {
      setLoading(true);
      await storageService.clearAllReservations();
      setShowClearConfirm(false);
      // Local update is handled by the subscription
    } catch (error) {
      console.error("Error clearing reservations:", error);
      alert('Error al intentar limpiar las reservas.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearArrived = async () => {
    try {
      setLoading(true);
      const arrivedTasks = allTasks.filter(t => t.type === TaskType.RESERVATION && t.clientArrived);
      for (const t of arrivedTasks) {
        await storageService.deleteTask(t.id);
      }
    } catch (error) {
      console.error("Error cleaning service:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareTaskAction = useCallback((task: Task) => {
    handleShareTask(task);
  }, [handleShareTask]);

  const handleSharePdfAction = useCallback(async (task: Task) => {
    try {
      const isReservation = task.type === TaskType.RESERVATION;
      const filename = isReservation 
        ? `Reserva_${(task.title || 'Sin_Titulo').replace(/\s+/g, '_')}_${(task.reservationDate || '').replace(/\//g, '-')}.pdf`
        : `Tarea_${task.id}_${task.departmentName || 'General'}.pdf`;
      const text = isReservation
        ? `Aquí tienes los detalles de la reserva de ${task.title} para el ${task.reservationDate}.`
        : 'Aquí tienes los detalles de la tarea en formato PDF.';
      const title = isReservation ? `Reserva: ${task.title}` : `Tarea: ${task.title}`;

      await sharePdfFromReactComponent(<TaskPdfDocument task={task} preview={false} />, filename, title, text);
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

  const handleToggleArrival = useCallback(async (task: Task) => {
    // Only admins or someone who can manage tasks
    if (!canManageTasks) return;
    
    const clientArrived = !task.clientArrived;
    await storageService.saveTask({ 
      id: task.id, 
      clientArrived,
      arrivedAt: clientArrived ? Date.now() : undefined 
    });
  }, [canManageTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
      const deptMatch = departmentFilter === 'ALL' || task.departmentId === departmentFilter;
      
      // Tab filtering
      if (activeTab === 'RESERVATIONS') {
        const itemLocation = task.location || 'restaurante';
        const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // Helper to normalize dates for comparison (DD/MM/YYYY)
        const isSameDate = (d1: string, d2: string) => {
          if (!d1 || !d2) return false;
          const normalize = (s: string) => s.split('/').map(p => p.padStart(2, '0')).join('/');
          return normalize(d1) === normalize(d2);
        };

        const isToday = isSameDate(task.reservationDate || '', todayStr);
        // In list mode, only show today's pending reservations. In calendar mode, show all for that location.
        const dateMatch = viewMode === 'CALENDAR' ? true : isToday;
        return task.type === TaskType.RESERVATION && itemLocation === activeLocation && !task.clientArrived && dateMatch;
      }

      if (activeTab === 'ALL_RESERVATIONS') {
        const itemLocation = task.location || 'restaurante';
        const locationMatch = reservationSearchTerm ? true : itemLocation === activeLocation;
        // EXCLUSIVE: Do not show if already arrived in the general search tab
        if (task.type !== TaskType.RESERVATION || !locationMatch || task.clientArrived) return false;
        
        if (!reservationSearchTerm) return true;
        const searchLower = reservationSearchTerm.toLowerCase();
        
        // Match name, date (fuzzy), phone or table
        return (
          (task.title || '').toLowerCase().includes(searchLower) ||
          (task.reservationDate || '').toLowerCase().includes(searchLower) ||
          (task.clientPhone || '').toLowerCase().includes(searchLower) ||
          (task.tableNumber || '').toLowerCase().includes(searchLower)
        );
      }

      if (activeTab === 'ARRIVED') {
        const itemLocation = task.location || 'restaurante';
        const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const locationMatch = reservationSearchTerm ? true : itemLocation === activeLocation;
        
        const isSameDate = (d1: string, d2: string) => {
          if (!d1 || !d2) return false;
          const normalize = (s: string) => s.split('/').map(p => p.padStart(2, '0')).join('/');
          return normalize(d1) === normalize(d2);
        };

        const isToday = isSameDate(task.reservationDate || '', todayStr);
        // Show reservations that arrived today (or all arrived in calendar/search mode)
        const dateMatch = (viewMode === 'CALENDAR' || reservationSearchTerm) ? true : isToday;
        return task.type === TaskType.RESERVATION && task.clientArrived === true && locationMatch && dateMatch;
      }

      if (activeTab === 'ANNOUNCEMENTS') {
        const itemLocation = task.location || 'restaurante';
        return task.type === TaskType.ANNOUNCEMENT && itemLocation === activeLocation;
      }

      const isNotSpecial = task.type !== TaskType.ANNOUNCEMENT && task.type !== TaskType.RESERVATION;
      
      if (activeTab === 'DAILY') {
        return isNotSpecial && statusMatch && deptMatch && task.recurrence === TaskRecurrence.DAILY;
      } else if (activeTab === 'ACTIVE') {
        return isNotSpecial && statusMatch && deptMatch && task.recurrence !== TaskRecurrence.DAILY;
      }
      
      return isNotSpecial && statusMatch && deptMatch;
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
  }, [allTasks, statusFilter, departmentFilter, activeTab, activeLocation, reservationSearchTerm, viewMode]);

  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);

  const listTasks = useMemo(() => {
    return filteredTasks.filter(t => {
      // Daily, Announcements, and Reservations should always be visible regardless of the week filter
      if (activeTab === 'DAILY' || activeTab === 'ANNOUNCEMENTS' || activeTab === 'RESERVATIONS' || activeTab === 'ARRIVED' || activeTab === 'ALL_RESERVATIONS') return true;
      
      // Assign each task to exactly one week based on its most relevant date
      const taskDate = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
      return taskDate >= currentWeekStart && taskDate <= currentWeekEnd;
    });
  }, [filteredTasks, activeTab, currentWeekStart, currentWeekEnd]);

  const handleDayClick = (date: Date) => {
    if (!canManageTasks) return;
    
    // If we are in reservation tabs, navigate to the list filtered by that date
    if (activeTab === 'RESERVATIONS' || activeTab === 'ALL_RESERVATIONS' || activeTab === 'ARRIVED') {
      const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setReservationSearchTerm(dateStr);
      setActiveTab('ALL_RESERVATIONS');
      setViewMode('LIST');
      return;
    }

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
              
              if (t.type === TaskType.RESERVATION && t.reservationDate) {
                const [d, m, y] = t.reservationDate.split('/').map(Number);
                const resDate = new Date(y, m - 1, d);
                return resDate.toDateString() === date.toDateString();
              }

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
      <div className="sticky top-[var(--header-h)] z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-red-900/20 px-4 pt-5 pb-4 md:px-6 shadow-sm transition-all duration-300 touch-pan-y">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 w-full sm:w-auto">
            <div className="flex items-center justify-between w-full sm:w-auto gap-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]`}></div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] leading-none">Management</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none flex items-center gap-2">
                  {activeTab === 'ANNOUNCEMENTS' ? 'Sección' : (activeTab === 'RESERVATIONS' || activeTab === 'ALL_RESERVATIONS' || activeTab === 'ARRIVED') ? 'Agenda' : 'Tareas'} 
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border shadow-sm bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30`}>
                    {activeTab === 'ACTIVE' ? 'Activas' : activeTab === 'DAILY' ? 'Diarias' : activeTab === 'ALL_RESERVATIONS' ? 'Buscador' : activeTab === 'ARRIVED' ? 'Asistieron' : activeTab === 'RESERVATIONS' ? 'Reservas Hoy' : 'Salones'}
                  </span>
                </h2>
              </div>
              
              {/* Mobile View Mode Toggle */}
              {activeTab !== 'ANNOUNCEMENTS' && (
                <div className="flex sm:hidden bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'CALENDAR' ? 'LIST' : 'CALENDAR')}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <Calendar size={18} />
                  </button>
                </div>
              )}
            </div>

            {(activeTab === 'ACTIVE' || activeTab === 'DAILY') && (
              <div className="flex bg-gray-100 dark:bg-slate-900/50 border border-gray-200/50 dark:border-slate-800 rounded-2xl p-1 gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('ACTIVE')}
                  className={`flex-1 sm:px-4 py-2.5 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all text-center whitespace-nowrap min-w-[70px] ${
                    activeTab === 'ACTIVE' 
                      ? 'bg-white dark:bg-slate-700 shadow-md text-red-600 scale-[1.02]' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                >
                  Activas
                </button>
                <button
                  onClick={() => setActiveTab('DAILY')}
                  className={`flex-1 sm:px-4 py-2.5 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all text-center whitespace-nowrap min-w-[70px] ${
                    activeTab === 'DAILY' 
                      ? 'bg-white dark:bg-slate-700 shadow-md text-red-600 scale-[1.02]' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                >
                  Diarias
                </button>
              </div>
            )}

            {(activeTab === 'RESERVATIONS' || activeTab === 'ARRIVED' || activeTab === 'ALL_RESERVATIONS') && (
              <div className="flex bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] p-1.5 gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
                <button
                  onClick={() => setActiveTab('RESERVATIONS')}
                  className={`flex-1 px-5 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all text-center whitespace-nowrap border-2 border-transparent ${
                    activeTab === 'RESERVATIONS' 
                      ? 'bg-white dark:bg-slate-700 shadow-[0_4px_12px_rgba(239,68,68,0.15)] text-red-600 dark:text-red-400 border-white' 
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setActiveTab('ARRIVED')}
                  className={`flex-1 px-5 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all text-center whitespace-nowrap border-2 border-transparent ${
                    activeTab === 'ARRIVED' 
                      ? 'bg-white dark:bg-slate-700 shadow-[0_4px_12px_rgba(239,68,68,0.15)] text-red-600 dark:text-red-400 border-white' 
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Llegaron
                </button>
                <button
                  onClick={() => setActiveTab('ALL_RESERVATIONS')}
                  className={`flex-1 px-5 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all text-center whitespace-nowrap border-2 border-transparent ${
                    activeTab === 'ALL_RESERVATIONS' 
                      ? 'bg-white dark:bg-slate-700 shadow-[0_4px_12px_rgba(239,68,68,0.15)] text-red-600 dark:text-red-400 border-white' 
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Reservas
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
            {/* Desktop View Mode Toggle */}
            {activeTab !== 'ANNOUNCEMENTS' && (
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
            )}

            {/* Only Admins or Staff with 'CAN_MANAGE_TASKS' permission can create new tasks */}
            {canManageTasks && (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    const isNews = activeTab === 'ANNOUNCEMENTS';
                    const isRes = activeTab === 'RESERVATIONS' || activeTab === 'ALL_RESERVATIONS' || activeTab === 'ARRIVED';
                    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    setEditingTask({
                      type: isNews ? TaskType.ANNOUNCEMENT : isRes ? TaskType.RESERVATION : TaskType.TASK,
                      location: (isNews || isRes) ? activeLocation : undefined,
                      reservationDate: isRes ? todayStr : undefined,
                      recurrence: activeTab === 'DAILY' ? TaskRecurrence.DAILY : TaskRecurrence.NONE,
                      priority: TaskPriority.MEDIUM
                    });
                    setSelectedImages([]);
                    setPreviews([]);
                    setShowTaskModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 shadow-md"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>{activeTab === 'ANNOUNCEMENTS' ? 'Publicar' : (activeTab === 'RESERVATIONS' || activeTab === 'ALL_RESERVATIONS') ? 'Nueva Reserva' : 'Nueva Tarea'}</span>
                </button>

                {activeTab === 'ARRIVED' && currentUser.role === UserRole.ADMIN && allTasks.some(t => t.type === TaskType.RESERVATION && t.clientArrived) && (
                  <button 
                    onClick={() => {
                      if (!showClearServiceConfirm) {
                        setShowClearServiceConfirm(true);
                        setTimeout(() => setShowClearServiceConfirm(false), 3000);
                      } else {
                        handleClearArrived();
                        setShowClearServiceConfirm(false);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 border ${
                      showClearServiceConfirm 
                        ? 'bg-red-600 text-white border-red-700 shadow-lg' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30'
                    } text-[10px] font-black uppercase tracking-wider`}
                  >
                    {showClearServiceConfirm ? <Check size={12} strokeWidth={3} /> : <Trash2 size={12} />}
                    <span>{showClearServiceConfirm ? '¿Confirmar?' : 'Limpieza Servicio'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters and Week Navigation inside sticky header */}
        {activeTab !== 'ANNOUNCEMENTS' && activeTab !== 'RESERVATIONS' && activeTab !== 'ARRIVED' && activeTab !== 'ALL_RESERVATIONS' && (
          <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-xl font-bold text-xs bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm appearance-none text-center"
                >
                  <option value="ALL">Estados</option>
                  <option value={TaskStatus.PENDING}>Pendientes</option>
                  <option value={TaskStatus.IN_PROGRESS}>En Curso</option>
                  <option value={TaskStatus.COMPLETED}>Completadas</option>
                </select>

                <select 
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-xl font-bold text-xs bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm appearance-none text-center"
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
        )}
         {/* Global Reservations Search inside sticky header */}
        {activeTab === 'ALL_RESERVATIONS' && (
          <div className="flex mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <Search size={16} className="text-red-500" />
              </div>
              <input
                type="text"
                placeholder="BUSCAR CLIENTE, MESA O FECHA..."
                value={reservationSearchTerm}
                onChange={(e) => setReservationSearchTerm(e.target.value)}
                className="w-full pl-12 pr-10 py-2.5 rounded-2xl font-black text-[10px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 uppercase tracking-tighter transition-all"
              />
              {reservationSearchTerm && (
                <button
                  onClick={() => setReservationSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full hover:bg-slate-300 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sticky Location Tabs for Reservations & Announcements */}
        {(activeTab === 'RESERVATIONS' || activeTab === 'ARRIVED' || activeTab === 'ALL_RESERVATIONS' || activeTab === 'ANNOUNCEMENTS') && (
          <div className="flex overflow-x-auto no-scrollbar gap-3 pt-2 pb-3 px-1 scroll-smooth">
            {[
              { id: 'restaurante', label: 'Restaurante', color: 'bg-emerald-500', activeClass: 'bg-[#064E3B] border-[#064E3B]' },
              { id: 'gastro_bar', label: 'Gastro Bar', color: 'bg-rose-500', activeClass: 'bg-rose-900 border-rose-900' },
              { id: 'cafeteria', label: 'Cafetería', color: 'bg-orange-500', activeClass: 'bg-orange-900 border-orange-900' },
              { id: 'salon_c', label: 'Salón C', color: 'bg-purple-500', activeClass: 'bg-purple-900 border-purple-900' },
              { id: 'terraza', label: 'Terraza', color: 'bg-blue-500', activeClass: 'bg-blue-900 border-blue-900' },
              { id: 'eventos', label: 'Eventos', color: 'bg-amber-500', activeClass: 'bg-amber-900 border-amber-900' },
              { id: 'piscina', label: 'Piscina', color: 'bg-cyan-500', activeClass: 'bg-cyan-900 border-cyan-900' }
            ].map((loc) => {
              const count = getReservationCount(loc.id);
              const isActive = activeLocation === loc.id;
              
              const hasShowcase = activeTab === 'ANNOUNCEMENTS' && allTasks.some(t => 
                t.type === TaskType.ANNOUNCEMENT && 
                t.location === loc.id &&
                ((t.videoUrls && t.videoUrls.length > 0) || (t.imageUrls && t.imageUrls.length > 0))
              );
              
              return (
                <button
                  key={loc.id}
                  onClick={() => setActiveLocation(loc.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border-2 relative shadow-lg ${
                    isActive
                      ? `${loc.activeClass} text-white shadow-[0_10px_20px_rgba(0,0,0,0.15)] scale-[1.03] z-10 border-white/20`
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-red-500 hover:text-red-600 transition-colors'
                  }`}
                >
                  {hasShowcase && (
                    <div className="absolute -top-1 -left-1 bg-gradient-to-br from-red-600 to-red-800 text-white p-1.5 rounded-full border border-white dark:border-slate-800 shadow-[0_4px_12px_rgba(220,38,38,0.5)] animate-bounce" title="Showcase publicado">
                      <Sparkles size={10} className="fill-white" />
                    </div>
                  )}
                  {count > 0 && (activeTab === 'RESERVATIONS' || activeTab === 'ARRIVED' || activeTab === 'ALL_RESERVATIONS') && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-800 shadow-[0_4px_12px_rgba(220,38,38,0.4)] animate-pulse">
                      {count}
                    </span>
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : loc.color}`}></div>
                  {loc.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Reservation Compact Banner Info */}
        {(activeTab === 'RESERVATIONS' || activeTab === 'ARRIVED' || activeTab === 'ALL_RESERVATIONS') && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[2rem] text-white shadow-2xl overflow-hidden relative group border-2 border-white/10 bg-gradient-to-br from-red-600 via-red-700 to-red-900 shadow-red-900/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-[40px] translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-3xl border border-white/20 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <ConciergeBell size={24} className="text-white drop-shadow-md" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none mb-1 shadow-sm">Agenda {activeLocation}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <p className="text-[11px] text-white/80 font-black uppercase tracking-[0.25em]">Reservas & Clientes Premier</p>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10 uppercase tracking-widest">Reserva Confirmada</span>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest text-right">Servicio de Excelencia</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Gestor de Salones Banner Compact */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-700 via-red-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden group border-2 border-white/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-500/10 rounded-full blur-[40px] translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-3xl border border-white/20 shadow-2xl scale-95 group-hover:scale-100 transition-transform duration-500 ease-out">
                  <LayoutDashboard size={24} className="text-white drop-shadow-md" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none mb-1">Gestor de Salones</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    <p className="text-[11px] text-red-100/80 font-black uppercase tracking-[0.25em]">Comunicación de Montajes & Eventos</p>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10 uppercase tracking-widest">Eventos & Protocolo</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION: TASKS (HIGH IMPACT ACTION STYLE) */}
        {viewMode === 'LIST' ? (
          <div className={activeTab === 'RESERVATIONS' || activeTab === 'ALL_RESERVATIONS' || activeTab === 'ARRIVED' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-6'}>
            {listTasks.length === 0 ? (
              <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-dashed border-gray-200 dark:border-slate-800 shadow-inner">
                {activeTab === 'ANNOUNCEMENTS' ? <Megaphone size={80} className="mx-auto mb-6 text-red-200 dark:text-red-900/30" /> : <ClipboardCheck size={80} className="mx-auto mb-6 text-gray-300 dark:text-slate-700" />}
                <p className="text-3xl font-black text-gray-400 dark:text-slate-600 uppercase tracking-tighter">
                  {activeTab === 'ACTIVE' ? 'Sin Tareas Activas' : 
                   activeTab === 'DAILY' ? 'Sin Tareas Diarias' : 
                   activeTab === 'ARRIVED' ? 'Nadie ha llegado todavía' : 
                   activeTab === 'RESERVATIONS' ? 'Agenda de hoy completada' :
                   activeTab === 'ALL_RESERVATIONS' ? 'No hay reservas' :
                   `Sin Publicaciones en ${activeLocation}`}
                </p>
                <p className="text-gray-400 dark:text-slate-500 font-medium mt-2">
                  {activeTab === 'ACTIVE' ? '¡Todo al día en esta semana!' : 
                   activeTab === 'DAILY' ? 'No hay rutinas diarias configuradas.' : 
                   activeTab === 'ARRIVED' ? 'Las reservas marcadas como "Llegó" aparecerán aquí.' : 
                   activeTab === 'RESERVATIONS' ? `No hay reservas próximas para ${activeLocation}.` :
                   activeTab === 'ALL_RESERVATIONS' ? 'Intenta usar el buscador integrado.' :
                   'Aquí aparecerán los anuncios importantes.'}
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
                    onToggleArrival={handleToggleArrival}
                    onNoShow={handleMarkAsNoShow}
                    onView={(t) => setViewingTask(t)}
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
                  {editingTask?.id 
                    ? (editingTask.type === TaskType.ANNOUNCEMENT ? 'Editar Anuncio' : editingTask.type === TaskType.RESERVATION ? 'Editar Reserva' : 'Editar Tarea')
                    : (editingTask?.type === TaskType.ANNOUNCEMENT ? 'Publicar' : editingTask?.type === TaskType.RESERVATION ? 'Nueva Reserva' : 'Nueva Tarea')
                  }
                </h3>
                <button onClick={() => setShowTaskModal(false)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-red-600 transition-colors">
                  <X size={24} strokeWidth={2.5} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      {editingTask?.type === TaskType.RESERVATION ? 'Nombre de la Reserva / Cliente' : 'Título de la Publicación'}
                    </label>
                   <input 
                     disabled={!canManageTasks}
                     value={editingTask?.title || ''}
                     onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                     className="w-full px-5 py-4 text-xl font-black bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white placeholder-gray-400"
                     placeholder={editingTask?.type === TaskType.RESERVATION ? "EJ. FAMILIA GARCÍA" : "¿QUÉ HAY QUE HACER?"}
                     autoFocus
                   />
                </div>

                {/* Type Switcher for Gestor de Salones Tab */}
                {activeTab === 'ANNOUNCEMENTS' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría de Registro (Gestor)</label>
                    <div className="flex bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-1.5 gap-1 shadow-sm">
                      {[
                        { val: TaskType.ANNOUNCEMENT, label: 'Showcase / Montaje', icon: Megaphone }
                      ].map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setEditingTask({ ...editingTask, type: t.val })}
                          className={`flex-1 py-3 px-1 rounded-xl transition-all flex flex-col items-center gap-1 ${
                            (editingTask?.type || TaskType.ANNOUNCEMENT) === t.val 
                              ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white scale-105 z-10' 
                              : 'text-gray-400 dark:text-gray-500 hover:bg-white/20'
                          }`}
                        >
                          <t.icon size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                         {editingTask?.type === TaskType.ANNOUNCEMENT || editingTask?.type === TaskType.RESERVATION ? 'Espacio Seleccionado' : 'Departamento'}
                       </label>
                       {editingTask?.type === TaskType.ANNOUNCEMENT || editingTask?.type === TaskType.RESERVATION ? (
                         <div className="relative">
                           <select 
                             disabled={!canManageTasks}
                             value={editingTask?.location || 'restaurante'}
                             onChange={e => setEditingTask({ ...editingTask as any, location: e.target.value })}
                             className="w-full pl-4 pr-10 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none appearance-none dark:text-white text-sm uppercase tracking-wider"
                           >
                             {[
                               { id: 'restaurante', label: 'Restaurante' },
                               { id: 'gastro_bar', label: 'Gastro Bar' },
                               { id: 'cafeteria', label: 'Cafetería' },
                               { id: 'salon_c', label: 'Salón C' },
                               { id: 'terraza', label: 'Terraza' },
                               { id: 'eventos', label: 'Eventos' },
                               { id: 'piscina', label: 'Piscina' }
                             ].map((loc) => (
                               <option key={loc.id} value={loc.id}>{loc.label}</option>
                             ))}
                           </select>
                           <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                         </div>
                       ) : (
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
                       )}
                    </div>
                    {editingTask?.type !== TaskType.RESERVATION && (
                      <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Prioridad</label>
                       <div className="flex bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-1.5 gap-1">
                         {[
                           { val: TaskPriority.LOW, label: 'Baja', color: 'bg-blue-600 text-white' },
                           { val: TaskPriority.MEDIUM, label: 'Normal', color: 'bg-indigo-600 text-white' },
                           { val: TaskPriority.HIGH, label: 'Urgente', color: 'bg-red-600 text-white' }
                         ].map((p) => (
                           <button
                             key={p.val}
                             type="button"
                             onClick={() => setEditingTask({ ...editingTask, priority: p.val })}
                             className={`flex-1 py-4 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                               (editingTask?.priority || TaskPriority.MEDIUM) === p.val 
                                 ? p.color + ' shadow-lg scale-[1.05] z-10' 
                                 : 'text-gray-400 dark:text-gray-500 hover:bg-white/20'
                             }`}
                           >
                             {p.label}
                           </button>
                         ))}
                       </div>
                      </div>
                    )}
                 </div>



                {/* Recurrence Field - Hide for announcements and reservations */}
                {currentUser.role === UserRole.ADMIN && editingTask?.type !== TaskType.ANNOUNCEMENT && editingTask?.type !== TaskType.RESERVATION && (
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Frecuencia / Repetición</label>
                     <div className="flex bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-1.5 gap-1 shadow-sm">
                       {[
                         { val: TaskRecurrence.NONE, label: 'Única', desc: 'Una vez' },
                         { val: TaskRecurrence.DAILY, label: 'Diaria', desc: 'Se reinicia' }
                       ].map((r) => (
                         <button
                           key={r.val}
                           type="button"
                           onClick={() => setEditingTask({ ...editingTask, recurrence: r.val })}
                           className={`flex-1 py-3 px-1 rounded-xl transition-all flex flex-col items-center ${
                             (editingTask?.recurrence || TaskRecurrence.NONE) === r.val 
                               ? 'bg-red-600 shadow-lg shadow-red-600/30 text-white scale-105 z-10' 
                               : 'text-gray-400 dark:text-gray-500 hover:bg-white/30'
                           }`}
                         >
                           <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                           <span className="text-[8px] font-bold opacity-60">{r.desc}</span>
                         </button>
                       ))}
                     </div>
                  </div>
                )}

                {/* Compact Reservation Form */}
                {editingTask?.type === TaskType.RESERVATION && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-indigo-50/20 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <div className="col-span-2">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Cliente</label>
                      <div className="relative">
                        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="text"
                          value={editingTask?.title || ''}
                          onChange={e => setEditingTask({ ...editingTask as any, title: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                          placeholder="Nombre completo"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="tel"
                          value={editingTask?.clientPhone || ''}
                          onChange={e => setEditingTask({ ...editingTask as any, clientPhone: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                          placeholder="Móvil"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Comensales</label>
                      <div className="relative">
                        <ConciergeBell className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="number"
                          value={editingTask?.guests ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setEditingTask({ ...editingTask as any, guests: val === '' ? undefined : parseInt(val) || 0 });
                          }}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                          placeholder="Nº"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Fecha</label>
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <input 
                            type="text"
                            placeholder="DD"
                            maxLength={2}
                            value={(editingTask?.reservationDate || '').split('/')[0] || ''}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              const parts = (editingTask?.reservationDate || '').split('/');
                              const d = val;
                              const m = parts[1] || '';
                              const y = parts[2] || '';
                              setEditingTask({ ...editingTask as any, reservationDate: `${d}/${m}/${y}` });
                              if (val.length === 2) {
                                const nextDiv = e.target.closest('.relative')?.nextElementSibling?.nextElementSibling;
                                (nextDiv?.querySelector('input') as HTMLInputElement | null)?.focus();
                              }
                            }}
                            className="w-full px-2 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white text-center"
                          />
                        </div>
                        <span className="text-indigo-300 dark:text-indigo-700 font-bold self-center">/</span>
                        <div className="relative flex-1">
                          <input 
                            type="text"
                            placeholder="MM"
                            maxLength={2}
                            value={(editingTask?.reservationDate || '').split('/')[1] || ''}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              const parts = (editingTask?.reservationDate || '').split('/');
                              const d = parts[0] || '';
                              const m = val;
                              const y = parts[2] || '';
                              setEditingTask({ ...editingTask as any, reservationDate: `${d}/${m}/${y}` });
                              if (val.length === 2) {
                                const nextDiv = e.target.closest('.relative')?.nextElementSibling?.nextElementSibling;
                                (nextDiv?.querySelector('input') as HTMLInputElement | null)?.focus();
                              }
                            }}
                            className="w-full px-2 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white text-center"
                          />
                        </div>
                        <span className="text-indigo-300 dark:text-indigo-700 font-bold self-center">/</span>
                        <div className="relative flex-[1.5]">
                          <input 
                            type="text"
                            placeholder="AAAA"
                            maxLength={4}
                            value={(editingTask?.reservationDate || '').split('/')[2] || ''}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              const parts = (editingTask?.reservationDate || '').split('/');
                              const d = parts[0] || '';
                              const m = parts[1] || '';
                              const y = val;
                              setEditingTask({ ...editingTask as any, reservationDate: `${d}/${m}/${y}` });
                            }}
                            className="w-full px-2 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="time"
                          value={editingTask?.reservationTime || ''}
                          onChange={e => setEditingTask({ ...editingTask as any, reservationTime: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Mesa</label>
                      <div className="relative">
                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="text"
                          value={editingTask?.tableNumber || ''}
                          onChange={e => setEditingTask({ ...editingTask as any, tableNumber: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                          placeholder="Ej: 12"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Evento</label>
                      <div className="relative">
                        <select 
                          value={editingTask?.eventType || 'COMIDA'}
                          onChange={e => setEditingTask({ ...editingTask as any, eventType: e.target.value })}
                          className="w-full pl-2 pr-6 py-2 font-bold bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg appearance-none dark:text-white text-[10px]"
                        >
                          {['COMIDA', 'CENA', 'CUMPLE', 'COMUNION', 'BODA', 'OTRO'].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={12} />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] mb-1 ml-1">Reserva tomada por</label>
                      <div className="relative">
                        <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                        <input 
                          type="text"
                          value={editingTask?.takenBy || ''}
                          onChange={e => setEditingTask({ ...editingTask as any, takenBy: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 font-bold text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 focus:border-indigo-500 outline-none rounded-lg dark:text-white"
                          placeholder="Firma / Nombre"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                        {editingTask?.type === TaskType.RESERVATION ? 'Notas / Intolerancias / Alergias' : 'Descripción (Opcional)'}
                      </label>
                      
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
                     onChange={e => setEditingTask({ ...editingTask as any, description: e.target.value })}
                     className="w-full px-5 py-4 font-bold text-base bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all min-h-[140px] dark:text-white placeholder-gray-400 resize-none"
                     placeholder="Instrucciones detalladas..."
                   />
                   <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5 ml-1">
                     <Info size={12} />
                     <span>Tip: Usa <span className="text-red-500 font-mono bg-red-50 dark:bg-red-900/20 px-1 rounded">*asteriscos*</span> para marcar texto urgente.</span>
                   </p>
                </div>

                {/* Checklist Input */}
                {editingTask?.type !== TaskType.ANNOUNCEMENT && editingTask?.type !== TaskType.RESERVATION && (
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
                )}

                 {/* Images and Videos - Hide for reservations */}
                 {editingTask?.type !== TaskType.RESERVATION && (
                   <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Imágenes y Videos</label>
                     <div className="flex gap-3 overflow-x-auto pb-4 w-full snap-x no-scrollbar">
                        {/* BUTTON 1: CAMERA (Forced Environment Capture) */}
                        <button 
                          onClick={() => cameraInputRef.current?.click()}
                          className="relative overflow-hidden w-24 h-24 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-white shadow-[0_10px_25px_-5px_rgba(220,38,38,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all flex-shrink-0 group bg-[linear-gradient(110deg,#dc2626,45%,#fbbf24,55%,#dc2626)] bg-[length:200%_100%] animate-shine"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none opacity-40" />
                          <Camera size={28} className="group-hover:scale-110 transition-transform relative z-10 filter drop-shadow-md" />
                          <span className="text-[10px] font-black mt-1 uppercase tracking-wide relative z-10 drop-shadow-md">FOTO</span>
                        </button>

                        {/* BUTTON 2: GALLERY (File Picker) */}
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex-shrink-0 group"
                        >
                          <Image size={28} className="group-hover:scale-110 transition-transform"/>
                          <span className="text-[10px] font-black mt-1 uppercase tracking-wide">GALERÍA</span>
                        </button>

                        {/* BUTTON 3: VIDEO (Cloudinary) */}
                        <button 
                          onClick={() => videoInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all flex-shrink-0 group"
                        >
                          <Video size={28} className="group-hover:scale-110 transition-transform"/>
                          <span className="text-[10px] font-black mt-1 uppercase tracking-wide">VIDEO</span>
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

                        {/* Hidden Input for VIDEO */}
                        <input 
                          type="file" 
                          ref={videoInputRef} 
                          onChange={handleVideoSelect} 
                          className="hidden" 
                          accept="video/*,video/quicktime,.mov"
                        />
                        
                        {/* Existing Images (Edit Mode) */}
                        {editingTask?.imageUrls?.map((url, i) => (
                          <div key={`existing-${i}`} className="relative w-24 h-24 flex-shrink-0 group">
                             <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-gray-200 dark:border-slate-700" />
                             <button
                               onClick={() => {
                                 const newUrls = (editingTask.imageUrls || []).filter((_, index) => index !== i);
                                 setEditingTask({ ...editingTask, imageUrls: newUrls });
                               }}
                               className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
                             >
                                <X size={14} strokeWidth={3} />
                             </button>
                             <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-1 rounded-b-[14px]">Ima.</span>
                          </div>
                        ))}

                        {/* Existing Videos (Cloudinary) */}
                        {editingTask?.videoUrls?.map((url, i) => (
                          <div key={`existing-video-${i}`} className="relative w-16 h-24 flex-shrink-0 group">
                             <video src={`${url}#t=0.001`} preload="metadata" playsInline className="w-full h-full object-cover rounded-2xl border-2 border-indigo-500" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <Video size={20} className="text-white drop-shadow-md" />
                             </div>
                             <button
                               onClick={() => {
                                 const newUrls = (editingTask.videoUrls || []).filter((_, index) => index !== i);
                                 setEditingTask({ ...editingTask, videoUrls: newUrls });
                               }}
                               className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
                             >
                                <X size={14} strokeWidth={3} />
                             </button>
                             <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-1 rounded-b-[14px]">Vid.</span>
                          </div>
                        ))}

                        {/* New Preview Images */}
                        {previews.map((url, i) => (
                          <div key={`new-${i}`} className="relative w-24 h-24 flex-shrink-0 group">
                             <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-red-500 shadow-md" />
                             <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"><X size={14} strokeWidth={3} /></button>
                          </div>
                        ))}

                        {/* New Preview Videos */}
                        {videoPreviews.map((url, i) => (
                          <div key={`new-video-${i}`} className="relative w-16 h-24 flex-shrink-0 group">
                             <video 
                               src={`${url}#t=0.001`} 
                               className="w-full h-full object-cover rounded-2xl border-2 border-orange-500 shadow-md" 
                               preload="metadata"
                               playsInline
                               muted
                             />
                             <button onClick={() => removeVideo(i)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"><X size={14} strokeWidth={3} /></button>
                          </div>
                        ))}
                     </div>
                   </div>
                 )}

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
                    {isSaving ? 'Guardando...' : isCompressing ? 'Procesando...' : editingTask?.type === TaskType.ANNOUNCEMENT ? 'PUBLICAR ANUNCIO' : editingTask?.type === TaskType.RESERVATION ? 'PUBLICAR RESERVA' : 'PUBLICAR TAREA'}
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
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight">
              ¿Eliminar {taskToDelete.type === TaskType.RESERVATION ? 'Reserva' : taskToDelete.type === TaskType.ANNOUNCEMENT ? 'Publicación' : 'Tarea'}?
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6 font-bold text-lg">Esta acción es permanente y los datos desaparecerán para siempre. ¿Estás seguro?</p>
            
            {taskToDelete.type === TaskType.ANNOUNCEMENT && (
              <div className="mb-6">
                <input 
                  type="password" 
                  placeholder="Contraseña de seguridad" 
                  className="w-full p-4 border-2 border-red-100 dark:border-red-900/30 rounded-2xl bg-gray-50 dark:bg-slate-900 font-bold text-center text-red-600 focus:border-red-500 outline-none transition-all"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => { setTaskToDelete(null); setDeletePassword(''); }} className="flex-1 py-4 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button 
                onClick={handleDeleteTask} 
                className="flex-1 py-4 font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 shadow-lg shadow-button-red transition-all disabled:opacity-50"
                disabled={taskToDelete.type === TaskType.ANNOUNCEMENT && !deletePassword}
              >
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-2 border-gray-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-500 shadow-inner">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight">¿Limpiar Todo?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8 font-bold text-lg">
              Vas a eliminar <span className="text-red-600 dark:text-red-400 font-black">{reservationCount}</span> reservas permanentemente. 
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-4">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-4 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-2xl hover:bg-gray-200 transition-colors">CANCELAR</button>
              <button 
                onClick={handleClearAllReservations} 
                className="flex-1 py-4 font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'LIMPIAR'}
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

      {viewingTask && viewingTask.type === TaskType.RESERVATION && (
        <ReservationViewModal task={viewingTask} onClose={() => setViewingTask(null)} />
      )}

      {/* Floating Action Button for Mobile removed for cleaner UI */}

    </div>
  );
};

export default Tasks;