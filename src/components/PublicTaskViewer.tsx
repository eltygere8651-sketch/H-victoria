import React, { useEffect, useState, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority, TaskChecklistItem, TaskComment } from '../types';
import * as storageService from '../services/storageService';
import { db, auth } from '../firebaseConfig';
import { Loader2, Calendar, User, MapPin, Flag, AlertTriangle, CheckCircle2, ClipboardCheck, LogIn, Check, Clock, MessagesSquare, Send, X, Share2 } from 'lucide-react';
import { Logo } from './Logo';
import { ImageViewer } from './ImageViewer';
import { ShareModal } from './ShareModal';
import { DeletionTimer } from './DeletionTimer';
import { DailyResetTimer } from './DailyResetTimer';
import { TaskRecurrence } from '../types';
import { PremiumVideoPlayer } from './PremiumVideoPlayer';

interface PublicTaskViewerProps {
  taskId: string;
  setShowGuideModal: (show: boolean) => void;
}

export const PublicTaskViewer: React.FC<PublicTaskViewerProps> = ({ taskId, setShowGuideModal }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToTask(
      taskId, 
      (taskData) => {
        if (taskData) {
          setTask(taskData);
          setError('');
        } else {
          setError('La tarea no existe o ha sido eliminada.');
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading shared task:", err);
        setError('Error al cargar la información. Es posible que no tengas permisos o el enlace haya expirado.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [taskId]);

  // Reset logic for daily tasks
  useEffect(() => {
    const RESET_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 Hours
    const interval = setInterval(() => {
      if (!task || task.recurrence !== TaskRecurrence.DAILY || task.status !== TaskStatus.COMPLETED || !task.completedAt) return;
      
      const now = Date.now();
      if ((now - task.completedAt) >= RESET_WINDOW_MS) {
        storageService.resetDailyTask(task.id).catch(err => console.error('Error resetting task in public viewer:', err));
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [task]);

  const handleToggleChecklistItem = useCallback(async (itemIndex: number) => {
    if (!task || !task.checklist || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const updatedChecklist = [...task.checklist];
      const item = updatedChecklist[itemIndex];
      item.isCompleted = !item.isCompleted;
      
      if (item.isCompleted) {
        item.completedBy = auth.currentUser?.displayName || 'Invitado';
        item.completedAt = Date.now();
      } else {
        item.completedBy = undefined;
        item.completedAt = undefined;
      }
      
      const allCompleted = updatedChecklist.every(i => i.isCompleted);
      const updateData: any = { id: task.id, checklist: updatedChecklist };

      if (allCompleted && updatedChecklist.length > 0) {
        updateData.status = TaskStatus.COMPLETED;
        updateData.completedBy = auth.currentUser?.displayName || 'Invitado';
        updateData.completedAt = Date.now();
      }

      await storageService.saveTask(updateData);
    } catch (err) {
      console.error("Error updating checklist item:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [task, isUpdating]);

  const handleCompleteTask = useCallback(async () => {
    if (!task || isUpdating || task.status === TaskStatus.COMPLETED) return;

    setIsUpdating(true);
    try {
      await storageService.saveTask({ 
        id: task.id, 
        status: TaskStatus.COMPLETED,
        completedBy: auth.currentUser?.displayName || 'Invitado',
        completedAt: Date.now()
      });
    } catch (err) {
      console.error("Error completing task:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [task, isUpdating]);

  const handleAddComment = useCallback(async () => {
    if (!task || !newComment.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const comment: TaskComment = {
        id: 'c-' + Date.now(),
        userId: auth.currentUser?.uid || 'guest',
        userName: auth.currentUser?.displayName || 'Invitado',
        message: newComment.trim(),
        timestamp: Date.now()
      };

      const updatedComments = [...(task.comments || []), comment];
      await storageService.saveTask({ id: task.id, comments: updatedComments });
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [task, newComment, isUpdating]);

  const renderDescriptionWithHighlights = useCallback((text: string, isCompleted: boolean) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        const content = part.slice(1, -1);
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
  }, []);

  const handleGoToApp = () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    window.location.href = url.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => setShowGuideModal(true)}>
          <Logo size="lg" className="animate-pulse mb-6" />
        </div>
        <Loader2 size={32} className="animate-spin text-red-600" />
        <p className="mt-4 text-gray-500 font-medium">Cargando tarea compartida...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contenido no disponible</h1>
        <p className="text-gray-500 mb-8">{error}</p>
        <button onClick={handleGoToApp} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
          Ir a la Aplicación
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      <div className="flex flex-col">
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 shadow-sm">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={() => setShowGuideModal(true)}>
              <Logo size="sm" />
              <span className="font-extrabold text-xl text-gray-900 dark:text-white">Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowShareModal(true)}
                className="text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Share2 size={16} /> Compartir
              </button>
              <button 
                onClick={handleGoToApp}
                className="text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogIn size={16} /> Acceder
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-safe">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-800 overflow-hidden animate-slide-up">
            
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex justify-between items-start">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                  <ClipboardCheck size={16} />
                  Tarea Compartida
                </div>
                
                <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 ${
                  task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                  task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {task.status === TaskStatus.COMPLETED && <CheckCircle2 size={16}/>}
                  {task.status === TaskStatus.PENDING && 'Pendiente'}
                  {task.status === TaskStatus.IN_PROGRESS && 'En Progreso'}
                  {task.status === TaskStatus.COMPLETED && 'Completada'}
                </div>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mt-4 leading-tight">
                {task.title}
              </h1>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {task.description ? renderDescriptionWithHighlights(task.description, task.status === TaskStatus.COMPLETED) : 'Sin descripción adicional.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><MapPin size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Departamento</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{task.departmentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><User size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Publicado por</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{task.createdBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><Calendar size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Fecha</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{new Date(task.createdAt).toLocaleDateString()} <span className="text-sm font-normal text-gray-500">{new Date(task.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><Flag size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Prioridad</p>
                    <p className={`font-semibold ${
                        task.priority === TaskPriority.HIGH ? 'text-red-600' : 
                        task.priority === TaskPriority.MEDIUM ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {task.priority === TaskPriority.HIGH ? 'Alta' : task.priority === TaskPriority.MEDIUM ? 'Media' : 'Baja'}
                    </p>
                  </div>
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><Clock size={20} /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Fecha Límite</p>
                      <p className={`font-semibold ${!task.completedAt && task.dueDate < Date.now() ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist Section */}
              {task.checklist && task.checklist.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                    <ClipboardCheck size={20} className="text-red-600" />
                    Lista de Verificación
                  </h3>
                  <div className="grid gap-3">
                    {task.checklist.map((item, index) => (
                      <button
                        key={item.id}
                        disabled={isUpdating}
                        onClick={() => handleToggleChecklistItem(index)}
                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                          item.isCompleted 
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/30'
                        }`}
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-colors ${
                          item.isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-transparent'
                        }`}>
                          <Check size={16} strokeWidth={4} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-base font-bold ${
                            item.isCompleted 
                              ? 'text-gray-500 dark:text-slate-400 line-through decoration-2' 
                              : 'text-gray-800 dark:text-slate-200'
                          }`}>
                            {item.text}
                          </span>
                          {item.isCompleted && item.completedBy && (
                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mt-1">
                              ✓ Completado por {item.completedBy}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                  <MessagesSquare size={20} className="text-blue-600" />
                  Comentarios ({task.comments?.length || 0})
                </h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {task.comments?.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-4 rounded-2xl shadow-sm border ${
                        comment.userId === auth.currentUser?.uid 
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ml-4' 
                          : 'bg-gray-50/50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 mr-4'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                          {comment.userName}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">
                          {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                        {comment.message}
                      </p>
                    </div>
                  ))}
                  
                  {(!task.comments || task.comments.length === 0) && (
                    <div className="text-center py-6 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No hay comentarios aún</p>
                    </div>
                  )}
                </div>

                {/* Add Comment Input */}
                <div className="flex gap-2 items-center bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                  <input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-4 py-3 bg-transparent outline-none font-bold text-gray-700 dark:text-white placeholder-gray-400 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    disabled={isUpdating}
                  />
                  <button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim() || isUpdating}
                    className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 active:scale-95 transition-all shadow-md shrink-0"
                  >
                    <Send size={18} className="ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Complete Task Button */}
              {task.status !== TaskStatus.COMPLETED && (
                <div className="pt-4">
                  <button
                    disabled={isUpdating}
                    onClick={handleCompleteTask}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    {isUpdating ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={24} />
                        MARCAR TAREA COMO COMPLETADA
                      </>
                    )}
                  </button>
                </div>
              )}

              {task.status === TaskStatus.COMPLETED && task.completedAt && (
                <div className="pt-4 flex justify-center">
                  {task.recurrence === TaskRecurrence.DAILY ? (
                    <DailyResetTimer completedAt={task.completedAt} />
                  ) : (
                    <DeletionTimer completedAt={task.completedAt} />
                  )}
                </div>
              )}

              {task.videoUrls && task.videoUrls.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    Videos Adjuntos ({task.videoUrls.length})
                  </h3>
                  <div 
                    className="flex gap-4 overflow-x-auto pb-4 no-scrollbar touch-pan-x snap-x snap-mandatory"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {task.videoUrls.map((url, index) => (
                      <PremiumVideoPlayer key={`vid-${index}`} url={url} />
                    ))}
                  </div>
                </div>
              )}

              {task.imageUrls && task.imageUrls.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    Imágenes Adjuntas ({task.imageUrls.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {task.imageUrls.map((url, index) => (
                      <button 
                        key={index} 
                        onClick={() => setViewingImages({ images: task.imageUrls!, startIndex: index })}
                        className="aspect-square rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-opacity bg-gray-100 dark:bg-slate-800"
                      >
                        <img src={url} alt={`Adjunto ${index + 1}`} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)} 
          url={window.location.href} 
          title={task.title} 
        />

        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>Compartido vía Hub App</p>
        </footer>
      </div>

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