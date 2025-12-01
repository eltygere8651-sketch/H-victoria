import React, { useEffect, useState, useRef } from 'react';
import { Task, AuthenticatedUser, Department, TaskStatus, TaskPriority } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessageSquare, Clock, Check, Image as ImageIcon, Camera, ArrowLeft, ArrowRight, MoreVertical, User as UserIcon } from 'lucide-react';
import { compressImage, fileToBase64 } from '../utils/imageCompressor';

interface TasksProps {
  currentUser: AuthenticatedUser;
}

const Tasks: React.FC<TasksProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const canManageTasks = currentUser.permissions.includes('CAN_MANAGE_TASKS');

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((data) => { setTasks(data); setLoading(false); });
    const unsubscribeDepartments = storageService.subscribeToDepartments(setDepartments);
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as HTMLElement).closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { unsubscribeTasks(); unsubscribeDepartments(); document.removeEventListener('mousedown', handleClickOutside); };
  }, [activeDropdown]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsCompressing(true);
    try {
      // FIX: Explicitly type `file` as `File` to resolve TS inference issue.
      const processedImages = await Promise.all(files.map(async (file: File) => {
        const compressedFile = await compressImage(file);
        return await fileToBase64(compressedFile);
      }));
      setEditingTask(prev => ({ ...prev, imagesBase64: [...(prev?.imagesBase64 || []), ...processedImages] }));
    } catch (error) { console.error("Image processing failed:", error); } 
    finally { setIsCompressing(false); if (e.target) e.target.value = ""; }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEditingTask(prev => ({ ...prev, imagesBase64: prev?.imagesBase64?.filter((_, index) => index !== indexToRemove) }));
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.title || !editingTask.departmentId) return;
    setIsSaving(true);
    try {
      const taskData: Partial<Task> = {
        ...editingTask,
        departmentName: departments.find(d => d.id === editingTask.departmentId)?.name || 'N/A',
        createdBy: editingTask.id ? editingTask.createdBy! : currentUser.name,
        createdById: editingTask.id ? editingTask.createdById! : currentUser.id,
        createdAt: editingTask.id ? editingTask.createdAt! : Date.now(),
      };
      await storageService.saveTask(taskData);
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) { console.error("Failed to save task:", error); } 
    finally { setIsSaving(false); }
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

  const openNewTaskModal = () => { setEditingTask({ imagesBase64: [] }); setShowTaskModal(true); };
  const openEditTaskModal = (task: Task) => { setEditingTask({ ...task }); setShowTaskModal(true); };
  
  const filteredTasks = tasks.filter(task => statusFilter === 'ALL' || task.status === statusFilter);
  const getPriorityStyles = (priority: TaskPriority) => ({ [TaskPriority.HIGH]:'border-red-500 text-red-700',[TaskPriority.MEDIUM]:'border-amber-500 text-amber-700',[TaskPriority.LOW]:'border-blue-500 text-blue-700'}[priority] || 'border-gray-300');
  const getStatusStyles = (status: TaskStatus) => ({ [TaskStatus.PENDING]:'bg-yellow-100 text-yellow-800',[TaskStatus.IN_PROGRESS]:'bg-blue-100 text-blue-800',[TaskStatus.COMPLETED]:'bg-green-100 text-green-800'}[status] || 'bg-gray-100');
  const statusTextMap = { [TaskStatus.PENDING]:'Pendiente', [TaskStatus.IN_PROGRESS]:'En Progreso', [TaskStatus.COMPLETED]:'Completada' };

  return (
    <div className="pb-24 md:pb-6">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold">Tareas</h2>
          {canManageTasks && <button onClick={openNewTaskModal}><Plus /></button>}
        </div>
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
            {(['ALL', ...Object.values(TaskStatus)]).map(s => <button key={s} onClick={() => setStatusFilter(s as any)} className={`flex-1 py-2 font-bold rounded-lg ${statusFilter === s ? 'bg-white shadow-md' : 'text-gray-500'}`}>{s === 'ALL' ? 'Todas' : statusTextMap[s]}</button>)}
        </div>
      </div>
      
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
            <h3>{editingTask?.id ? 'Editar' : 'Nueva'} Tarea</h3>
            <input value={editingTask?.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder="Título" />
            <textarea value={editingTask?.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} placeholder="Descripción"/>
            <div className="grid grid-cols-4 gap-3">
              {(editingTask?.imagesBase64 || []).map((img, i) => <div key={i} className="relative"><img src={img}/><button onClick={()=>handleRemoveImage(i)}>X</button></div>)}
              <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden"/>
              <button disabled={isCompressing} onClick={()=>fileInputRef.current?.click()}><ImageIcon/></button>
              <button disabled={isCompressing} onClick={()=>cameraInputRef.current?.click()}><Camera/></button>
              {isCompressing && <Loader2 className="animate-spin"/>}
            </div>
            <input value={editingTask?.location || ''} onChange={e=>setEditingTask({...editingTask, location: e.target.value})} placeholder="Ubicación" />
            <select value={editingTask?.priority || TaskPriority.MEDIUM} onChange={e=>setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}><option value={TaskPriority.LOW}>Baja</option><option value={TaskPriority.MEDIUM}>Media</option><option value={TaskPriority.HIGH}>Alta</option></select>
            <select value={editingTask?.departmentId || ''} onChange={e=>setEditingTask({...editingTask, departmentId: e.target.value})}><option value="" disabled>Asignar a...</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <button onClick={handleSaveTask} disabled={isSaving||isCompressing}>{isSaving||isCompressing?<Loader2/>:<Save/>}Guardar</button>
            <button onClick={()=>setShowTaskModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
      
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && tasks.length === 0 && <div className="col-span-full flex h-64 items-center justify-center"><Loader2 className="animate-spin"/></div>}
        {filteredTasks.map(task => (
          <div key={task.id} className={`bg-white rounded-2xl shadow-card-soft border overflow-hidden ${task.status === TaskStatus.COMPLETED ? 'opacity-60' : ''}`}>
            {task.imagesBase64?.[0] && <img src={task.imagesBase64[0]} onClick={()=>setViewingImages({images: task.imagesBase64!, startIndex: 0})} />}
            <div className="p-5">
              <h3 className={`font-bold ${task.status === TaskStatus.COMPLETED ? 'line-through' : ''}`}>{task.title}</h3>
              <p>{task.description}</p>
              <div className="flex justify-between items-center mt-4">
                 <select value={task.status} onChange={e=>handleStatusChange(task, e.target.value as TaskStatus)} className={getStatusStyles(task.status)}>
                    {Object.values(TaskStatus).map(s=><option key={s} value={s}>{statusTextMap[s]}</option>)}
                 </select>
                 {canManageTasks && <div><button onClick={()=>openEditTaskModal(task)}><Edit2/></button><button onClick={()=>handleDeleteClick(task)}><Trash2/></button></div>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {viewingImages && <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={()=>setViewingImages(null)}><button onClick={e=>{e.stopPropagation();setViewingImages(p=>p?{...p,startIndex:(p.startIndex-1+p.images.length)%p.images.length}:null)}}><ArrowLeft/></button><img src={viewingImages.images[viewingImages.startIndex]} className="max-w-[90vw] max-h-[90vh]"/><button onClick={e=>{e.stopPropagation();setViewingImages(p=>p?{...p,startIndex:(p.startIndex+1)%p.images.length}:null)}}><ArrowRight/></button></div>}
      {taskToDelete && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"><div className="bg-white p-6 rounded-lg"><h3>¿Eliminar Tarea?</h3><button onClick={confirmDelete}>Sí</button><button onClick={()=>setTaskToDelete(null)}>No</button></div></div>}
    </div>
  );
};

export default Tasks;