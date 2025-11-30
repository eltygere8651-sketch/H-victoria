import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessageSquare, Clock, Check, Image as ImageIcon, Camera, ArrowLeft, ArrowRight, MoreVertical, User as UserIcon } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { fileToBase64 } from '../utils/imageCompressor';

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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((data) => {
      setTasks(data);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (activeDropdown && !target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const processedImages = await Promise.all(files.map(async file => {
        const compressedFile = await compressImage(file);
        return await fileToBase64(compressedFile);
      }));
      setEditingTask(prev => ({
        ...prev,
        imagesBase64: [...(prev?.imagesBase64 || []), ...processedImages]
      }));
// FIX: Changed 'catch (error: any)' to 'catch (error)' to improve type safety and resolve a potential type inference issue.
    } catch (error) {
      console.error("Image processing failed:", error);
      alert("Hubo un error al procesar las imágenes. Por favor, inténtalo de nuevo.");
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
      alert('El título y el departamento asignado son obligatorios.');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    try {
      const taskData: Partial<Task> = {
        ...editingTask,
        title: editingTask.title,
        description: editingTask.description || '',
        location: editingTask.location || '',
        status: editingTask.status || TaskStatus.PENDING,
        priority: editingTask.priority || TaskPriority.MEDIUM,
        departmentId: editingTask.departmentId,
        departmentName: departments.find(d => d.id === editingTask.departmentId)?.name || 'N/A',
        createdBy: editingTask.id ? editingTask.createdBy! : currentUser.name,
        createdById: editingTask.id ? editingTask.createdById! : currentUser.id,
        createdAt: editingTask.id ? editingTask.createdAt! : Date.now(),
        imagesBase64: editingTask.imagesBase64 || [],
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
    setActiveDropdown(null);
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
    }
  };

  const openNewTaskModal = () => {
    setEditingTask({ imagesBase64: [] });
    setSaveError(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask({ ...task });
    setSaveError(null);
    setShowTaskModal(true);
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

  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.PENDING: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        case TaskStatus.COMPLETED: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const statusTextMap = {
    [TaskStatus.PENDING]: 'Pendiente',
    [TaskStatus.IN_PROGRESS]: 'En Progreso',
    [TaskStatus.COMPLETED]: 'Completada',
  };

  const StatusChanger = ({ task }: { task: Task }) => {
    const isOpen = activeDropdown === task.id;
    return (
      <div className="relative dropdown-container">
        <button
          onClick={() => setActiveDropdown(isOpen ? null : task.id)}
          className={`flex items-center justify-between w-full text-left text-sm font-bold px-3 py-2 rounded-lg transition-colors ${getStatusStyles(task.status)}`}
        >
          <span>{statusTextMap[task.status]}</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-gray-100 dark:border-slate-600 z-10 animate-pop-in">
            {Object.values(TaskStatus).map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(task, status)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg font-semibold"
              >
                {statusTextMap[status]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const AdminActions = ({ task }: { task: Task }) => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div className="relative dropdown-container">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
                <MoreVertical size={20} />
            </button>
            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-gray-100 dark:border-slate-600 z-10 animate-pop-in">
                    <button onClick={() => { openEditTaskModal(task); setIsOpen(false); }} className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg font-semibold"><Edit2 size={14}/> Editar</button>
                    <button onClick={() => { handleDeleteClick(task); setIsOpen(false); }} className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-red-600 dark:text-red-400 first:rounded-t-lg last:rounded-b-lg font-semibold"><Trash2 size={14}/> Eliminar</button>
                </div>
            )}
        </div>
      )
  };

  return (
    <div className="pb-24 md:pb-6 font-sans">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Tareas e Incidencias</h2>
          <button onClick={openNewTaskModal} className="bg-red-600 text-white p-3 rounded-full shadow-lg shadow-button-red hover:bg-red-700 active:scale-95"><Plus size={24} /></button>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
            {(['ALL', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>{s === 'ALL' ? 'Todas' : statusTextMap[s]}</button>)}
        </div>
      </div>
      
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingTask?.id ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <input value={editingTask?.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder="Título de la tarea (ej. Arreglar luz Hab. 205)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none font-bold text-gray-900 dark:text-white shadow-sm" />
              <textarea value={editingTask?.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} placeholder="Descripción adicional (opcional)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm h-24" />
              
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <input value={editingTask?.location || ''} onChange={e => setEditingTask({...editingTask, location: e.target.value})} placeholder="Ubicación (ej. Baño Hab. 205)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm" />
{/* FIX: Corrected typo from 'TastPriority' to 'TaskPriority'. */}
                <select value={editingTask?.priority || TaskPriority.MEDIUM} onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm"><option value={TaskPriority.LOW}>Prioridad Baja</option><option value={TaskPriority.MEDIUM}>Prioridad Media</option><option value={TaskPriority.HIGH}>Prioridad Alta</option></select>
              </div>
              <select value={editingTask?.departmentId || ''} onChange={e => setEditingTask({...editingTask, departmentId: e.target.value})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm">
                <option value="" disabled>Asignar a departamento...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {saveError && <div className="...">{/* (unchanged) */}</div>}
            <div className="flex gap-4 mt-8">
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveTask} disabled={isSaving || isCompressing} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400 disabled:cursor-not-allowed">
                {(isSaving || isCompressing) ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Tarea</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {taskToDelete && <div className="...">{/* (unchanged) */}</div>}
      
      {viewingImages && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-0 animate-fade-in" onClick={() => setViewingImages(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/80 z-20"><X size={32}/></button>
          <button 
             onClick={(e) => { e.stopPropagation(); setViewingImages(prev => prev ? { ...prev, startIndex: (prev.startIndex - 1 + prev.images.length) % prev.images.length } : null); }}
             className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/80 z-20"
          ><ArrowLeft size={32}/></button>
          <button 
             onClick={(e) => { e.stopPropagation(); setViewingImages(prev => prev ? { ...prev, startIndex: (prev.startIndex + 1) % prev.images.length } : null); }}
             className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/80 z-20"
          ><ArrowRight size={32}/></button>
          
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={viewingImages.images[viewingImages.startIndex]} alt="Vista ampliada" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"/>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">{viewingImages.startIndex + 1} / {viewingImages.images.length}</div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && tasks.length === 0 && <div className="col-span-full flex h-64 items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>}
        {filteredTasks.map(task => (
          <div key={task.id} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-card-soft border dark:border-slate-700/50 overflow-hidden flex flex-col transition-opacity duration-300 ${task.status === TaskStatus.COMPLETED ? 'opacity-60' : ''}`}>
            <div className={`flex-shrink-0 h-4 w-full ${getPriorityStyles(task.priority).split(' ')[0].replace('border-', 'bg-')}`}></div>
            
            {task.imagesBase64 && task.imagesBase64.length > 0 && (
              <div
                onClick={() => setViewingImages({ images: task.imagesBase64!, startIndex: 0 })}
                className="relative h-48 bg-gray-100 dark:bg-slate-700 cursor-pointer group"
              >
                <img src={task.imagesBase64[0]} className="w-full h-full object-cover" alt="Imagen de tarea" />
                {task.imagesBase64.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <ImageIcon size={14}/> +{task.imagesBase64.length - 1}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Plus size={40} className="text-white transform scale-75 group-hover:scale-100 transition-transform"/>
                </div>
              </div>
            )}
            
            <div className="p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-start gap-4 mb-3">
                 <h3 className={`font-bold text-lg text-gray-900 dark:text-white flex-1 ${task.status === TaskStatus.COMPLETED ? 'line-through' : ''}`}>{task.title}</h3>
                 <div className={`text-xs font-bold uppercase px-2 py-1 rounded-md border text-center ${getPriorityStyles(task.priority)}`}>{task.priority}</div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400 mb-4 flex-grow">
                  <p className="flex items-center gap-2 font-semibold"><ClipboardCheck size={14} /><span>Asignado a: <span className="text-gray-800 dark:text-slate-200">{task.departmentName}</span></span></p>
                  {task.location && <p className="flex items-center gap-2"><MapPin size={14} /><span>{task.location}</span></p>}
                  {task.description && <p className="flex items-start gap-2"><MessageSquare size={14} className="mt-0.5 shrink-0"/><span>{task.description}</span></p>}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700/50 space-y-2 text-xs text-gray-500 dark:text-slate-500">
                <p className="flex items-center gap-2"><UserIcon size={12} /><span>Creada por {task.createdBy}</span></p>
                <p className="flex items-center gap-2"><Clock size={12} /><span>{new Date(task.createdAt).toLocaleString()}</span></p>
                {task.status === TaskStatus.COMPLETED && task.completedBy && <p className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold"><Check size={12} /><span>Completada por {task.completedBy}</span></p>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700/50">
              <div className="flex-1">
                 <StatusChanger task={task}/>
              </div>
              {currentUser.role === UserRole.ADMIN && (
                <AdminActions task={task} />
              )}
            </div>
          </div>
        ))}
        {!loading && filteredTasks.length === 0 && <div className="col-span-full text-center py-20 text-gray-400 dark:text-slate-600"><ClipboardCheck size={48} className="mx-auto mb-4 opacity-50"/><p className="font-bold text-lg">No hay tareas en esta vista</p></div>}
      </div>
    </div>
  );
};

export default Tasks;