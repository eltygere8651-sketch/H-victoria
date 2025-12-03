import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessagesSquare, Clock, Check, Image as ImageIcon, Camera, ArrowLeft, ArrowRight, MoreVertical, User as UserIcon, Megaphone, Send } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { fileToBase64 } from '../utils/imageCompressor';
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

  // New: State for viewing task details and comments
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canManageTasks = currentUser.role === UserRole.ADMIN || (currentUser.permissions?.includes('CAN_MANAGE_TASKS') ?? false);

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((data) => {
      setTasks(data);
      // Update the detailed view if it's open
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
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  const handleViewDetails = (task: Task) => {
    // Mark as seen when the user opens the details
    if (!task.seenBy?.includes(currentUser.id)) {
      storageService.markTaskAsSeen(task.id, currentUser.id);
    }
    setSelectedTaskForDetails(task);
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const processedImages = await Promise.all(files.map(async (file: File) => {
        const compressedFile = await compressImage(file);
        return await fileToBase64(compressedFile);
      }));
      setEditingTask(prev => ({
        ...prev,
        imagesBase64: [...(prev?.imagesBase64 || []), ...processedImages]
      }));
    } catch (error: any) {
      console.error("Image processing failed:", error);
      alert("Hubo un error al procesar las imágenes.");
    } finally {
      setIsCompressing(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEditingTask(prev => ({
      ...prev,
      imagesBase64: prev?.imagesBase64?.filter((_, index) => index !== indexToRemove)
    }));
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
      
      await storageService.saveTask(taskData);
      setShowTaskModal(false);
      setEditingTask(null);

    } catch (error: any) {
        console.error("Failed to save task:", error);
        setSaveError(error.message);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const updatedTask: Task = { ...task, status: newStatus };
    if (newStatus === TaskStatus.COMPLETED) {
        updatedTask.completedAt = Date.now();
        updatedTask.completedBy = currentUser.name;
    }
    await storageService.saveTask(updatedTask);
  };

  const handleDeleteClick = (task: Task) => setTaskToDelete(task);
  const confirmDelete = async () => {
    if (taskToDelete) {
      await storageService.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      if(selectedTaskForDetails?.id === taskToDelete.id) {
        setSelectedTaskForDetails(null);
      }
    }
  };

  const openNewTaskModal = () => {
    setEditingTask({ imagesBase64: [], type: TaskType.TASK, status: TaskStatus.PENDING });
    setSaveError(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTaskForDetails(null); // Close details view if open
    setEditingTask({ ...task });
    setSaveError(null);
    setShowTaskModal(true);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTaskForDetails) return;
    
    setIsSendingComment(true);
    const comment: Omit<TaskComment, 'id'> = {
        userId: currentUser.id,
        userName: currentUser.name,
        message: newComment.trim(),
        timestamp: Date.now()
    };
    try {
        await storageService.addCommentToTask(selectedTaskForDetails.id, comment);
        setNewComment('');
    } catch(error) {
        console.error("Failed to send comment:", error);
        alert("No se pudo enviar el comentario.");
    } finally {
        setIsSendingComment(false);
    }
  };
  
  const filteredTasks = tasks.filter(task => statusFilter === 'ALL' || task.status === statusFilter);

  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case TaskPriority.MEDIUM: return 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case TaskPriority.LOW: return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const statusTextMap = {
    [TaskStatus.PENDING]: 'Pendiente',
    [TaskStatus.IN_PROGRESS]: 'En Progreso',
    [TaskStatus.COMPLETED]: 'Completada',
  };

  // New Status Buttons Component
  const StatusButtons = ({ task }: { task: Task }) => {
    const buttons = [
      { status: TaskStatus.PENDING, label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      { status: TaskStatus.IN_PROGRESS, label: 'En Progreso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      { status: TaskStatus.COMPLETED, label: 'Completada', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    ];

    return (
      <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
        {buttons.map(({ status, label, color }) => (
          <button
            key={status}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              handleStatusChange(task, status);
            }}
            className={`flex-1 text-center text-xs font-bold px-2 py-1.5 rounded-md transition-all duration-200
              ${task.status === status
                ? `bg-white dark:bg-slate-900 shadow-sm ${color.split(' ')[1]} dark:${color.split(' ')[3]}`
                : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600/50'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Tareas y Anuncios</h2>
          {canManageTasks && (
            <button onClick={openNewTaskModal} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-slate-200 transition-all active:scale-95"><Plus size={24} /></button>
          )}
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800/60 p-1.5 rounded-xl">
            {(['ALL', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>{s === 'ALL' ? 'Todas' : statusTextMap[s]}</button>)}
        </div>
      </div>
      
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingTask?.id ? 'Editar' : 'Nuevo'} {editingTask?.type === TaskType.ANNOUNCEMENT ? 'Anuncio' : 'Tarea'}</h3>
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-700/50 p-1.5 rounded-xl">
                <button onClick={() => setEditingTask({...editingTask, type: TaskType.TASK})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${editingTask?.type !== TaskType.ANNOUNCEMENT ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md' : 'text-gray-500 dark:text-slate-400'}`}><ClipboardCheck size={16}/> Tarea</button>
                <button onClick={() => setEditingTask({...editingTask, type: TaskType.ANNOUNCEMENT})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${editingTask?.type === TaskType.ANNOUNCEMENT ? 'bg-white dark:bg-slate-900 text-red-500 shadow-md' : 'text-gray-500 dark:text-slate-400'}`}><Megaphone size={16}/> Anuncio</button>
              </div>
              <input value={editingTask?.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder={editingTask?.type === TaskType.ANNOUNCEMENT ? 'Título del anuncio' : 'Título de la tarea'} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none font-bold text-gray-900 dark:text-white shadow-sm" />
              <textarea value={editingTask?.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} placeholder="Descripción (opcional)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm h-24" />
              
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Imágenes</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(editingTask?.imagesBase64 || []).map((img, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-slate-700">
                      <img src={img} className="w-full h-full object-cover" alt={`Preview ${index + 1}`}/>
                      <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 aspect-square">
                     <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="task-image-upload" />
                     <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" id="task-camera-upload" />
                     <button disabled={isCompressing} onClick={() => fileInputRef.current?.click()} className="flex-1 text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-slate-900 px-2 py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white flex items-center justify-center gap-2 disabled:opacity-50"><ImageIcon size={16}/> Galería</button>
                     <button disabled={isCompressing} onClick={() => cameraInputRef.current?.click()} className="flex-1 text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-slate-900 px-2 py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white flex items-center justify-center gap-2 disabled:opacity-50"><Camera size={16}/> Cámara</button>
                  </div>
                   {isCompressing && (
                    <div className="aspect-square rounded-lg bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600">
                      <Loader2 className="animate-spin text-gray-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>
              </div>

              {editingTask?.type !== TaskType.ANNOUNCEMENT && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <input value={editingTask?.location || ''} onChange={e => setEditingTask({...editingTask, location: e.target.value})} placeholder="Ubicación (ej. Hab. 205)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm" />
                  <select value={editingTask?.priority || TaskPriority.MEDIUM} onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm"><option value={TaskPriority.LOW}>Prioridad Baja</option><option value={TaskPriority.MEDIUM}>Prioridad Media</option><option value={TaskPriority.HIGH}>Prioridad Alta</option></select>
                </div>
              )}
              <select value={editingTask?.departmentId || ''} onChange={e => setEditingTask({...editingTask, departmentId: e.target.value})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm">
                <option value="" disabled>Asignar a departamento...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {saveError && <div className="mt-4 text-center text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">{saveError}</div>}
            <div className="flex gap-4 mt-8">
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveTask} disabled={isSaving || isCompressing} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400 disabled:cursor-not-allowed">
                {(isSaving || isCompressing) ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Se eliminará <strong className="text-gray-800 dark:text-slate-200">"{taskToDelete.title}"</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskForDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTaskForDetails(null)}>
          <div className="bg-white dark:bg-slate-850 rounded-3xl w-full max-w-2xl shadow-pop-in border border-gray-100 dark:border-slate-700/50 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex justify-between items-center border-b border-gray-100 dark:border-slate-700/50 flex-shrink-0">
               <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedTaskForDetails.type === TaskType.ANNOUNCEMENT ? 'Anuncio' : 'Detalles de Tarea'}</h3>
               <button onClick={() => setSelectedTaskForDetails(null)} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            
            <div className="flex-grow overflow-y-auto no-scrollbar p-5 pb-4">
              <h2 className="font-bold text-2xl mb-4">{selectedTaskForDetails.title}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
                <span className="flex items-center gap-2"><ClipboardCheck size={14}/> <strong>Dpto:</strong> {selectedTaskForDetails.departmentName}</span>
                {selectedTaskForDetails.type === TaskType.TASK && <span className={`font-bold uppercase px-2 py-1 rounded-md border text-xs text-center ${getPriorityStyles(selectedTaskForDetails.priority)}`}>{selectedTaskForDetails.priority}</span>}
                {selectedTaskForDetails.location && <span className="flex items-center gap-2"><MapPin size={14}/> {selectedTaskForDetails.location}</span>}
              </div>

              {selectedTaskForDetails.type === TaskType.TASK && (
                  <div className="my-4">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Estado</label>
                    <StatusButtons task={selectedTaskForDetails} />
                  </div>
              )}

              {selectedTaskForDetails.description && <p className="mb-4 whitespace-pre-wrap">{selectedTaskForDetails.description}</p>}
              
              {selectedTaskForDetails.imagesBase64 && selectedTaskForDetails.imagesBase64.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selectedTaskForDetails.imagesBase64.map((img, idx) => (
                    <img key={idx} src={img} onClick={() => setViewingImages({ images: selectedTaskForDetails.imagesBase64!, startIndex: idx })} className="w-full h-24 object-cover rounded-lg cursor-pointer" />
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                <h4 className="font-bold mb-2">Comentarios</h4>
                <div className="space-y-4">
                  {(selectedTaskForDetails.comments || []).map(comment => (
                    <div key={comment.id} className={`flex gap-3 ${comment.userId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 ${comment.userId === currentUser.id ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>{comment.userName.charAt(0)}</div>
                      <div className={`p-3 rounded-xl max-w-xs ${comment.userId === currentUser.id ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-700/50'}`}>
                        <p className="text-sm font-bold">{comment.userName}</p>
                        <p className="text-sm">{comment.message}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 text-right">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                   <div className="h-4"></div>
                  <div ref={commentsEndRef} />
                </div>
              </div>
            </div>

            <form onSubmit={handleAddComment} className="flex-shrink-0 bg-white dark:bg-slate-850 p-4 border-t border-gray-100 dark:border-slate-700/50 flex items-end gap-3 pb-safe">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(e as any);
                    }
                }}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 py-2 px-4 border-2 rounded-full bg-gray-100 dark:bg-slate-700 focus:border-red-500 outline-none shadow-sm resize-none max-h-28 no-scrollbar"
              />
              <button
                type="submit"
                disabled={isSendingComment || !newComment.trim()}
                className="bg-red-600 text-white w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full shadow-lg shadow-button-red active:scale-95 transition-all duration-200 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isSendingComment ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </form>
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

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && tasks.length === 0 && <div className="col-span-full flex h-64 items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>}
        {filteredTasks.map(task => {
          const isUnread = !task.seenBy?.includes(currentUser.id);
          return (
          <div key={task.id} onClick={() => handleViewDetails(task)} className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-md border dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300 cursor-pointer hover:shadow-lg hover:border-red-500/50 ${task.status === TaskStatus.COMPLETED && task.type === TaskType.TASK ? 'opacity-60 grayscale-[50%]' : ''}`}>
            {isUnread && <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white dark:ring-slate-900 animate-pulse"></div>}
            {task.type === TaskType.TASK && <div className={`flex-shrink-0 h-2 w-full ${getPriorityStyles(task.priority).split(' ')[0].replace('border-', 'bg-')}`}></div>}
            
            {task.imagesBase64 && task.imagesBase64.length > 0 && (
              <div onClick={(e) => { e.stopPropagation(); setViewingImages({ images: task.imagesBase64!, startIndex: 0 }); }} className="relative h-48 bg-gray-100 dark:bg-slate-800 cursor-pointer group">
                <img src={task.imagesBase64[0]} className="w-full h-full object-cover" alt="Imagen de tarea" />
                {task.imagesBase64.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><ImageIcon size={14}/> +{task.imagesBase64.length - 1}</div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Plus size={40} className="text-white transform scale-75 group-hover:scale-100 transition-transform"/>
                </div>
              </div>
            )}
            
            <div className="p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-start gap-4 mb-3">
                 <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {task.type === TaskType.ANNOUNCEMENT && <Megaphone size={16} className="text-red-500"/>}
                    <h3 className={`font-bold text-lg text-gray-900 dark:text-white ${task.status === TaskStatus.COMPLETED && task.type === TaskType.TASK ? 'line-through' : ''}`}>{task.title}</h3>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 mt-2 font-semibold"><ClipboardCheck size={14} /> Asignado a: <span className="text-gray-800 dark:text-slate-200">{task.departmentName}</span></p>
                 </div>
                 {task.type === TaskType.TASK && <div className={`text-xs font-bold uppercase px-2 py-1 rounded-md border text-center ${getPriorityStyles(task.priority)}`}>{task.priority}</div>}
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800/50 flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-slate-500">
                  <p className="flex items-center gap-2"><UserIcon size={12} /><span>Por: {task.createdBy}</span></p>
                  <p className="flex items-center gap-2 mt-1"><Clock size={12} /><span>{new Date(task.createdAt).toLocaleDateString()}</span></p>
                </div>
                {task.comments && task.comments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                    <MessagesSquare size={16} />
                    <span>{task.comments.length}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
                 <div className="flex-1">
                  {task.status === TaskStatus.COMPLETED && task.completedAt ? (
                    <DeletionTimer completedAt={task.completedAt} />
                  ) : (
                    task.type === TaskType.TASK && <StatusButtons task={task} />
                  )}
                </div>
                {canManageTasks && task.status !== TaskStatus.COMPLETED && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditTaskModal(task); }} 
                      className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Editar Tarea"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(task); }}
                      className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Eliminar Tarea"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
          </div>
        )})}
        {!loading && filteredTasks.length === 0 && <div className="col-span-full text-center py-20 text-gray-400 dark:text-slate-600"><ClipboardCheck size={48} className="mx-auto mb-4 opacity-50"/><p className="font-bold text-lg">No hay tareas en esta vista</p></div>}
      </div>
    </div>
  );
};

export default Tasks;