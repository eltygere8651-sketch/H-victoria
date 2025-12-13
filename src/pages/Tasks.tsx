import React, { useEffect, useState, useRef } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority, UserRole, TaskType, TaskComment } from '../types';
import * as storageService from '../services/storageService';
import { ClipboardCheck, Plus, X, Save, Loader2, Edit2, Trash2, ChevronDown, MessagesSquare, Check, Camera, AlertTriangle, Share2, Send, Image, Info, Flame, Bold } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { ImageViewer } from '../components/ImageViewer';
import { DeletionTimer } from '../components/DeletionTimer';
import { ShareModal } from '../components/ShareModal';

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

  const handleShareTask = (task: Task) => {
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

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-600 text-white shadow-red-200';
      case TaskPriority.MEDIUM: return 'bg-amber-500 text-white shadow-amber-200';
      case TaskPriority.LOW: return 'bg-blue-500 text-white shadow-blue-200';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityBorderClass = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-600';
      case TaskPriority.MEDIUM: return 'bg-amber-500';
      case TaskPriority.LOW: return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  // Improved Parser: Uses *asterisks* which are safer for normal language (vs !exclamation!).
  // Splits by *...* allowing mixed content.
  const renderDescriptionWithHighlights = (text: string, isCompleted: boolean) => {
    if (!text) return null;
    
    // Split by segments enclosed in asterisks e.g. "Clean the *kitchen* now" -> ["Clean the ", "*kitchen*", " now"]
    // The regex captures the delimiter so we can process it.
    const parts = text.split(/(\*[^*]+\*)/g);

    return parts.map((part, index) => {
      // Check if matches *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        const content = part.slice(1, -1); // Remove *
        return (
          <span 
            key={index} 
            className={`${isCompleted ? '' : 'text-red-700 dark:text-red-400 font-black bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded-md mx-0.5 tracking-wide border border-red-200 dark:border-red-800/50 shadow-sm'}`}
          >
            {content}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const filteredTasks = allTasks.filter(task => {
    const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
    const deptMatch = departmentFilter === 'ALL' || task.departmentId === departmentFilter;
    return statusMatch && deptMatch;
  });

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="font-sans pb-24 bg-gray-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 px-4 py-4 md:px-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic drop-shadow-sm">
              Tareas <span className="text-red-600">Activas</span>
            </h2>
          </div>
          {/* Only Admins or Staff with 'CAN_MANAGE_TASKS' permission can create new tasks */}
          {canManageTasks && (
            <button 
              onClick={() => {
                setEditingTask({});
                setSelectedImages([]);
                setPreviews([]);
                setShowTaskModal(true);
              }}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-gray-400/20 hover:scale-105 transition-transform active:scale-95 border-2 border-transparent hover:border-gray-200 dark:hover:border-slate-700"
            >
              <Plus size={32} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
           <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm"
          >
            <option value="ALL">Todos los Estados</option>
            <option value={TaskStatus.PENDING}>Pendientes</option>
            <option value={TaskStatus.IN_PROGRESS}>En Curso</option>
            <option value={TaskStatus.COMPLETED}>Completadas</option>
          </select>

          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none dark:text-white shadow-sm"
          >
            <option value="ALL">Todos los Dptos.</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-10">
        
        {/* SECTION: TASKS (HIGH IMPACT ACTION STYLE) */}
        <div className="space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-dashed border-gray-200 dark:border-slate-800 shadow-inner">
              <ClipboardCheck size={80} className="mx-auto mb-6 text-gray-300 dark:text-slate-700" />
              <p className="text-3xl font-black text-gray-400 dark:text-slate-600 uppercase tracking-tighter">Sin Tareas Activas</p>
              <p className="text-gray-400 dark:text-slate-500 font-medium mt-2">¡Todo al día!</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isUrgent = task.priority === TaskPriority.HIGH;
              const isCompleted = task.status === TaskStatus.COMPLETED;

              return (
                <div 
                  key={task.id} 
                  className={`
                    relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl dark:shadow-black/50 
                    border border-gray-100 dark:border-slate-800
                    hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group
                    overflow-hidden w-full
                  `}
                >
                  {/* Visual Priority Strip (Side) */}
                  <div className={`absolute left-0 top-0 bottom-0 w-3 md:w-4 ${getPriorityBorderClass(task.priority)}`}></div>

                  <div className="pl-6 md:pl-8 p-6 flex flex-col h-full">
                     {/* Header Row */}
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                        <div className="flex flex-wrap gap-2 items-center">
                           <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${getPriorityColor(task.priority)}`}>
                              {task.priority === TaskPriority.HIGH ? <><AlertTriangle size={14} className="inline mr-1 mb-0.5"/>URGENTE</> : task.priority === TaskPriority.MEDIUM ? 'PRIORIDAD MEDIA' : 'BAJA'}
                           </span>
                           <span className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-slate-700">
                              {task.departmentName}
                           </span>
                        </div>
                        
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          {/* Public Share Button */}
                          {currentUser.role === UserRole.ADMIN && (
                            <button onClick={() => handleShareTask(task)} className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors shadow-sm">
                              <Share2 size={20} />
                            </button>
                          )}
                          {(currentUser.role === UserRole.ADMIN || (currentUser.permissions?.includes('CAN_MANAGE_TASKS') && task.createdById === currentUser.id)) && (
                            <>
                               <button onClick={() => { setEditingTask(task); setShowTaskModal(true); }} className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors shadow-sm">
                                  <Edit2 size={20} />
                               </button>
                               <button onClick={() => setTaskToDelete(task)} className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shadow-sm">
                                  <Trash2 size={20} />
                               </button>
                            </>
                          )}
                        </div>
                     </div>

                     {/* Main Content */}
                     <div className="mb-6">
                        {/* Title - Red if Urgent and Not Completed */}
                        <h3 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.9] mb-4 break-words 
                          ${isCompleted 
                            ? 'text-gray-900 dark:text-white line-through decoration-4 decoration-gray-300 dark:decoration-slate-700 opacity-60' 
                            : isUrgent 
                              ? 'text-red-600 dark:text-red-500 drop-shadow-sm' 
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>
                        
                        {task.description && (
                           <div className={`p-5 rounded-2xl border-l-4 
                             ${isUrgent && !isCompleted
                               ? 'bg-red-50 dark:bg-red-900/10 border-red-500' 
                               : 'bg-gray-50 dark:bg-slate-800/50 border-gray-300 dark:border-slate-600'
                             }`}
                           >
                             <p className={`text-lg md:text-xl font-bold leading-snug whitespace-pre-wrap 
                               ${isCompleted 
                                 ? 'text-gray-700 dark:text-slate-300 opacity-60' 
                                 : isUrgent 
                                   ? 'text-red-800 dark:text-red-300' 
                                   : 'text-gray-700 dark:text-slate-300'
                               }`}
                             >
                               {/* Use the new renderer function here */}
                               {renderDescriptionWithHighlights(task.description, isCompleted)}
                             </p>
                           </div>
                        )}
                     </div>

                     {/* Images */}
                     {task.imageUrls && task.imageUrls.length > 0 && (
                       <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
                          {task.imageUrls.map((url, i) => (
                            <button key={i} onClick={() => setViewingImages({ images: task.imageUrls!, startIndex: i })} className="relative w-28 h-28 rounded-2xl border-2 border-gray-100 dark:border-slate-700 overflow-hidden flex-shrink-0 hover:border-red-500 transition-colors shadow-md">
                               <img src={url} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          ))}
                       </div>
                     )}

                     {/* Footer Actions */}
                     <div className="mt-auto pt-5 border-t-2 border-gray-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                        
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-bold text-gray-500 dark:text-slate-400 shadow-inner text-sm">
                             {task.createdBy.charAt(0)}
                           </div>
                           <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{task.createdBy}</span>
                              <span className="text-xs font-bold text-gray-400 dark:text-slate-500">{new Date(task.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Comments Button */}
                            <button 
                              onClick={() => setActiveCommentTaskId(task.id)}
                              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                                (task.comments?.length || 0) > 0 
                                  ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30' 
                                  : 'bg-white text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-gray-50'
                              }`}
                            >
                               <MessagesSquare size={20} strokeWidth={2.5} />
                               <span>{task.comments?.length || 0}</span>
                            </button>

                            {/* Action Buttons */}
                            {task.status !== TaskStatus.COMPLETED && (
                              <div className="flex gap-2">
                                 {task.status === TaskStatus.PENDING && (
                                   <button 
                                     onClick={() => storageService.saveTask({ id: task.id, status: TaskStatus.IN_PROGRESS })}
                                     className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                                   >
                                     Iniciar
                                   </button>
                                 )}
                                 <button 
                                   onClick={() => storageService.saveTask({ id: task.id, status: TaskStatus.COMPLETED, completedBy: currentUser.name, completedAt: Date.now() })}
                                   className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                                 >
                                   <Check size={20} strokeWidth={4} /> Completar
                                 </button>
                              </div>
                            )}
                            
                            {task.status === TaskStatus.COMPLETED && task.completedAt && (
                              <DeletionTimer completedAt={task.completedAt} />
                            )}
                        </div>
                     </div>
                     
                     {/* Comments Section Removed from here and moved to a global modal */}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
                     value={editingTask?.title || ''}
                     onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                     className="w-full px-5 py-4 text-xl font-black bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white placeholder-gray-400"
                     placeholder="¿QUÉ HAY QUE HACER?"
                     autoFocus
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Departamento</label>
                      <div className="relative">
                        <select 
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
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTask} 
                  disabled={isSaving || isCompressing}
                  className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-button-red active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                >
                  {isSaving || isCompressing ? <Loader2 className="animate-spin" strokeWidth={3} /> : <Save size={22} strokeWidth={3} />}
                  {isSaving ? 'Guardando...' : isCompressing ? 'Procesando...' : 'PUBLICAR TAREA'}
                </button>
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

    </div>
  );
};

export default Tasks;