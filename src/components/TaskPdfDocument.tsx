import React from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskPdfDocumentProps {
  task: Task;
  preview?: boolean;
}

export const TaskPdfDocument: React.FC<TaskPdfDocumentProps> = ({ task, preview = false }) => {
  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'ALTA / URGENTE';
      case TaskPriority.MEDIUM: return 'MEDIA';
      case TaskPriority.LOW: return 'BAJA';
      default: return 'MEDIA';
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return 'PENDIENTE';
      case TaskStatus.IN_PROGRESS: return 'EN PROGRESO';
      case TaskStatus.COMPLETED: return 'COMPLETADA';
      default: return 'PENDIENTE';
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'No definida';
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm", { locale: es });
  };

  return (
    <div className={`bg-white text-black font-sans ${preview ? 'w-full h-full overflow-auto' : 'w-[794px] min-h-[1123px] p-12 mx-auto'}`}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Detalle de Tarea
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            ID: {task.id}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Fecha de Creación</p>
          <p className="text-lg font-medium">{formatDate(task.createdAt)}</p>
        </div>
      </div>

      {/* Task Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título</p>
          <p className="text-lg font-bold text-slate-900">{task.title}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Departamento</p>
          <p className="text-lg font-bold text-slate-900">{task.departmentName}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Creado por</p>
          <p className="text-lg font-bold text-slate-900">{task.createdBy}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</p>
          <p className="text-lg font-bold text-slate-900">{getStatusText(task.status)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Prioridad</p>
          <p className={`text-lg font-bold ${task.priority === TaskPriority.HIGH ? 'text-red-600' : 'text-slate-900'}`}>
            {getPriorityText(task.priority)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Límite</p>
          <p className="text-lg font-bold text-slate-900">{formatDate(task.dueDate)}</p>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            Descripción
          </h3>
          <div className="bg-white border border-slate-200 p-6 rounded-xl whitespace-pre-wrap text-slate-700">
            {task.description}
          </div>
        </div>
      )}

      {/* Checklist */}
      {task.checklist && task.checklist.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            Checklist
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {task.checklist.map((item, index) => (
              <div key={item.id} className={`flex items-start p-4 ${index !== task.checklist!.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="mt-0.5 mr-3">
                  {item.isCompleted ? (
                    <div className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center">✓</div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-slate-300"></div>
                  )}
                </div>
                <div>
                  <p className={`text-slate-800 ${item.isCompleted ? 'line-through text-slate-500' : ''}`}>{item.text}</p>
                  {item.isCompleted && item.completedBy && (
                    <p className="text-xs text-slate-400 mt-1">
                      Completado por {item.completedBy} el {formatDate(item.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {task.imageUrls && task.imageUrls.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            Imágenes Adjuntas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {task.imageUrls.map((url, index) => (
              <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                <img src={url} alt={`Adjunto ${index + 1}`} className="w-full h-auto object-contain max-h-64" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>Documento generado el {formatDate(Date.now())}</p>
      </div>
    </div>
  );
};
