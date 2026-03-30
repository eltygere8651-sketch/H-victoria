import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment, TaskChecklistItem, Reservation, Table, Room, RoomElement } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, MessagesSquare, Check, Camera, AlertTriangle, Share2, Send, Image, Info, Flame, Bold, Calendar, Clock, List, FileText, Zap, Users, Phone, Hash, LayoutGrid, Map as MapIcon, ChevronRight, User as UserIcon, RotateCcw, Edit3, Move, Maximize, Minimize, Square, Circle, Type, Upload, Settings, DoorOpen, Grid, Tag } from 'lucide-react';
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
}

const Tasks: React.FC<TasksProps> = ({ currentUser }) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  
  const [showTaskModal, setShowTaskModal] = useState(false);
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

  // --- Salones / Reservations State ---
  const [activeTab, setActiveTab] = useState<'TASKS' | 'SALONES'>('TASKS');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Partial<Reservation> | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedElementType, setSelectedElementType] = useState<'WALL' | 'TEXT' | 'DOOR' | 'WINDOW' | 'AREA_LABEL' | null>(null);
  const [editingElement, setEditingElement] = useState<RoomElement | null>(null);
  const [dragStartElement, setDragStartElement] = useState<{ x: number, y: number, elementX: number, elementY: number } | null>(null);
  const [resizeStartElement, setResizeStartElement] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, tableX: number, tableY: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
  const [isUploadingPlan, setIsUploadingPlan] = useState(false);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
  const activeRoom = rooms.find(r => r.id === activeRoomId);

  // Permission Check
  const canManageTasks = currentUser.role === UserRole.ADMIN || 
                         (currentUser.role === UserRole.STAFF && currentUser.permissions?.includes('CAN_MANAGE_TASKS'));

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((tasks) => {
      setAllTasks(tasks);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments(setDepartments);
    const unsubscribeRooms = storageService.subscribeToRooms((rooms) => {
      setRooms(rooms);
      if (rooms.length > 0 && !activeRoomId) {
        setActiveRoomId(rooms[0].id);
      }
    });

    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
      unsubscribeRooms();
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (activeRoomId) {
      const unsubscribeTables = storageService.subscribeToTables(setTables, activeRoomId);
      const unsubscribeReservations = storageService.subscribeToReservations(setReservations, activeRoomId);
      return () => {
        unsubscribeTables();
        unsubscribeReservations();
      };
    }
  }, [activeRoomId]);

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
        // Default to TASK type
        type: TaskType.TASK, 
        createdBy: editingTask.createdBy || currentUser.name,
        createdById: editingTask.createdById || currentUser.id,
        createdAt: editingTask.createdAt || Date.now(),
      };

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

  const handleToggleChecklistItem = useCallback(async (taskId: string, itemIndex: number, currentChecklist: TaskChecklistItem[]) => {
    const updatedChecklist = [...currentChecklist];
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
    const updateData: any = { id: taskId, checklist: updatedChecklist };
    
    if (allCompleted && updatedChecklist.length > 0) {
      updateData.status = TaskStatus.COMPLETED;
      updateData.completedBy = currentUser.name;
      updateData.completedAt = Date.now();
    }

    await storageService.saveTask(updateData);
  }, [currentUser.name]);

  const handleStartTask = useCallback(async (taskId: string) => {
    await storageService.saveTask({ id: taskId, status: TaskStatus.IN_PROGRESS });
  }, []);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    await storageService.saveTask({ id: taskId, status: TaskStatus.COMPLETED, completedBy: currentUser.name, completedAt: Date.now() });
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

  // --- Salones Handlers ---
  const handleSaveRoom = async () => {
    if (!editingRoom?.name) return;
    try {
      await storageService.saveRoom(editingRoom);
      setShowRoomModal(false);
      setEditingRoom(null);
    } catch (error) {
      console.error(error);
      alert('Error al guardar el salón');
    }
  };

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && activeRoomId) {
      setIsUploadingPlan(true);
      try {
        const url = await storageService.uploadFloorPlan(e.target.files[0]);
        await storageService.saveRoom({ id: activeRoomId, floorPlanUrl: url });
      } catch (error) {
        console.error(error);
        alert('Error al subir el plano');
      } finally {
        setIsUploadingPlan(false);
      }
    }
  };

  const handleAddElement = async (type: RoomElement['type']) => {
    if (!activeRoomId || !activeRoom) return;
    const newElement: RoomElement = {
      id: Date.now().toString(),
      type,
      x: 45,
      y: 45,
      width: type === 'WALL' ? 10 : type === 'DOOR' || type === 'WINDOW' ? 5 : undefined,
      height: type === 'WALL' ? 1 : type === 'DOOR' || type === 'WINDOW' ? 5 : undefined,
      text: type === 'TEXT' || type === 'AREA_LABEL' ? 'Nuevo Texto' : undefined,
      fontSize: type === 'TEXT' || type === 'AREA_LABEL' ? 14 : undefined,
      color: '#000000'
    };
    
    const updatedElements = [...(activeRoom.elements || []), newElement];
    await storageService.saveRoom({ id: activeRoomId, elements: updatedElements });
  };

  const handleElementDragStart = (e: React.MouseEvent, element: RoomElement) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    setEditingElement(element);
    setDragStartElement({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y
    });
  };

  const handleElementResizeStart = (e: React.MouseEvent, element: RoomElement) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingElement(element);
    setResizeStartElement({
      x: e.clientX,
      y: e.clientY,
      width: element.width || 0,
      height: element.height || 0
    });
  };

  const handleAddTable = async () => {
    if (!activeRoomId) return;
    const newTable: Partial<Table> = {
      roomId: activeRoomId,
      number: (tables.length + 1).toString(),
      capacity: 4,
      status: 'AVAILABLE',
      x: 40,
      y: 40,
      width: 15,
      height: 15,
      shape: 'RECTANGLE'
    };
    await storageService.saveTable(newTable);
  };

  const handleTableDragStart = (e: React.MouseEvent, table: Table) => {
    if (!isEditMode) return;
    e.preventDefault();
    setEditingTable(table);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      tableX: table.x,
      tableY: table.y
    });
  };

  const handleTableResizeStart = (e: React.MouseEvent, table: Table) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingTable(table);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: table.width,
      height: table.height
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();

    if (isEditMode && editingTable) {
      if (dragStart) {
        const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
        
        const newX = Math.max(0, Math.min(100 - editingTable.width, dragStart.tableX + deltaX));
        const newY = Math.max(0, Math.min(100 - editingTable.height, dragStart.tableY + deltaY));
        
        setEditingTable({ ...editingTable, x: newX, y: newY });
      }

      if (resizeStart) {
        const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;
        
        const newWidth = Math.max(5, Math.min(50, resizeStart.width + deltaX));
        const newHeight = Math.max(5, Math.min(50, resizeStart.height + deltaY));
        
        setEditingTable({ ...editingTable, width: newWidth, height: newHeight });
      }
    }

    if (isDrawingMode && editingElement) {
      if (dragStartElement) {
        const deltaX = ((e.clientX - dragStartElement.x) / rect.width) * 100;
        const deltaY = ((e.clientY - dragStartElement.y) / rect.height) * 100;
        
        const newX = Math.max(0, Math.min(100 - (editingElement.width || 0), dragStartElement.elementX + deltaX));
        const newY = Math.max(0, Math.min(100 - (editingElement.height || 0), dragStartElement.elementY + deltaY));
        
        setEditingElement({ ...editingElement, x: newX, y: newY });
      }

      if (resizeStartElement) {
        const deltaX = ((e.clientX - resizeStartElement.x) / rect.width) * 100;
        const deltaY = ((e.clientY - resizeStartElement.y) / rect.height) * 100;
        
        const newWidth = Math.max(1, Math.min(100, resizeStartElement.width + deltaX));
        const newHeight = Math.max(1, Math.min(100, resizeStartElement.height + deltaY));
        
        setEditingElement({ ...editingElement, width: newWidth, height: newHeight });
      }
    }
  };

  const handleMouseUp = async () => {
    if (editingTable && (dragStart || resizeStart)) {
      await storageService.saveTable(editingTable);
    }
    
    if (editingElement && (dragStartElement || resizeStartElement) && activeRoomId && activeRoom) {
      const updatedElements = activeRoom.elements?.map((el: RoomElement) => el.id === editingElement.id ? editingElement : el) || [];
      await storageService.saveRoom({ id: activeRoomId, elements: updatedElements });
    }

    setDragStart(null);
    setResizeStart(null);
    setEditingTable(null);
    setDragStartElement(null);
    setResizeStartElement(null);
    setEditingElement(null);
  };

  const handleDeleteElement = async (elementId: string) => {
    if (!activeRoomId || !activeRoom) return;
    const updatedElements = activeRoom.elements?.filter(el => el.id !== elementId) || [];
    await storageService.saveRoom({ id: activeRoomId, elements: updatedElements });
  };

  const handleElementTextChange = async (elementId: string, newText: string) => {
    if (!activeRoomId || !activeRoom) return;
    const updatedElements = activeRoom.elements?.map(el => 
      el.id === elementId ? { ...el, text: newText } : el
    ) || [];
    await storageService.saveRoom({ id: activeRoomId, elements: updatedElements });
  };

  const handleSaveReservation = async () => {
    if (!editingReservation?.clientName || !editingReservation?.tableId || !activeRoomId) {
      alert('Nombre del cliente y mesa son obligatorios');
      return;
    }

    try {
      const table = tables.find(t => t.id === editingReservation.tableId);
      const resData: Partial<Reservation> = {
        ...editingReservation,
        roomId: activeRoomId,
        tableNumber: table?.number || '',
        createdBy: currentUser.name,
        status: editingReservation.status || 'PENDING',
        startTime: editingReservation.startTime || Date.now(),
      };

      await storageService.saveReservation(resData);
      setShowReservationModal(false);
      setEditingReservation(null);
    } catch (error) {
      console.error(error);
      alert('Error al guardar la reserva');
    }
  };

  const handleDeleteReservation = async (id: string, tableId?: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta reserva?')) {
      await storageService.deleteReservation(id, tableId);
    }
  };

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

  const filteredTasks = allTasks.filter(task => {
    const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
    const deptMatch = departmentFilter === 'ALL' || task.departmentId === departmentFilter;
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

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const listTasks = filteredTasks.filter(t => {
    // Assign each task to exactly one week based on its most relevant date
    const taskDate = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
    return taskDate >= currentWeekStart && taskDate <= currentWeekEnd;
  });

  const generateRandomHospitalityTask = async () => {
    const titles = [
      "Limpieza profunda de habitación VIP",
      "Revisión de stock en cámara frigorífica",
      "Mantenimiento preventivo A/C",
      "Montaje de salón para evento",
      "Inventario de cristalería y loza",
      "Preparación de mise en place",
      "Atención queja de ruido (Hab. 412)",
      "Recepción de pedido de bebidas",
      "Limpieza de filtros de campana",
      "Cierre de caja y auditoría",
      "Revisión de caducidades (FIFO)",
      "Desinfección de baños zona común",
      "Preparación de coffee break",
      "Revisión de luces de emergencia",
      "Limpieza de terraza y mobiliario"
    ];

    const descriptions = [
      "Por favor, realizar esta tarea lo antes posible. Es importante para el turno actual.",
      "El cliente lo ha solicitado con urgencia. *Asegurarse* de dejar todo impecable y reportar cualquier anomalía.",
      "Tarea rutinaria de fin de turno. Revisar bien todos los puntos. Si falta algún material, notificar a compras inmediatamente. *No olvidar* firmar el registro al terminar.",
      "Atención: *Urgente*. Hay un evento especial hoy y esto debe estar listo antes de las 18:00. Coordinar con el resto del equipo si es necesario.",
      "Revisión estándar. Seguir el protocolo habitual de hostelería y marcar los checks según se avance.",
      "Revisar detalladamente. *Cuidado* con los productos frágiles. Anotar cualquier merma en el sistema.",
      "Esta tarea es prioritaria para la apertura. Asegurarse de que todo el equipo esté informado."
    ];

    const checklistPools = [
      // Pisos / Habitaciones
      ["Cambiar sábanas", "Desinfectar baño", "Reponer amenities (jabón, champú)", "Aspirar alfombra", "Revisar minibar y reponer", "Comprobar luces y TV", "Limpiar cristales"],
      // Bar / Restaurante
      ["Limpiar máquina de café", "Rellenar molinillo", "Contar fondo de caja", "Limpiar mesas y sillas", "Tirar basura y reciclar vidrio", "Repasar cubiertos", "Rellenar saleros y pimenteros"],
      // Mantenimiento
      ["Revisar filtros de aire", "Comprobar presión de agua", "Anotar lecturas de contadores", "Limpiar zona de trabajo", "Reportar piezas rotas", "Revisar extintores", "Cambiar bombillas fundidas"],
      // Cocina
      ["Etiquetar mermas del día", "Desengrasar plancha", "Barrer y fregar cuarto frío", "Desinfectar tablas de cortar", "Revisar caducidades", "Limpiar freidoras", "Organizar cámara de verduras"],
      // Eventos / Recepción
      ["Preparar proyector y audio", "Colocar mantelería", "Distribuir sillas (formato escuela)", "Preparar estación de agua", "Revisar climatización del salón", "Imprimir listado de asistentes"]
    ];

    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomPool = checklistPools[Math.floor(Math.random() * checklistPools.length)];
    
    // Pick random number of checklist items (2 to 6)
    const numItems = Math.floor(Math.random() * 5) + 2;
    const shuffledPool = [...randomPool].sort(() => 0.5 - Math.random());
    const selectedChecklist = shuffledPool.slice(0, numItems).map((text, i) => ({
      id: Date.now().toString() + i,
      text,
      isCompleted: false
    }));

    const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];

    const randomDept = departments.length > 0 
      ? departments[Math.floor(Math.random() * departments.length)] 
      : { id: 'general', name: 'General' };

    const now = Date.now();
    const randomStartOffset = (Math.floor(Math.random() * 5) - 2) * 24 * 60 * 60 * 1000; // -2 to +2 days
    const randomDuration = (Math.floor(Math.random() * 8) + 1) * 60 * 60 * 1000; // 1 to 8 hours
    const startDate = now + randomStartOffset;
    const dueDate = startDate + randomDuration;

    const testTask: Partial<Task> = {
      title: randomTitle,
      description: randomDesc,
      departmentId: randomDept.id,
      departmentName: randomDept.name,
      priority: randomPriority,
      status: TaskStatus.PENDING,
      type: TaskType.TASK,
      createdBy: currentUser.name,
      createdById: currentUser.id,
      createdAt: now,
      startDate,
      dueDate,
      checklist: selectedChecklist
    };

    await storageService.saveTask(testTask);
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

  const renderSalonesView = () => {
    const activeRoom = rooms.find(r => r.id === activeRoomId);

    return (
      <div className="space-y-8">
        {/* Room Selector & Management */}
        <div className="flex flex-wrap items-center gap-4">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
                activeRoomId === room.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                  : 'bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid size={16} />
              {room.name}
            </button>
          ))}
          {canManageTasks && (
            <button
              onClick={() => {
                setEditingRoom({});
                setShowRoomModal(true);
              }}
              className="p-3 bg-white dark:bg-slate-900 text-gray-400 hover:text-indigo-600 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 transition-all"
              title="Añadir Salón"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {/* Salon Map Visualizer */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {activeRoom?.name || 'Mapa del Salón'}
                </h3>
                {canManageTasks && (
                  <button 
                    onClick={() => {
                      setEditingRoom(activeRoom || null);
                      setShowRoomModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Vista en tiempo real de las mesas</p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {canManageTasks && (
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button
                    onClick={() => { setIsEditMode(false); setIsDrawingMode(false); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isEditMode && !isDrawingMode ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-gray-400'}`}
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => { setIsEditMode(true); setIsDrawingMode(false); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-gray-400'}`}
                  >
                    Mesas
                  </button>
                  <button
                    onClick={() => { setIsEditMode(false); setIsDrawingMode(true); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawingMode ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-gray-400'}`}
                  >
                    Dibujar
                  </button>
                </div>
              )}

              {isEditMode && canManageTasks && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTable}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-700 transition-all"
                  >
                    <Plus size={14} /> Mesa
                  </button>
                  <button
                    onClick={() => floorPlanInputRef.current?.click()}
                    disabled={isUploadingPlan}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all disabled:opacity-50"
                  >
                    {isUploadingPlan ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
                    Plano
                  </button>
                  <input 
                    type="file" 
                    ref={floorPlanInputRef} 
                    onChange={handleFloorPlanUpload} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                  />
                </div>
              )}

              {isDrawingMode && canManageTasks && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddElement('WALL')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all"
                    title="Añadir Muro"
                  >
                    <Square size={14} /> Muro
                  </button>
                  <button
                    onClick={() => handleAddElement('DOOR')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all"
                    title="Añadir Puerta"
                  >
                    <DoorOpen size={14} /> Puerta
                  </button>
                  <button
                    onClick={() => handleAddElement('WINDOW')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all"
                    title="Añadir Ventana"
                  >
                    <Grid size={14} /> Ventana
                  </button>
                  <button
                    onClick={() => handleAddElement('TEXT')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all"
                    title="Añadir Texto"
                  >
                    <Type size={14} /> Texto
                  </button>
                  <button
                    onClick={() => handleAddElement('AREA_LABEL')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all"
                    title="Etiqueta de Área"
                  >
                    <Tag size={14} /> Área
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Libre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Ocupada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Reservada</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Map Container */}
          <div 
            ref={mapContainerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative aspect-[16/9] bg-slate-50 dark:bg-slate-950 rounded-3xl border-2 border-gray-200 dark:border-slate-800 overflow-hidden shadow-inner ${isDrawingMode ? 'cursor-crosshair' : ''}`}
          >
             {/* Grid Background (Always visible in drawing mode) */}
             {isDrawingMode && (
               <div 
                 className="absolute inset-0 pointer-events-none opacity-[0.1]" 
                 style={{ 
                   backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
                   backgroundSize: '20px 20px' 
                 }} 
               />
             )}

             {/* Floor Plan Background */}
             {activeRoom?.floorPlanUrl ? (
               activeRoom.floorPlanUrl.toLowerCase().includes('.pdf') ? (
                 <iframe 
                   src={`${activeRoom.floorPlanUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                   className="absolute inset-0 w-full h-full border-none opacity-40 pointer-events-none"
                   title="Floor Plan PDF"
                 />
               ) : (
                 <img 
                   src={activeRoom.floorPlanUrl} 
                   alt="Floor Plan" 
                   className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                   referrerPolicy="no-referrer"
                 />
               )
             ) : (
               <>
                 {/* Modern Professional Background */}
                 <div className="absolute inset-0 pointer-events-none bg-slate-50 dark:bg-slate-950">
                                        <div 
                      className="absolute inset-0 opacity-[0.2] dark:opacity-[0.1]" 
                      style={{ 
                        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
                        backgroundSize: '32px 32px' 
                      }} 
                    />
                 </div>

                 {/* Blueprint Accents */}
                    {/* Corner Markers */}
                    <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-slate-300 dark:border-slate-700 rounded-tl-sm" />
                    <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-slate-300 dark:border-slate-700 rounded-tr-sm" />
                    <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-slate-300 dark:border-slate-700 rounded-bl-sm" />
                    <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-slate-300 dark:border-slate-700 rounded-br-sm" />

                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-slate-500/5">
                    {/* Subtle Labeling */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Vista de Planta</span>
                    </div>
                 </div>
               </>
             )}

              {/* Custom Floor Plan Elements */}
              {activeRoom?.elements?.map((element) => (
                <div
                  key={element.id}
                  onMouseDown={(e) => handleElementDragStart(e, element)}
                  style={{
                    position: 'absolute',
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    cursor: isDrawingMode ? 'move' : 'default',
                    zIndex: 5,
                    transform: `rotate(${element.rotation || 0}deg)`,
                  }}
                  className={`group ${isDrawingMode ? 'hover:ring-2 hover:ring-indigo-500' : ''}`}
                >
                  {element.type === 'WALL' && (
                    <div className="w-full h-full bg-black" />
                  )}
                  {element.type === 'DOOR' && (
                    <div className="w-full h-full border-2 border-black rounded-tr-full relative overflow-hidden">
                       <div className="absolute left-0 bottom-0 w-full h-[2px] bg-black" />
                    </div>
                  )}
                  {element.type === 'WINDOW' && (
                    <div className="w-full h-full border-y-2 border-black flex items-center">
                       <div className="w-full h-[1px] bg-black/30" />
                    </div>
                  )}
                  {element.type === 'TEXT' && (
                    <input
                      type="text"
                      value={element.text || ''}
                      onChange={(e) => handleElementTextChange(element.id, e.target.value)}
                      className="w-full h-full bg-transparent border-none text-center font-bold text-black focus:outline-none text-sm"
                      readOnly={!isDrawingMode}
                    />
                  )}
                  {element.type === 'AREA_LABEL' && (
                    <div className="w-full h-full flex items-center justify-center border border-dashed border-black/20 bg-white/40 rounded">
                      <input
                        type="text"
                        value={element.text || ''}
                        onChange={(e) => handleElementTextChange(element.id, e.target.value)}
                        className="w-full bg-transparent border-none text-center font-black text-black uppercase tracking-widest focus:outline-none text-[10px]"
                        readOnly={!isDrawingMode}
                      />
                    </div>
                  )}

                  {/* Element Controls (Resize & Delete) */}
                  {isDrawingMode && (
                    <>
                      <div 
                        onMouseDown={(e) => handleElementResizeStart(e, element)}
                        className="absolute -right-1 -bottom-1 w-3 h-3 bg-indigo-600 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(element.id);
                        }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Tables */}
             {tables.length === 0 ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                   <MapIcon size={40} className="text-slate-400" />
                 </div>
                 <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Plano Vacío</h4>
                 <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mb-6">No hay mesas configuradas en este salón.</p>
                 {activeRoomId === 'r-victoria' && (
                   <button
                     onClick={() => storageService.resetTables()}
                     className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                   >
                     <Zap size={16} />
                     Cargar Diseño Victoria
                   </button>
                 )}
               </div>
             ) : tables.map(table => {
               const tableReservations = reservations.filter(r => r.tableId === table.id && (r.status === 'PENDING' || r.status === 'ACTIVE'));
               const currentRes = tableReservations[0];
               const isBeingEdited = editingTable?.id === table.id;
               const displayTable = isBeingEdited ? editingTable : table;

               return (
                 <motion.div 
                   key={table.id}
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ 
                     opacity: 1, 
                     scale: 1,
                     left: `${displayTable.x}%`,
                     top: `${displayTable.y}%`,
                     width: `${displayTable.width}%`,
                     height: `${displayTable.height}%`,
                   }}
                   onMouseDown={(e) => handleTableDragStart(e, table)}
                   onClick={() => {
                     if (!isEditMode && canManageTasks) {
                       setEditingReservation({ tableId: table.id, tableNumber: table.number });
                       setShowReservationModal(true);
                     }
                   }}
                   className={`absolute flex flex-col items-center justify-center transition-all duration-300 shadow-lg border-2 
                     ${isEditMode ? 'cursor-move border-indigo-400 border-dashed' : 'cursor-pointer'}
                     ${table.status === 'OCCUPIED' ? 'bg-red-500 border-red-600 text-white' : 
                       table.status === 'RESERVED' ? 'bg-blue-500 border-blue-600 text-white' : 
                       'bg-white dark:bg-slate-800 border-green-500 text-green-600 dark:text-green-400'}
                     ${table.shape === 'CIRCLE' ? 'rounded-full' : 'rounded-2xl'}
                   `}
                 >
                   <div className="flex flex-col items-center leading-none select-none">
                     <span className="text-sm md:text-base font-black tracking-tighter">{table.number}</span>
                     <span className="text-[8px] md:text-[10px] font-bold opacity-60 uppercase">{table.capacity}p</span>
                   </div>
                   
                   {/* Status Indicator Dot */}
                   {!isEditMode && (
                     <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900
                       ${table.status === 'OCCUPIED' ? 'bg-red-200' : 
                         table.status === 'RESERVED' ? 'bg-blue-200' : 
                         'bg-green-400'}
                     `}></div>
                   )}

                   {/* Resize Handle */}
                   {isEditMode && (
                     <div 
                       onMouseDown={(e) => handleTableResizeStart(e, table)}
                       className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-indigo-400"
                     >
                       <Maximize size={10} />
                     </div>
                   )}

                   {/* Delete Button (Edit Mode) */}
                   {isEditMode && (
                     <button
                       onClick={async (e) => {
                         e.stopPropagation();
                         if (window.confirm('¿Eliminar mesa?')) {
                           await storageService.deleteTable(table.id);
                         }
                       }}
                       className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                     >
                       <X size={10} />
                     </button>
                   )}

                   {/* Table Settings (Edit Mode) */}
                   {isEditMode && (
                     <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newShape = table.shape === 'RECTANGLE' ? 'CIRCLE' : table.shape === 'CIRCLE' ? 'SQUARE' : 'RECTANGLE';
                            await storageService.saveTable({ ...table, shape: newShape });
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-gray-500"
                        >
                          {table.shape === 'CIRCLE' ? <Circle size={12} /> : table.shape === 'SQUARE' ? <Square size={12} /> : <Type size={12} />}
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const num = prompt('Número de mesa:', table.number);
                            if (num) await storageService.saveTable({ ...table, number: num });
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-gray-500"
                        >
                          <Hash size={12} />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const cap = prompt('Capacidad:', table.capacity.toString());
                            if (cap) await storageService.saveTable({ ...table, capacity: parseInt(cap) });
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-gray-500"
                        >
                          <Users size={12} />
                        </button>
                     </div>
                   )}

                   {currentRes && !isEditMode && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm animate-bounce">
                        <UserIcon size={8} className="text-yellow-900" />
                     </div>
                   )}
                 </motion.div>
               );
             })}

             {/* Entrance / Counter Indicators (only if no floor plan) */}
             {!activeRoom?.floorPlanUrl && (
               <>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-8 py-1 bg-slate-200 dark:bg-slate-800 rounded-t-xl text-[8px] font-black text-slate-500 uppercase tracking-widest">Entrada Principal</div>
                 <div className="absolute top-0 right-0 h-1/3 w-4 bg-slate-200 dark:bg-slate-800 rounded-l-xl flex items-center justify-center">
                    <div className="rotate-90 text-[8px] font-black text-slate-500 uppercase tracking-widest">Barra</div>
                 </div>
               </>
             )}
          </div>
        </div>

        {/* Reservations List */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Reservas Hoy</h3>
              <button 
                onClick={() => {
                  setEditingReservation({ startTime: Date.now() });
                  setShowReservationModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all active:scale-95"
              >
                <Plus size={16} /> Nueva Reserva
              </button>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesa</th>
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personas</th>
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hora</th>
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                       <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400 font-bold italic">No hay reservas registradas</td>
                      </tr>
                    ) : (
                      reservations.map(res => (
                        <tr key={res.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                           <td className="py-4">
                              <div className="flex flex-col">
                                 <span className="font-bold text-gray-900 dark:text-white">{res.clientName}</span>
                                 <span className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={10} /> {res.phoneNumber}</span>
                              </div>
                           </td>
                           <td className="py-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-lg font-black text-gray-700 dark:text-slate-300">
                                 {res.tableNumber}
                              </span>
                           </td>
                           <td className="py-4">
                              <div className="flex flex-col">
                                 <span className="font-bold text-gray-900 dark:text-white">{res.numPeople} personas</span>
                                 <span className="text-[10px] text-gray-500">{res.numDiners} comensales</span>
                              </div>
                           </td>
                           <td className="py-4">
                              <span className="font-bold text-gray-700 dark:text-slate-300">
                                 {new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </td>
                           <td className="py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                ${res.status === 'PENDING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                  res.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                  res.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500' : 
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                              `}>
                                 {res.status === 'PENDING' ? 'Pendiente' : 
                                  res.status === 'ACTIVE' ? 'En Mesa' : 
                                  res.status === 'COMPLETED' ? 'Finalizada' : 'Cancelada'}
                              </span>
                           </td>
                           <td className="py-4 text-right">
                              <div className="flex justify-end gap-2">
                                 <button 
                                   onClick={() => { setEditingReservation(res); setShowReservationModal(true); }}
                                   className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                 >
                                    <Edit2 size={16} />
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteReservation(res.id, res.tableId)}
                                   className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
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
                {activeTab === 'TASKS' ? 'Tareas' : 'Salones'} <span className="text-red-600 dark:text-red-500 italic">{activeTab === 'TASKS' ? 'Activas' : 'Reservas'}</span>
              </h2>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 ml-4">
              <button
                onClick={() => setActiveTab('TASKS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'TASKS' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <ClipboardCheck size={14} /> Tareas
              </button>
              <button
                onClick={() => setActiveTab('SALONES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'SALONES' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <MapIcon size={14} /> Salones
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
                  onClick={generateRandomHospitalityTask}
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
        {activeTab === 'TASKS' && (
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
        )}
      </div>

      <div className="p-4 md:p-6 space-y-10">
        {activeTab === 'TASKS' ? (
          <>
            {/* SECTION: TASKS (HIGH IMPACT ACTION STYLE) */}
            {viewMode === 'LIST' ? (
              <div className="space-y-6">
                {/* Week navigation removed from here as it is now in the sticky header */}

                {listTasks.length === 0 ? (
                  <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-dashed border-gray-200 dark:border-slate-800 shadow-inner">
                    <ClipboardCheck size={80} className="mx-auto mb-6 text-gray-300 dark:text-slate-700" />
                    <p className="text-3xl font-black text-gray-400 dark:text-slate-600 uppercase tracking-tighter">Sin Tareas Activas</p>
                    <p className="text-gray-400 dark:text-slate-500 font-medium mt-2">¡Todo al día en esta semana!</p>
                  </div>
                ) : (
                  listTasks.map(task => (
                    <TaskCard 
                      key={task.id}
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
                  ))
                )}
              </div>
            ) : (
              renderCalendarView()
            )}
          </>
        ) : (
          renderSalonesView()
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
                 {activeTaskForComments.comments?.map(comment => (
                   <div key={comment.id} className={`p-4 rounded-2xl shadow-sm ${comment.userId === currentUser.id ? 'bg-blue-600 text-white ml-auto rounded-tr-sm' : 'bg-white dark:bg-slate-800 mr-auto rounded-tl-sm border border-gray-100 dark:border-slate-700'}`}>
                      <p className={`text-[10px] font-black mb-1 flex justify-between gap-4 uppercase tracking-wider ${comment.userId === currentUser.id ? 'text-blue-200' : 'text-gray-400 dark:text-slate-500'}`}>
                        <span>{comment.userName}</span>
                        <span>{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </p>
                      <p className={`text-base font-bold ${comment.userId === currentUser.id ? 'text-white' : 'text-gray-800 dark:text-slate-200'}`}>{comment.message}</p>
                   </div>
                 ))}
                 
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

      {/* Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-gray-200 dark:border-slate-800">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {editingReservation?.id ? 'Editar Reserva' : 'Nueva Reserva'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest">
                    {rooms.find(r => r.id === activeRoomId)?.name || 'Salón'}
                  </p>
                  <span className="text-gray-300 dark:text-slate-700">•</span>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    {selectedTableId ? `Mesa ${tables.find(t => t.id === selectedTableId)?.number}` : 'Seleccione una mesa'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowReservationModal(false);
                  setEditingReservation(null);
                  setSelectedTableId(null);
                }} 
                className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del Cliente"
                    value={editingReservation?.clientName || ''}
                    onChange={(e) => setEditingReservation(prev => ({ ...prev!, clientName: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none font-bold text-gray-900 dark:text-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={editingReservation?.phoneNumber || ''}
                      onChange={(e) => setEditingReservation(prev => ({ ...prev!, phoneNumber: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none font-bold text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                      <Hash size={18} />
                    </div>
                    <input
                      type="number"
                      placeholder="Personas"
                      value={editingReservation?.numPeople || ''}
                      onChange={(e) => setEditingReservation(prev => ({ ...prev!, numPeople: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none font-bold text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <ClipboardCheck size={18} />
                  </div>
                  <textarea
                    placeholder="Notas adicionales..."
                    value={editingReservation?.notes || ''}
                    onChange={(e) => setEditingReservation(prev => ({ ...prev!, notes: e.target.value }))}
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none font-bold text-gray-900 dark:text-white transition-all resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveReservation}
                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-red-500/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-wider"
              >
                {editingReservation?.id ? 'Actualizar Reserva' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW / EDIT ROOM */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-2 border-gray-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {editingRoom?.id ? 'Editar Salón' : 'Nuevo Salón'}
              </h3>
              <button onClick={() => setShowRoomModal(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre del Salón</label>
                <input 
                  value={editingRoom?.name || ''}
                  onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-5 py-4 text-xl font-black bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none dark:text-white"
                  placeholder="Ej: Gastro Bar"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleSaveRoom}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
                >
                  Guardar
                </button>
                {editingRoom?.id && (
                  <button 
                    onClick={async () => {
                      if (window.confirm('¿Eliminar salón y todas sus mesas/reservas?')) {
                        await storageService.deleteRoom(editingRoom.id!);
                        setShowRoomModal(false);
                      }
                    }}
                    className="p-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile removed for cleaner UI */}

    </div>
  );
};

export default Tasks;