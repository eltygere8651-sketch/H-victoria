import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessagesSquare, Clock, Check, Image as ImageIcon, Camera, ArrowLeft, MoreVertical, User as UserIcon, Megaphone, Send, AlertTriangle, Share2 } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { ImageViewer } from '../components/ImageViewer';
import { DeletionTimer } from '../components/DeletionTimer';
import { ShareModal } from '../components/ShareModal';

interface TasksProps {
  currentUser: User;
}

const Tasks: React.FC<TasksProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
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
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((allTasks) => {
      // Filter out announcements for this view
      const filteredTasks = allTasks.filter(task => task.type !== TaskType.ANNOUNCEMENT);
      setTasks(filteredTasks);
      setLoading(false);
      
      // Update selected task if it's open (for real-time comments)
      if (selectedTask) {
        const updated = allTasks.find(t => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    });

    const unsubscribeDepartments = storageService.subscribeToDepartments(setDepartments);

    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
    };
  }, [selectedTask]); // Depend on selectedTask to allow updating it inside the effect if needed

  // Lock body scroll when modal is open to prevent background scrolling on iOS
  useEffect(() => {
    if (selectedTask || showTaskModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedTask, showTaskModal]);

  const handleNewTask = () => {
    setEditingTask({
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      type: TaskType.TASK, // Default to task
      departmentId: '', 
      imageUrls: [] 
    });
    setSaveError(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTask({ ...task });
    setSaveError(null);
    setShowTaskModal(true);
  };

  const handleDeleteClick = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTaskToDelete(task);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await storageService.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsCompressing(true);
      // FIX: Explicitly cast Array.from result to File[] to avoid 'unknown' type inference error
      const files: File[] = Array.from(e.target.files);
      
      try {
        const compressedFiles = await Promise.all(
          files.map(file => compressImage(file))
        );
        
        // We store the actual File objects in a temporary property on the editingTask state
        // creating a custom property 'newFiles' to hold them before save
        setEditingTask(prev => {
          if (!prev) return null;
          const currentNewFiles = (prev as any).newFiles || [];
          return { ...prev, newFiles: [...currentNewFiles, ...compressedFiles] } as any;
        });

      } catch (error) {
        console.error("Error compressing images:", error);
        alert("Error al procesar las imágenes.");
      } finally {
        setIsCompressing(false);
        // Clear input
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    }
  };

  const removeNewFile = (index: number) => {
    setEditingTask(prev => {
      if (!prev) return null;
      const files = (prev as any).newFiles ? [...(prev as any).newFiles] : [];
      files.splice(index, 1);
      return { ...prev, newFiles: files } as any;
    });
  };

  const removeExistingImage = (urlToRemove: string) => {
    setEditingTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        imageUrls: prev.imageUrls?.filter(url => url !== urlToRemove)
      };
    });
  };

  const handleSaveTask = async () => {
    if (!editingTask?.title || !editingTask?.departmentId) {
      setSaveError('Título y departamento son obligatorios');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const selectedDept = departments.find(d => d.id === editingTask.departmentId);
      
      const taskData: Partial<Task> = {
        ...editingTask,
        departmentName: selectedDept?.name || 'Desconocido',
        createdById: editingTask.id ? editingTask.createdById : currentUser.id,
        createdBy: editingTask.id ? editingTask.createdBy : currentUser.name,
        createdAt: editingTask.id ? editingTask.createdAt : Date.now(),
        // Ensure type is set
        type: editingTask.type || TaskType.TASK,
      };

      // Extract new files to upload
      const filesToUpload = (editingTask as any).newFiles || [];
      
      // Clean up the temporary property before saving to Firestore types
      delete (taskData as any).newFiles;

      await storageService.saveTask(taskData, filesToUpload);
      
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error("Error saving task:", error);
      setSaveError(error.message || 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === TaskStatus.COMPLETED) {
      updates.completedBy = currentUser.name;
      updates.completedAt = Date.now();
    } else {
      updates.completedBy = undefined; // Clear if un-completing
      updates.completedAt = undefined;
    }
    await storageService.saveTask({ id: task.id, ...updates });
  };
  
  const handleShareTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        const url = new URL(window.location.href);
        url.search = ''; // Clear query params
        url.hash = '';   // Clear hash
        url.searchParams.set('shareId', task.id);
        const shareUrl = url.toString();

        setShareData({ url: shareUrl, title: task.title });
        setShowShareModal(true);
    } catch (error) {
        console.error("Error creating share URL", error);
    }
  };

  // Comments
  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    
    const comment: Omit<TaskComment, 'id'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      message: newComment.trim(),
      timestamp: Date.now()
    };
    
    await storageService.addCommentToTask(selectedTask.id, comment);
    setNewComment('');
  };
  
  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    // Mark as seen if not already
    if (!task.seenBy?.includes(currentUser.id)) {
        await storageService.markTaskAsSeen(task.id, currentUser.id);
    }
  };

  const filteredTasks = tasks.filter(t => statusFilter === 'ALL' || t.status === statusFilter);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  // --- SUBCOMPONENTS ---

  const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
    const colors = {
      [TaskPriority.LOW]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TaskPriority.MEDIUM]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      [TaskPriority.HIGH]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = { [TaskPriority.LOW]: 'Baja', [TaskPriority.MEDIUM]: 'Media', [TaskPriority.HIGH]: 'Alta' };
    return <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${colors[priority]}`}>{labels[priority]}</span>;
  };

  return (
    <div className="font-sans h-full flex flex-col relative">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-4 pb-2 px-4 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Tareas</h2>
              <button 
                onClick={handleNewTask}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-slate-200 transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
               {(['ALL', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(status => (
                 <button
                   key={status}
                   onClick={() => setStatusFilter(status)}
                   className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                     statusFilter === status 
                       ? 'bg-red-600 text-white shadow-md' 
                       : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                   }`}
                 >
                   {status === 'ALL' ? 'Todas' : 
                    status === TaskStatus.PENDING ? 'Pendientes' : 
                    status === TaskStatus.IN_PROGRESS ? 'En Curso' : 'Completadas'}
                 </button>
               ))}
            </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="py-20 text-center text-gray-400 dark:text-slate-600">
                <ClipboardCheck size={40} className="mx-auto mb-2 opacity-50" />
                <p>No hay tareas en esta vista.</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskClick(task)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-800 hover:shadow-lg dark:hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden ${task.priority === TaskPriority.HIGH && task.status !== TaskStatus.COMPLETED ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1 pr-2">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{task.departmentName}</span>
                         {!task.seenBy?.includes(currentUser.id) && (
                           <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Nueva actualización"></span>
                         )}
                       </div>
                       <h3 className={`font-bold text-lg text-gray-900 dark:text-white leading-tight break-words ${task.status === TaskStatus.COMPLETED ? 'line-through decoration-gray-400 text-gray-500' : ''}`}>{task.title}</h3>
                    </div>
                     {/* BOTÓN COMPARTIR ROJO PARPADEANTE */}
                     <button onClick={(e) => handleShareTask(task, e)} className="text-red-600 dark:text-red-400 p-2 -mr-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all animate-pulse flex-shrink-0" title="Compartir">
                        <Share2 size={20} />
                     </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      {task.imageUrls && task.imageUrls.length > 0 && (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
                           <ImageIcon size={12}/> {task.imageUrls.length}
                        </span>
                      )}
                      {task.comments && task.comments.length > 0 && (
                         <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
                           <MessagesSquare size={12}/> {task.comments.length}
                         </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                       <UserIcon size={12} /> {task.createdBy.split(' ')[0]}
                    </div>
                  </div>

                  {task.status === TaskStatus.COMPLETED && task.completedAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1"><Check size={12}/> Completada por {task.completedBy}</span>
                        <DeletionTimer completedAt={task.completedAt} />
                    </div>
                  )}
                </div>
              ))
            )}
        </div>
      </div>

      {/* Task Details Modal - OPTIMIZED FOR IOS SCROLLING AND SAFE AREAS */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/90 z-[9999] flex justify-center animate-fade-in backdrop-blur-sm overflow-hidden">
           <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] md:h-[90vh] md:max-w-2xl md:mt-10 md:rounded-t-3xl shadow-2xl flex flex-col animate-slide-up md:animate-none relative">
              
              {/* Header with improved safe area padding */}
              <div className="pt-[max(env(safe-area-inset-top),1rem)] px-4 pb-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex-shrink-0">
                 <button onClick={() => setSelectedTask(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-full active:bg-gray-100 dark:active:bg-slate-800"><ArrowLeft size={24} /></button>
                 
                 <div className="flex items-center gap-3">
                    {/* BOTÓN COMPARTIR DETALLES */}
                    <button onClick={(e) => handleShareTask(selectedTask, e)} className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-all animate-pulse shadow-sm" title="Compartir">
                       <Share2 size={20} />
                    </button>

                    <div className="relative group">
                       <button className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><MoreVertical size={24} /></button>
                       <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden group-hover:block hover:block z-50">
                          <button onClick={() => { handleEditTask(selectedTask); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"><Edit2 size={16}/> Editar</button>
                          <button onClick={() => { handleDeleteClick(selectedTask); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={16}/> Eliminar</button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Scrollable Content with standard overflow for momentum scrolling */}
              <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 space-y-6">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">{selectedTask.departmentName}</span>
                       <PriorityBadge priority={selectedTask.priority} />
                    </div>
                    <h2 className={`text-2xl font-black text-gray-900 dark:text-white leading-tight ${selectedTask.status === TaskStatus.COMPLETED ? 'line-through decoration-gray-400 text-gray-500' : ''}`}>{selectedTask.title}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400 font-medium">
                       <span className="flex items-center gap-1"><UserIcon size={14}/> {selectedTask.createdBy}</span>
                       <span className="flex items-center gap-1"><Clock size={14}/> {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                    </div>
                 </div>

                 <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                    <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedTask.description || 'Sin descripción.'}</p>
                 </div>

                 {selectedTask.imageUrls && selectedTask.imageUrls.length > 0 && (
                    <div>
                       <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><ImageIcon size={18}/> Adjuntos ({selectedTask.imageUrls.length})</h3>
                       <div className="grid grid-cols-3 gap-2">
                          {selectedTask.imageUrls.map((url, idx) => (
                             <button key={idx} onClick={() => setViewingImages({ images: selectedTask.imageUrls!, startIndex: idx })} className="aspect-square bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-all">
                                <img src={url} alt="adjunto" className="w-full h-full object-cover" />
                             </button>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* Status Actions */}
                 <div className="grid grid-cols-3 gap-3">
                    <button 
                       onClick={() => handleStatusChange(selectedTask, TaskStatus.PENDING)}
                       className={`py-3 rounded-xl font-bold text-sm transition-all ${selectedTask.status === TaskStatus.PENDING ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                    >
                       Pendiente
                    </button>
                    <button 
                       onClick={() => handleStatusChange(selectedTask, TaskStatus.IN_PROGRESS)}
                       className={`py-3 rounded-xl font-bold text-sm transition-all ${selectedTask.status === TaskStatus.IN_PROGRESS ? 'bg-blue-600 text-white shadow-md ring-2 ring-offset-2 ring-blue-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}
                    >
                       En Curso
                    </button>
                    <button 
                       onClick={() => handleStatusChange(selectedTask, TaskStatus.COMPLETED)}
                       className={`py-3 rounded-xl font-bold text-sm transition-all ${selectedTask.status === TaskStatus.COMPLETED ? 'bg-green-600 text-white shadow-md ring-2 ring-offset-2 ring-green-600' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}
                    >
                       Hecho
                    </button>
                 </div>

                 {/* Comments Section */}
                 <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MessagesSquare size={18}/> Comentarios</h3>
                    
                    <div className="space-y-4 mb-20">
                       {selectedTask.comments?.map((comment) => (
                          <div key={comment.id} className={`flex gap-3 ${comment.userId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${comment.userId === currentUser.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                {comment.userName.charAt(0)}
                             </div>
                             <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${comment.userId === currentUser.id ? 'bg-red-50 dark:bg-red-900/20 text-gray-800 dark:text-slate-200 rounded-tr-none' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-none'}`}>
                                <p className="font-bold text-xs mb-1 opacity-70">{comment.userName}</p>
                                <p>{comment.message}</p>
                                <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                          </div>
                       ))}
                       {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                          <p className="text-center text-gray-400 dark:text-slate-600 text-sm py-4">No hay comentarios aún.</p>
                       )}
                    </div>
                 </div>
              </div>

              {/* Comment Input with safe area padding */}
              <div className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)] bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex-shrink-0 z-20">
                 <div className="flex gap-2 relative">
                    <input 
                       type="text" 
                       value={newComment}
                       onChange={(e) => setNewComment(e.target.value)}
                       placeholder="Escribe un comentario..."
                       onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                       className="flex-1 bg-gray-100 dark:bg-slate-800 border-0 rounded-full px-5 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <button 
                       onClick={handleSendComment}
                       disabled={!newComment.trim()}
                       className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 transition-all shadow-md shadow-red-200 dark:shadow-none active:scale-95"
                    >
                       <Send size={20} className={newComment.trim() ? 'ml-0.5' : ''}/>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* New/Edit Task Modal */}
      {showTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 animate-pop-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingTask.id ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Type Selection */}
              <div className="bg-gray-50 dark:bg-slate-900/50 p-1.5 rounded-xl flex gap-1">
                 <button 
                    type="button"
                    onClick={() => setEditingTask({...editingTask, type: TaskType.TASK})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${editingTask.type === TaskType.TASK ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                 >
                    <ClipboardCheck size={16}/> Tarea
                 </button>
                 <button 
                    type="button"
                    onClick={() => setEditingTask({...editingTask, type: TaskType.ANNOUNCEMENT})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${editingTask.type === TaskType.ANNOUNCEMENT ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                 >
                    <Megaphone size={16}/> Anuncio
                 </button>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Título</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white transition-all"
                  value={editingTask.title || ''}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  placeholder={editingTask.type === TaskType.ANNOUNCEMENT ? "Ej. Reunión de personal..." : "Ej. Reparar aire acondicionado..."}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Departamento</label>
                <div className="relative">
                   <select 
                     className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-medium text-gray-900 dark:text-white appearance-none transition-all"
                     value={editingTask.departmentId || ''}
                     onChange={e => setEditingTask({...editingTask, departmentId: e.target.value})}
                   >
                     <option value="" disabled>Selecciona un departamento</option>
                     {departments.map(dep => (
                       <option key={dep.id} value={dep.id}>{dep.name}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Prioridad</label>
                    <div className="relative">
                       <select 
                         className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-medium text-gray-900 dark:text-white appearance-none transition-all"
                         value={editingTask.priority || TaskPriority.MEDIUM}
                         onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                       >
                         <option value={TaskPriority.LOW}>Baja</option>
                         <option value={TaskPriority.MEDIUM}>Media</option>
                         <option value={TaskPriority.HIGH}>Alta</option>
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Estado</label>
                    <div className="relative">
                       <select 
                         className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-medium text-gray-900 dark:text-white appearance-none transition-all"
                         value={editingTask.status || TaskStatus.PENDING}
                         onChange={e => setEditingTask({...editingTask, status: e.target.value as TaskStatus})}
                       >
                         <option value={TaskStatus.PENDING}>Pendiente</option>
                         <option value={TaskStatus.IN_PROGRESS}>En Curso</option>
                         <option value={TaskStatus.COMPLETED}>Completada</option>
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                 </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Descripción</label>
                 <textarea 
                    className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-medium text-gray-900 dark:text-white min-h-[100px] resize-none transition-all"
                    value={editingTask.description || ''}
                    onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                    placeholder="Detalles adicionales..."
                 />
              </div>

              {/* Image Upload */}
              <div>
                 <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Imágenes</label>
                 <div className="flex gap-3 overflow-x-auto pb-2">
                    <button 
                       type="button" 
                       onClick={() => cameraInputRef.current?.click()}
                       disabled={isCompressing}
                       className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95"
                    >
                       <Camera size={24} />
                       <span className="text-[10px] font-bold mt-1">Cámara</span>
                    </button>
                    <button 
                       type="button" 
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isCompressing}
                       className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95"
                    >
                       <ImageIcon size={24} />
                       <span className="text-[10px] font-bold mt-1">Galería</span>
                    </button>

                    <input type="file" ref={cameraInputRef} capture="environment" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFileChange} />

                    {/* Previews of existing images */}
                    {editingTask.imageUrls?.map((url, idx) => (
                       <div key={`existing-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                          <img src={url} alt="preview" className="w-full h-full object-cover" />
                          <button 
                             type="button"
                             onClick={() => removeExistingImage(url)}
                             className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors"
                          >
                             <X size={12} />
                          </button>
                       </div>
                    ))}

                    {/* Previews of new files to upload */}
                    {(editingTask as any).newFiles?.map((file: File, idx: number) => (
                       <div key={`new-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                          <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover opacity-80" />
                          <button 
                             type="button"
                             onClick={() => removeNewFile(idx)}
                             className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors"
                          >
                             <X size={12} />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-green-500 text-white text-[8px] font-bold text-center py-0.5">NUEVO</div>
                       </div>
                    ))}
                    
                    {isCompressing && (
                       <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                          <Loader2 className="animate-spin text-gray-400" />
                       </div>
                    )}
                 </div>
              </div>
              
              {saveError && (
                 <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} /> {saveError}
                 </div>
              )}
            </div>
            
            <div className="flex gap-4 mt-8">
               <button onClick={() => setShowTaskModal(false)} className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]">Cancelar</button>
               <button 
                  onClick={handleSaveTask} 
                  disabled={isSaving || isCompressing}
                  className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:shadow-none"
               >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md">
               <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Tarea?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal Integration */}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        url={shareData.url} 
        title={shareData.title} 
      />

      {/* Image Viewer */}
      {viewingImages && (
         <ImageViewer 
            images={viewingImages.images}
            startIndex={viewingImages.startIndex}
            onClose={() => setViewingImages(null)}
         />
      )}
    </div>
  );
};

export default Tasks;