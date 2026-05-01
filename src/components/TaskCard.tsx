import React from 'react';
import { Task, User, TaskStatus, TaskPriority, TaskChecklistItem, UserRole, TaskRecurrence } from '../types';
import { AlertTriangle, Edit2, Trash2, Share2, FileText, MessagesSquare, Check, Clock, Calendar, RotateCcw, Camera, Play, Video } from 'lucide-react';
import { DeletionTimer } from './DeletionTimer';
import { DailyResetTimer } from './DailyResetTimer';

interface TaskCardProps {
  task: Task;
  currentUser: User;
  onToggleChecklist: (task: Task, index: number) => void;
  onStart: (taskId: string) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComment: (taskId: string) => void;
  onShare: (task: Task) => void;
  onSharePdf: (task: Task) => void;
  onViewImages: (images: string[], index: number) => void;
}

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.HIGH: return 'bg-red-500 text-white';
    case TaskPriority.MEDIUM: return 'bg-amber-400 text-gray-900';
    case TaskPriority.LOW: return 'bg-blue-400 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

const getPriorityBorderClass = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.HIGH: return 'bg-red-500';
    case TaskPriority.MEDIUM: return 'bg-amber-400';
    case TaskPriority.LOW: return 'bg-blue-400';
    default: return 'bg-gray-400';
  }
};

const renderDescriptionWithHighlights = (text: string, isCompleted: boolean) => {
  if (!text) return null;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const content = part.slice(1, -1);
      return (
        <span 
          key={i} 
          className={`px-1.5 py-0.5 rounded-md font-black italic uppercase tracking-tight
            ${isCompleted 
              ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/50 shadow-sm'
            }`}
        >
          {content}
        </span>
      );
    }
    return part;
  });
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  currentUser,
  onToggleChecklist,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onComment,
  onShare,
  onSharePdf,
  onViewImages
}) => {
  const isUrgent = task.priority === TaskPriority.HIGH;
  const isCompleted = task.status === TaskStatus.COMPLETED;

  return (
    <div 
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
            {task.recurrence === TaskRecurrence.DAILY && (
              <span className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-1.5">
                <RotateCcw size={14} />
                Diaria (4h)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Public Share Button */}
            {currentUser.role === UserRole.ADMIN && (
              <>
                <button onClick={() => onShare(task)} title="Compartir Enlace Público" className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors shadow-sm">
                  <Share2 size={20} />
                </button>
                <button onClick={() => onSharePdf(task)} title="Compartir PDF por WhatsApp" className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors shadow-sm">
                  <FileText size={20} />
                </button>
              </>
            )}
            {(currentUser.role === UserRole.ADMIN || (currentUser.permissions?.includes('CAN_MANAGE_TASKS') && task.createdById === currentUser.id)) && (
              <>
                <button onClick={() => onEdit(task)} className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors shadow-sm">
                  <Edit2 size={20} />
                </button>
                <button onClick={() => onDelete(task)} className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shadow-sm">
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

          {/* Dates */}
          {(task.startDate || task.dueDate) && (
            <div className="flex flex-wrap gap-3 mb-4">
              {task.startDate && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <Clock size={14} />
                  <span>Inicio: {new Date(task.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              )}
              {task.dueDate && (
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${
                  !isCompleted && task.dueDate < Date.now() 
                    ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' 
                    : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                }`}>
                  <Calendar size={14} />
                  <span>Límite: {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              )}
            </div>
          )}
          
          {task.description && (
            <div className={`p-5 rounded-2xl border-l-4 mb-4
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
                {renderDescriptionWithHighlights(task.description, isCompleted)}
              </p>
            </div>
          )}

          {/* Checklist Display */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="space-y-2 mb-4">
              {task.checklist.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
                    item.isCompleted 
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                      : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => onToggleChecklist(task, index)}
                    className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                      item.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-transparent hover:border-green-500'
                    }`}
                  >
                    <Check size={16} strokeWidth={4} />
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-base font-bold ${
                      item.isCompleted 
                        ? 'text-gray-500 dark:text-slate-400 line-through decoration-2' 
                        : 'text-gray-800 dark:text-slate-200'
                    }`}>
                      {item.text}
                    </span>
                    {item.isCompleted && item.completedBy && (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mt-0.5">
                        ✓ {item.completedBy}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images & Videos */}
        {( (task.imageUrls && task.imageUrls.length > 0) || (task.videoUrls && task.videoUrls.length > 0) ) && (
          <div className="mb-6">
            {(task.imagesTitle || (task.videoUrls && task.videoUrls.length > 0)) && (
              <div className="flex items-center mb-4 ml-1 gap-2">
                {task.imagesTitle && (
                  <div className="flex items-center gap-2 bg-red-600 dark:bg-red-500 px-4 py-1.5 rounded-full shadow-[0_4px_15px_rgba(220,38,38,0.4)] transform -rotate-1">
                    <Camera size={14} className="text-white" />
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">
                      {task.imagesTitle}
                    </span>
                  </div>
                )}
                {task.videoUrls && task.videoUrls.length > 0 && (
                  <div className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 rounded-full shadow-[0_4px_15px_rgba(79,70,229,0.4)] transform rotate-1">
                    <Video size={14} className="text-white" />
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">
                      Videos
                    </span>
                  </div>
                )}
              </div>
            )}
            <div 
              className="flex gap-4 overflow-x-auto pb-2 no-scrollbar touch-pan-x snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Videos First */}
              {task.videoUrls?.map((url, i) => (
                <div 
                  key={`vid-${i}`} 
                  className="relative w-48 h-32 md:w-64 md:h-40 rounded-[1.5rem] border-2 border-indigo-100 dark:border-indigo-900/30 overflow-hidden flex-shrink-0 shadow-lg snap-start group/vid"
                >
                  <video 
                    src={url} 
                    className="w-full h-full object-cover" 
                    controls
                    preload="metadata"
                    playsInline
                    muted
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg backdrop-blur-md">
                    <Play size={16} className="text-white fill-white" />
                  </div>
                </div>
              ))}

              {/* Images */}
              {task.imageUrls?.map((url, i) => (
                <button 
                  key={`img-${i}`} 
                  onClick={() => onViewImages(task.imageUrls!, i)} 
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-[1.5rem] border-2 border-gray-100 dark:border-slate-800 overflow-hidden flex-shrink-0 hover:border-red-500 hover:scale-[1.02] transition-all shadow-lg snap-start group/img"
                >
                  <img src={url} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                    <FileText size={24} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            {/* Comments Button */}
            <button 
              onClick={() => onComment(task.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                (task.comments?.length || 0) > 0 
                  ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30' 
                  : 'bg-white text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              <MessagesSquare size={18} strokeWidth={2.5} />
              <span>{task.comments?.length || 0}</span>
            </button>

            {/* Action Buttons */}
            {task.status !== TaskStatus.COMPLETED && (
              <div className="flex gap-2 flex-1 sm:flex-none">
                {task.status === TaskStatus.PENDING && (
                  <button 
                    onClick={() => onStart(task.id)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Iniciar
                  </button>
                )}
                <button 
                  onClick={() => onComplete(task)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check size={16} strokeWidth={4} /> Completar
                </button>
              </div>
            )}
            
            {task.status === TaskStatus.COMPLETED && task.completedAt && (
              task.recurrence === TaskRecurrence.DAILY ? (
                <DailyResetTimer completedAt={task.completedAt} />
              ) : !task.recurrence || task.recurrence === TaskRecurrence.NONE ? (
                <DeletionTimer completedAt={task.completedAt} />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
