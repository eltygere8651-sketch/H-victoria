import React from 'react';
import { Task, TaskPriority, TaskStatus, TaskType } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Logo } from './Logo';
import * as storageService from '../services/storageService';

interface TaskPdfDocumentProps {
  task: Task;
  preview?: boolean;
}

export const TaskPdfDocument: React.FC<TaskPdfDocumentProps> = ({ task, preview = false }) => {
  const businessName = storageService.activeWorkspaceName || 'MI NEGOCIO';
  
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

  const isReservation = task.type === TaskType.RESERVATION;

  const A4_WIDTH = 794;
  const containerStyle: React.CSSProperties = preview ? {
      width: '100%',
      backgroundColor: 'white',
      padding: '20px',
      color: 'black'
  } : {
      width: `${A4_WIDTH}px`,
      padding: '50px',
      backgroundColor: 'white',
      color: 'black',
      boxSizing: 'border-box',
      display: 'block'
  };

  if (isReservation) {
    return (
      <div style={containerStyle} className="font-sans text-black">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <Logo size="lg" simple />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                Bono de Reserva
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.3em] mt-1 italic">
                Hub Hospitality System
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha Emisión</p>
            <p className="text-sm font-bold text-slate-900">{formatDate(Date.now())}</p>
            <p className="text-[10px] text-slate-400 mt-2">ID: {task.id?.substring(0, 8)}</p>
          </div>
        </div>

        {/* Reservation Info Grid */}
        <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
          <div className="bg-slate-50 p-5 col-span-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre a Cuota de</p>
            <p className="text-2xl font-black text-emerald-900 leading-tight">{task.title}</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha y Hora</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{task.reservationDate} a las {task.reservationTime}</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Comensales</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{task.guests} Personas</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación</p>
            <p className="text-lg font-bold text-slate-700 uppercase">{task.location}</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mesa Asignada</p>
            <p className="text-lg font-black text-slate-900">{task.tableNumber || 'Sin Asignar'}</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono de Contacto</p>
            <p className="text-base font-bold text-slate-900">{task.clientPhone || 'No registrado'}</p>
          </div>
          <div className="bg-slate-50 p-5 border-t border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tomada Por</p>
            <p className="text-base font-bold text-slate-900">{task.takenBy || task.createdBy}</p>
          </div>
        </div>

        {/* Description / Special Requests */}
        {task.description && (
          <div className="mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-600 pl-3 mb-4">
              Peticiones Especiales / Notas
            </h3>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl whitespace-pre-wrap text-slate-700 leading-relaxed italic text-sm">
              {task.description}
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-24 flex gap-12 justify-center italic">
          <div className="text-center w-48 pt-4 border-t border-dashed border-slate-300">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recepción / RR.PP</p>
          </div>
          <div className="text-center w-48 pt-4 border-t border-dashed border-slate-300">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente (Opcional)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-slate-300">
          <p className="text-[9px] font-bold uppercase tracking-widest">© {businessName} • Reservas</p>
          <p className="text-[9px] font-bold uppercase tracking-widest italic tracking-[0.2em]">Copia de Seguridad</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="font-sans text-black">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-red-600 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <Logo size="lg" simple />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
              Detalle de Tarea
            </h1>
            <p className="text-[10px] text-red-600 font-bold uppercase tracking-[0.3em] mt-1 italic">
              Hub Inteligence System
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha Emisión</p>
          <p className="text-sm font-bold text-slate-900">{formatDate(Date.now())}</p>
          <p className="text-[10px] text-slate-400 mt-2">ID: {task.id}</p>
        </div>
      </div>

      {/* Task Info Grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
        <div className="bg-slate-50 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Título de la Tarea</p>
          <p className="text-lg font-black text-slate-900 leading-tight">{task.title}</p>
        </div>
        <div className="bg-slate-50 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departamento</p>
          <p className="text-lg font-black text-slate-900 leading-tight">{task.departmentName}</p>
        </div>
        <div className="bg-slate-50 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable / Creador</p>
          <p className="text-base font-bold text-slate-700">{task.createdBy}</p>
        </div>
        <div className="bg-slate-50 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Actual</p>
          <p className="text-base font-black text-red-600">{getStatusText(task.status)}</p>
        </div>
        <div className="bg-slate-50 p-5 border-t border-slate-200">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prioridad</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${task.priority === TaskPriority.HIGH ? 'bg-red-600' : 'bg-blue-500'}`}></div>
            <p className={`text-base font-black ${task.priority === TaskPriority.HIGH ? 'text-red-700' : 'text-slate-900'}`}>
              {getPriorityText(task.priority)}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 p-5 border-t border-slate-200">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Límite</p>
          <p className="text-base font-bold text-slate-900">{formatDate(task.dueDate)}</p>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-red-600 pl-3 mb-4">
            Descripción Detallada
          </h3>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl whitespace-pre-wrap text-slate-700 leading-relaxed italic text-sm">
            {task.description}
          </div>
        </div>
      )}

      {/* Checklist */}
      {task.checklist && task.checklist.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-red-600 pl-3 mb-4">
            Lista de Verificación (Checklist)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {task.checklist.map((item) => (
              <div key={item.id} className="flex items-center p-3 bg-white border border-slate-100 rounded-xl">
                <div className="mr-4">
                  {item.isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-red-600/30">✓</div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.text}</p>
                  {item.isCompleted && item.completedBy && (
                    <p className="text-[9px] text-slate-400 font-medium">
                      Marcado por {item.completedBy} • {formatDate(item.completedAt)}
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
        <div className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-red-600 pl-3 mb-4 text-center">
            Evidencias Fotográficas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {task.imageUrls.map((url, index) => (
              <div key={index} className="aspect-square border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                <img src={url} alt={`Adjunto ${index + 1}`} className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Section */}
      <div className="mt-16 flex gap-12 justify-center italic">
        <div className="text-center w-48 pt-4 border-t border-dashed border-slate-300">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firma Emisor</p>
        </div>
        <div className="text-center w-48 pt-4 border-t border-dashed border-slate-300">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firma Responsable</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-slate-300">
        <p className="text-[9px] font-bold uppercase tracking-widest">© {businessName} • Management Hub</p>
        <p className="text-[9px] font-bold uppercase tracking-widest italic tracking-[0.2em]">Confidencial</p>
      </div>
    </div>
  );
};
