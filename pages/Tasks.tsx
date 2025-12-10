import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessagesSquare, Clock, Check, Image as ImageIcon, Camera, ArrowLeft, MoreVertical, User as UserIcon, Megaphone, Send, AlertTriangle } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { ImageViewer } from '../components/ImageViewer';
import { DeletionTimer } from '../components/DeletionTimer';

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

  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const canManageTasks = currentUser.role === UserRole.ADMIN || (currentUser.permissions?.includes('CAN_MANAGE_TASKS') ?? false);

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((data) => {
      setTasks(data);
      if (selectedTaskForDetails) {
        const updatedTask = data.find(t => t.id === selectedTaskForDetails.id);
        setSelectedTaskForDetails(updatedTask || null);
      }
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
    };
  }, [selectedTaskForDetails]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTaskForDetails?.comments]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);
  
  useEffect(() => {
    const newPreviewUrls = filesToUpload.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);
    return () => {
      newPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [filesToUpload]);

  const handleViewDetails = (task: Task) => {
    if (!task.seenBy?.includes(currentUser.id)) {
      storageService.markTaskAsSeen(task.id, currentUser.id);
    }
    setSelectedTaskForDetails(task);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    const files: File[] = Array.from(selectedFiles);
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const results = await Promise.allSettled(
        files.map(file => compressImage(file))
      );
      
      const successfulFiles = results
        .filter((res): res is PromiseFulfilledResult<File> => res.status === 'fulfilled')
        .map(res => res.value);
      
      if (successfulFiles.length > 0) {
        setFilesToUpload(prev => [...prev, ...successfulFiles]);
      }

      const failedCount = files.length - successfulFiles.length;
      if (failedCount > 0) {
        alert(`No se pudieron procesar ${failedCount} imágen(es).`);
      }
    } catch (error) {
      console.error("An unexpected error occurred during file processing:", error);
    } finally {
      setIsCompressing(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveExistingImage = (indexToRemove: number) => {
    setEditingTask(prev => ({
      ...prev,
      imageUrls: prev?.imageUrls?.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setFilesToUpload(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.title || !editingTask.departmentId) {
      alert('El título y el departamento son obligatorios.');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    try {
      const taskData: Partial<Task> = {
        ...editingTask,
        type: editingTask.type || TaskType.TASK,
        title: editingTask.title,
        departmentId: editingTask.departmentId,
        departmentName: departments.find(d => d.id === editingTask.departmentId)?.name || 'N/A',
        createdBy: editingTask.id ? editingTask.createdBy! : currentUser.name,
        createdById: editingTask.id ? editingTask.createdById! : currentUser.id,
        createdAt: editingTask.id ? editingTask.createdAt! : Date.now(),
      };
      
      await storageService.saveTask(taskData, filesToUpload);
      setShowTaskModal(false);
      setEditingTask(null);
      setFilesToUpload([]);

    } catch (error: any) {
        console.error("Failed to save task:", error);
        setSaveError(error.message || 'Ocurrió un error al guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const openNewTask = (type: TaskType) => {
    setEditingTask({
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      type: type,
      departmentId: departments.length > 0 ? departments[0].id : ''
    });
    setFilesToUpload([]);
    setPreviewUrls([]);
    setSaveError(null);
    setShowTaskModal(true);
  };
  
  const openEditTask = (task: Task) => {
    setEditingTask({ ...task });
    setFilesToUpload([]);
    setPreviewUrls([]);
    setSaveError(null);
    setShowTaskModal(true);
  };
  
  const handleDeleteTask = async () => {
    if (taskToDelete) {
      await storageService.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      if (selectedTaskForDetails?.id === taskToDelete.id) {
        setSelectedTaskForDetails(null);
      }
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const updatedTask: Partial<Task> = {
      id: task.id,
      status: newStatus,
    };
    if (newStatus === TaskStatus.COMPLETED) {
      updatedTask.completedBy = currentUser.name;
      updatedTask.completedAt = Date.now();
    }
    await storageService.saveTask(updatedTask);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedTaskForDetails) return;
    setIsSendingComment(true);
    const comment: Omit<TaskComment, 'id'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      message: newComment.trim(),
      timestamp: Date.now(),
    };
    try {
        await storageService.addCommentToTask(selectedTaskForDetails.id, comment);
        setNewComment('');
    } catch(e) {
        console.error("Failed to send comment:", e);
        alert("No se pudo enviar el comentario.");
    } finally {
        setIsSendingComment(false);
    }
  };

  const getPriorityInfo = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return { text: 'Alta', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' };
      case TaskPriority.MEDIUM: return { text: 'Media', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' };
      case TaskPriority.LOW: return { text: 'Baja', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' };
      default: return { text: 'N/A', color: 'text-gray-500 bg-gray-100' };
    }
  };
  
  const getStatusInfo = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return { text: 'Pendiente', color: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700' };
      case TaskStatus.IN_PROGRESS: return { text: 'En Progreso', color: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' };
      case TaskStatus.COMPLETED: return { text: 'Completada', color: 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30' };
      default: return { text: 'N/A', color: 'text-gray-500 bg-gray-100' };
    }
  };

  const sortedTasks = tasks
    .filter(t => statusFilter === 'ALL' || t.status === statusFilter)
    .sort((a, b) => b.createdAt - a.createdAt);
    
  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;

  const combinedImages = [
    ...(editingTask?.imageUrls || []),
    ...previewUrls
  ];

  interface TaskCardProps {
    task: Task;
  }
  const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const isUnread = !task.seenBy?.includes(currentUser.id);
    const hasImages = task.imageUrls && task.imageUrls.length > 0;
    
    return (
      <div 
        onClick={() => handleViewDetails(task)}
        className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card-soft dark:shadow-card-dark border dark:border-slate-800 transition-all group cursor-pointer active:scale-[0.98] ${isUnread ? 'border-red-500/50 dark:border-red-500/50 shadow-red-100/50 dark:shadow-red-900/20' : 'border-gray-100 hover:border-red-200 dark:hover:border-red-900/50'}`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${task.type === TaskType.ANNOUNCEMENT ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
              {task.type === TaskType.ANNOUNCEMENT ? <Megaphone size={14} /> : <ClipboardCheck size={14} />}
              <span>{task.type === TaskType.ANNOUNCEMENT ? 'Anuncio' : 'Tarea'}</span>
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight">{task.title}</h3>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-1">{task.departmentName}</p>
          </div>
          {isUnread && <span className="w-3 h-3 bg-red-500 rounded-full shrink-0 animate-pulse mt-1" title="No leído"></span>}
        </div>
        
        {/* NEW: Image Preview Strip in List View */}
        {hasImages && (
          <div className="mt-4 flex gap-2 overflow-hidden">
            {task.imageUrls!.slice(0, 4).map((url, idx) => (
              <div key={idx} className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-gray-100 dark:border-slate-700">
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
            {task.imageUrls!.length > 4 && (
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700">
                +{task.imageUrls!.length - 4}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-slate-800 pt-3">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border ${getPriorityInfo(task.priority).color}`}>
            <span className="flex items-center gap-1.5"><Flag size={14} /> {getPriorityInfo(task.priority).text}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${getStatusInfo(task.status).color}`}>
            {getStatusInfo(task.status).text}
          </div>
        </div>
      </div>
    );
  };
  
  if (selectedTaskForDetails) {
    const task = selectedTaskForDetails;
    const { color: priorityColor, text: priorityText } = getPriorityInfo(task.priority);
    const { color: statusColor, text: statusText } = getStatusInfo(task.status);
    
    return (
      <div className="h-full bg-gray-50 dark:bg-slate-950 flex flex-col animate-fade-in relative">
        <header className="sticky top-0 z-20 flex items-center gap-4 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
          <button onClick={() => setSelectedTaskForDetails(null)} className="p-2 -ml-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"><ArrowLeft size={24} /></button>
          <div className="flex-1 truncate">
             <h2 className="font-extrabold text-lg text-gray-900 dark:text-white truncate">{task.title}</h2>
          </div>
          <div className="relative group">
            <button className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"><MoreVertical size={24} /></button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 p-2 hidden group-hover:block z-10 animate-fade-in">
              <button onClick={() => openEditTask(task)} className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 font-semibold dark:text-white"><Edit2 size={16}/> Editar</button>
              <button onClick={() => setTaskToDelete(task)} className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"><Trash2 size={16} /> Eliminar</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-slate-800">
             <div className="flex flex-wrap gap-4 mb-4">
                <div className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border flex items-center gap-1.5 ${priorityColor}`}><Flag size={14} /> {priorityText}</div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 ${statusColor}`}>{statusText}</div>
              </div>
            <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{task.description || 'Sin descripción.'}</p>
          </div>
          
          {task.imageUrls && task.imageUrls.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-slate-800">
              <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3 flex items-center gap-2"><ImageIcon size={16}/> Imágenes Adjuntas</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {task.imageUrls.map((url, index) => (
                  <button key={index} onClick={() => setViewingImages({ images: task.imageUrls!, startIndex: index })} className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden hover:ring-2 ring-red-500 transition-all active:scale-95">
                    <img src={url} alt={`Adjunto ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-slate-800 space-y-3 text-sm">
             <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400"><MapPin size={18} className="text-gray-400"/> <span className="font-bold">{task.departmentName}</span></div>
             <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400"><UserIcon size={18} className="text-gray-400"/> Creado por <span className="font-bold">{task.createdBy}</span></div>
             <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400"><Clock size={18} className="text-gray-400"/> Creado {new Date(task.createdAt).toLocaleString()}</div>
             {task.status === TaskStatus.COMPLETED && task.completedBy && (
              <div className="flex items-center gap-3 text-green-600 dark:text-green-400"><Check size={18} className="text-green-500"/> Completado por <span className="font-bold">{task.completedBy}</span></div>
             )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800">
             <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500 dark:text-slate-400 p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2"><MessagesSquare size={16}/> Comentarios</h4>
             <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
               {(task.comments || []).map(comment => (
                 <div key={comment.id} className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-gray-500 dark:text-slate-400 shrink-0">{comment.userName.charAt(0)}</div>
                   <div>
                     <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl">
                       <p className="text-gray-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{comment.message}</p>
                     </div>
                     <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5 px-2">
                       <span className="font-bold">{comment.userName}</span> • {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                   </div>
                 </div>
               ))}
               <div ref={commentsEndRef} />
             </div>
             <div className="p-3 border-t border-gray-100 dark:border-slate-800 flex items-end gap-2">
               <textarea 
                 ref={textareaRef}
                 value={newComment}
                 onChange={e => setNewComment(e.target.value)}
                 placeholder="Escribe un comentario..."
                 rows={1}
                 className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-red-300 dark:ring-red-500/50 resize-none dark:text-white"
                 onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
               />
               <button onClick={handleSendComment} disabled={isSendingComment || !newComment.trim()} className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-button-red hover:bg-red-700 active:scale-95 transition-all disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:shadow-none">
                 {isSendingComment ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
               </button>
             </div>
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 p-4 pb-safe">
          {task.status !== TaskStatus.COMPLETED ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleStatusChange(task, TaskStatus.IN_PROGRESS)} disabled={task.status === TaskStatus.IN_PROGRESS} className="py-3 px-4 rounded-xl font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed">Marcar En Progreso</button>
              <button onClick={() => handleStatusChange(task, TaskStatus.COMPLETED)} className="py-3 px-4 rounded-xl font-bold bg-green-600 text-white shadow-lg shadow-button-green hover:bg-green-700">Marcar Completada</button>
            </div>
          ) : (
            <div className="text-center">
              <DeletionTimer completedAt={task.completedAt!} />
            </div>
          )}
        </footer>
        
        {/* Render ImageViewer here to ensure it is above the detail view content */}
        {viewingImages && (
            <ImageViewer 
            images={viewingImages.images}
            startIndex={viewingImages.startIndex}
            onClose={() => setViewingImages(null)}
            />
        )}
      </div>
    );
  }

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Tareas</h2>
          {canManageTasks && (
            <div className="flex gap-3">
               <button onClick={() => openNewTask(TaskType.ANNOUNCEMENT)} className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-button-blue hover:bg-blue-700 transition-all active:scale-95" title="Crear Anuncio"><Megaphone size={22} /></button>
               <button onClick={() => openNewTask(TaskType.TASK)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-slate-200 transition-all active:scale-95" title="Crear Tarea"><Plus size={24} /></button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-100 dark:bg-slate-800/60 p-1.5 rounded-xl flex gap-1">
          {(['ALL', ...Object.values(TaskStatus)] as const).map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all text-center ${statusFilter === status ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
            >
              {status === 'ALL' ? 'Todas' : getStatusInfo(status).text}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedTasks.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600">
            <ClipboardCheck size={40} className="mx-auto mb-2 opacity-50" />
            <p>No hay tareas en esta vista.</p>
          </div>
        )}
        {sortedTasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>

      {showTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-6 md:p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white drop-shadow-sm">
                {editingTask.id ? 'Editar' : 'Nueva'} {editingTask.type === TaskType.ANNOUNCEMENT ? 'Anuncio' : 'Tarea'}
              </h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Título</label>
                <input className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white shadow-sm" value={editingTask.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder="Ej. Limpieza profunda de cocina" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Descripción (Opcional)</label>
                <textarea className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm" value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} rows={3} placeholder="Detalles adicionales..."></textarea>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Departamento</label>
                  <select className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm appearance-none" value={editingTask.departmentId || ''} onChange={e => setEditingTask({...editingTask, departmentId: e.target.value})} required>
                    <option value="" disabled>Selecciona un departamento</option>
                    {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Prioridad</label>
                  <select className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm appearance-none" value={editingTask.priority || TaskPriority.MEDIUM} onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}>
                    <option value={TaskPriority.LOW}>Baja</option>
                    <option value={TaskPriority.MEDIUM}>Media</option>
                    <option value={TaskPriority.HIGH}>Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Imágenes</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {combinedImages.map((url, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img src={url} alt="Previsualización" className="w-full h-full object-cover rounded-xl bg-gray-100 dark:bg-slate-700"/>
                      <button 
                        onClick={() => index < (editingTask.imageUrls?.length || 0) ? handleRemoveExistingImage(index) : handleRemoveNewImage(index - (editingTask.imageUrls?.length || 0))}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 active:scale-95 opacity-0 group-hover:opacity-100 transition-opacity"
                      ><X size={16}/></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 aspect-square">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><ImageIcon size={24}/> <span className="text-xs mt-1">Galería</span></button>
                    <button onClick={() => cameraInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><Camera size={24}/> <span className="text-xs mt-1">Cámara</span></button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                  <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                </div>
                {isCompressing && <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400"><Loader2 size={16} className="animate-spin" /> Procesando imágenes...</div>}
              </div>
              {saveError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30">{saveError}</div>}
            </div>

            <div className="flex gap-4 mt-8 shrink-0">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveTask} disabled={isSaving} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400"><Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Tarea?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Estás a punto de eliminar <strong className="text-gray-800 dark:text-slate-200">{taskToDelete.title}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleDeleteTask} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Ensure ImageViewer is at the very root level of the return to respect Z-Index */}
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