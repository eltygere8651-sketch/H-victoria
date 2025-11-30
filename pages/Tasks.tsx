import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, Flag, MapPin, MessageSquare, Clock, Check, Image as ImageIcon, Camera } from 'lucide-react';

interface TasksProps {
  currentUser: User;
}

const Tasks: React.FC<TasksProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((data) => {
      setTasks(data);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });
    return () => {
      unsubscribeTasks();
      unsubscribeDepartments();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editingTask) {
        // Set imageUrl to null to signal its removal. Keep imagePath for deletion in the service.
        setEditingTask({ ...editingTask, imageUrl: null });
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.title || !editingTask.departmentId) {
      alert('El título y el departamento asignado son obligatorios.');
      return;
    }

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
    };
    
    setLoading(true);
    await storageService.saveTask(taskData, imageFile);
    setLoading(false);
    setShowTaskModal(false);
    setEditingTask(null);
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
    }
  };

  const openNewTaskModal = () => {
    setEditingTask({});
    setImageFile(null);
    setImagePreview(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask({ ...task });
    setImageFile(null);
    setImagePreview(task.imageUrl || null);
    setShowTaskModal(true);
  };
  
  const filteredTasks = tasks.filter(task => statusFilter === 'ALL' || task.status === statusFilter);

  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case TaskPriority.MEDIUM: return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case TaskPriority.LOW: return 'border-gray-400 bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400';
      default: return 'border-gray-300 bg-gray-100';
    }
  };
  
  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TaskStatusPill = ({ status, task }: { status: TaskStatus, task: Task }) => (
    <div className="relative">
      <select value={status} onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)} className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-red-500 transition-colors ${getStatusStyles(status)}`}><option value={TaskStatus.PENDING}>Pendiente</option><option value={TaskStatus.IN_PROGRESS}>En Progreso</option><option value={TaskStatus.COMPLETED}>Completada</option></select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );

  return (
    <div className="pb-24 md:pb-6 font-sans">
      {/* Header and Filter Buttons */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Tareas e Incidencias</h2>
          <button onClick={openNewTaskModal} className="bg-red-600 text-white p-3 rounded-full shadow-lg shadow-button-red hover:bg-red-700 active:scale-95"><Plus size={24} /></button>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
{/* FIX: Use TaskStatus enum members directly in array to fix TypeScript error. */}
            {(['ALL', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>{s === 'ALL' ? 'Todas' : s === TaskStatus.PENDING ? 'Pendientes' : s === TaskStatus.IN_PROGRESS ? 'En Progreso' : 'Completadas'}</button>)}
        </div>
      </div>
      
      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingTask?.id ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <input value={editingTask?.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder="Título de la tarea (ej. Arreglar luz Hab. 205)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none font-bold text-gray-900 dark:text-white shadow-sm" />
              <textarea value={editingTask?.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} placeholder="Descripción adicional (opcional)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm h-24" />
              {/* Image Uploader */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Adjuntar Imagen (Opcional)</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 overflow-hidden">
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400 dark:text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" id="task-image-upload" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full mb-2 text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-lg hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white flex items-center justify-center gap-2"><Camera size={16}/> Subir Foto</button>
                    {(imagePreview) && <button onClick={removeImage} className="w-full text-sm text-red-600 dark:text-red-400 font-bold hover:underline">Quitar imagen</button>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={editingTask?.location || ''} onChange={e => setEditingTask({...editingTask, location: e.target.value})} placeholder="Ubicación (ej. Baño Hab. 205)" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm" />
                <select value={editingTask?.priority || TaskPriority.MEDIUM} onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm"><option value={TaskPriority.LOW}>Prioridad Baja</option><option value={TaskPriority.MEDIUM}>Prioridad Media</option><option value={TaskPriority.HIGH}>Prioridad Alta</option></select>
              </div>
              <select value={editingTask?.departmentId || ''} onChange={e => setEditingTask({...editingTask, departmentId: e.target.value})} className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm">
                <option value="" disabled>Asignar a departamento...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => {setShowTaskModal(false); setEditingTask(null);}} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveTask} disabled={loading} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400">
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Tarea</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation and Image Preview Modals */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border text-center">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Tarea?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Se eliminará permanentemente la tarea: <strong className="text-gray-800 dark:text-slate-200">{taskToDelete.title}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 dark:bg-slate-700/50 rounded-xl active:scale-[0.98]">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/80 z-10"><X size={32}/></button>
          <img src={fullScreenImage} alt="Vista ampliada" className="max-w-full max-h-full rounded-lg shadow-2xl"/>
        </div>
      )}

      {/* Task List */}
      <div className="p-4 md:p-6 space-y-4">
        {filteredTasks.map(task => (
          <div key={task.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-card-soft border ${task.status === TaskStatus.COMPLETED ? 'opacity-60' : ''}`}>
            {task.imageUrl && (
              <div className="mb-4 -mx-5 -mt-5 rounded-t-2xl overflow-hidden h-48 cursor-pointer" onClick={() => setFullScreenImage(task.imageUrl!)}>
                <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className={`font-bold text-xl text-gray-900 dark:text-white ${task.status === TaskStatus.COMPLETED ? 'line-through' : ''}`}>{task.title}</h3>
                <div className={`border-l-4 pl-3 mt-3 text-sm text-gray-500 dark:text-slate-400 ${getPriorityStyles(task.priority)}`}>Asignado a: <span className="font-bold text-gray-800 dark:text-slate-200">{task.departmentName}</span></div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <TaskStatusPill status={task.status} task={task} />
                <div className={`text-xs font-bold uppercase px-2 py-1 rounded-md border ${getPriorityStyles(task.priority)}`}>{task.priority}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 space-y-2 text-sm text-gray-600 dark:text-slate-400">
                {task.description && <p className="flex items-start gap-2"><MessageSquare size={14} className="mt-0.5"/><span>{task.description}</span></p>}
                {task.location && <p className="flex items-center gap-2"><MapPin size={14} /><span>{task.location}</span></p>}
                <p className="flex items-center gap-2"><Clock size={14} /><span>Creada por {task.createdBy} - {new Date(task.createdAt).toLocaleString()}</span></p>
                {task.status === TaskStatus.COMPLETED && task.completedBy && <p className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold"><Check size={14} /><span>Completada por {task.completedBy} - {new Date(task.completedAt!).toLocaleString()}</span></p>}
            </div>
            {currentUser.role === UserRole.ADMIN && (
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                <button onClick={() => openEditTaskModal(task)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                <button onClick={() => handleDeleteClick(task)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && <div className="text-center py-20 text-gray-400 dark:text-slate-600"><ClipboardCheck size={48} className="mx-auto mb-4 opacity-50"/><p className="font-bold text-lg">No hay tareas en esta vista</p></div>}
      </div>
    </div>
  );
};

export default Tasks;