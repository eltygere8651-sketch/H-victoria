import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus, TaskPriority, TaskChecklistItem, UserRole, TaskRecurrence, TaskType } from '../types';
import { AlertTriangle, Edit2, Trash2, Share2, FileText, MessagesSquare, Check, Clock, Calendar, RotateCcw, Camera, Play, Video, Megaphone, Info, ConciergeBell, Users, Hash, Phone, Sparkles, MapPin, Utensils } from 'lucide-react';
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
  onToggleArrival?: (task: Task) => void;
  onView?: (task: Task) => void;
}

const ArrivedTimer: React.FC<{ arrivedAt: number }> = ({ arrivedAt }) => {
  const getInitialTimeLeft = () => {
    const deletionTime = arrivedAt + 4 * 60 * 60 * 1000; // 4 hours
    const difference = deletionTime - Date.now();
    
    if (difference <= 0) {
      return 'Saliendo...';
    }
    
    const hours = Math.floor((difference / (1000 * 60 * 60)));
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getInitialTimeLeft());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [arrivedAt]);
  
  return (
    <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-sm border border-orange-500/20 text-orange-700 font-sans shadow-sm">
      <Clock size={10} className="animate-pulse" />
      <span className="text-[9px] font-black uppercase tracking-widest leading-none">Auto-Sale en: {timeLeft}</span>
    </div>
  );
};

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

const renderDescriptionWithHighlights = (text: string, isCompleted: boolean, isAnnouncement: boolean) => {
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
              : isAnnouncement
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-900/50 shadow-sm'
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
  onViewImages,
  onToggleArrival,
  onView
}) => {
  const isUrgent = task.priority === TaskPriority.HIGH;
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isAnnouncement = task.type === TaskType.ANNOUNCEMENT;
  const isReservation = task.type === TaskType.RESERVATION;

  // Premium reservation background style - Heritage Hospitality Edition
  const reservationStyle = isReservation ? {
    border: '1px solid rgba(6, 78, 59, 0.1)',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
  } : {};

  // Heritage Hospitality Background Pattern
  const LuxuryPattern = () => (
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden select-none">
      <div className="absolute -top-12 -right-12 transform rotate-12">
        <ConciergeBell size={240} strokeWidth={0.5} />
      </div>
      <div className="absolute inset-0" style={{ 
        backgroundImage: `radial-gradient(circle at 1.5px 1.5px, #064E3B 1px, transparent 0)`, 
        backgroundSize: '32px 32px' 
      }} />
    </div>
  );

  // Custom colors for locations if it's a reservation
  const getLocationColors = (location?: string) => {
    if (!isReservation) return "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100 text-emerald-600 dark:text-emerald-400 text-emerald-400";
    
    switch (location) {
      case 'terraza': return "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-100 text-blue-700 dark:text-blue-400 text-blue-400";
      case 'salon_c': return "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30 text-purple-900 dark:text-purple-100 text-purple-700 dark:text-purple-400 text-purple-400";
      case 'gastro_bar': return "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-100 text-rose-700 dark:text-rose-400 text-rose-400";
      case 'cafeteria': return "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30 text-orange-900 dark:text-orange-100 text-orange-700 dark:text-orange-400 text-orange-400";
      case 'eventos': return "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-900 dark:text-amber-100 text-amber-700 dark:text-amber-400 text-amber-400";
      case 'piscina': return "bg-cyan-50 dark:bg-cyan-900/10 border-cyan-100 dark:border-cyan-900/30 text-cyan-900 dark:text-cyan-100 text-cyan-700 dark:text-cyan-400 text-cyan-400";
      default: return "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100 text-emerald-700 dark:text-emerald-400 text-emerald-400";
    }
  };

  const colors = getLocationColors(task.location);
  const colorParts = colors.split(' ');
  const bgClass = colorParts[0] + ' ' + colorParts[1];
  const borderClass = colorParts[2] + ' ' + colorParts[3];
  const textTitleClass = colorParts[4] + ' ' + colorParts[5];
  const iconClass = colorParts[6] + ' ' + colorParts[7];
  const labelClass = colorParts[8];

  return (
    <div 
      onClick={isReservation ? (e) => onView?.(task) : undefined}
      style={reservationStyle}
      className={`
        relative bg-[#FCFAF7] dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] shadow-xl dark:shadow-black/50 
        border border-gray-100 dark:border-slate-800
        ${isReservation ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.01]' : 'hover:shadow-2xl hover:-translate-y-1'} transition-all duration-500 group
        overflow-hidden w-full
        ${isAnnouncement ? 'border-l-0 bg-indigo-50/10 dark:bg-indigo-900/5' : ''}
        ${isReservation ? 'border-l-4 border-l-emerald-500 ring-1 ring-emerald-500/10' : ''}
      `}
    >
      {/* Visual Priority Strip (Side) - Only for tasks */}
      {!isAnnouncement && !isReservation && <div className={`absolute left-0 top-0 bottom-0 w-3 md:w-4 ${getPriorityBorderClass(task.priority)}`}></div>}

      {/* Announcement Icon - Subtle background for announcements */}
      {isAnnouncement && (
        <div className="absolute top-4 right-4 text-indigo-600/10 dark:text-indigo-400/10 pointer-events-none transform -rotate-12">
          <Megaphone size={120} strokeWidth={1} />
        </div>
      )}
      
      {/* Reservation Icon - Subtle background */}
      {isReservation && (
        <div className="absolute -top-4 -right-4 text-emerald-600/5 dark:text-emerald-400/5 pointer-events-none transform -rotate-12 group-hover:scale-110 transition-transform duration-700">
          <ConciergeBell size={100} strokeWidth={1} />
        </div>
      )}

      <div className={`${isAnnouncement ? 'pl-6 md:pl-8' : isReservation ? 'p-0' : 'pl-4 md:pl-8'} ${isReservation ? '' : 'p-4 md:p-6'} flex flex-col h-full relative z-10`}>
        {isReservation && <LuxuryPattern />}
        
        {/* Ultra-Compact Layout for Arrived Clients */}
        {isReservation && task.clientArrived && (
          <div className="p-3 flex flex-col gap-2 relative z-20">
             {/* Header */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="bg-[#064E3B] px-1.5 py-0.5 rounded-sm">
                      <span className="text-[8px] font-black text-[#FCFAF7] uppercase tracking-[0.25em]">{task.location}</span>
                   </div>
                   {task.eventType && (
                     <div className="border border-[#064E3B]/20 bg-white/50 backdrop-blur-sm px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                        <Sparkles size={7} className="text-[#064E3B]" />
                        <span className="text-[8px] font-black text-[#064E3B] uppercase tracking-widest">{task.eventType}</span>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                   <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                      <Check size={7} className="text-emerald-600" />
                      <span className="text-[7px] font-black text-emerald-700 uppercase tracking-widest">EN MESA</span>
                   </div>
                   {task.arrivedAt && <ArrivedTimer arrivedAt={task.arrivedAt} />}
                </div>
             </div>

             {/* Main Info Row */}
             <div className="flex items-center gap-3 border-y border-[#064E3B]/10 py-2">
                {/* Table Jewel */}
               <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border-[2px] border-[#064E3B] shadow-sm bg-white" />
                  <div className="absolute inset-[1.5px] bg-[#064E3B] rounded-full shadow-inner" />
                  <div className="relative z-10 flex flex-col items-center -space-y-0.5">
                     <span className="text-[5px] md:text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">MESA</span>
                     <span className="text-xl md:text-2xl font-black text-white italic tracking-tighter shadow-sm leading-none">{task.tableNumber}</span>
                  </div>
               </div>
               
               <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <h3 className="text-base md:text-xl font-black text-[#064E3B] leading-none tracking-tight uppercase mb-1 truncate">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[#064E3B]/80 flex-wrap">
                     <span className="text-[10px] md:text-xs font-black tracking-widest">{task.guests} PAX</span>
                     <div className="w-1 h-1 rounded-full bg-[#064E3B]/30" />
                     <span className="text-[10px] md:text-xs font-bold">{task.reservationTime}</span>
                     {task.clientPhone && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-[#064E3B]/30 hidden sm:block" />
                          <div className="flex items-center gap-1">
                             <Phone size={8} className="hidden sm:block" />
                             <span className="text-[9px] md:text-[10px] font-bold">{task.clientPhone}</span>
                          </div>
                        </>
                     )}
                  </div>
               </div>
             </div>

             {/* Notes / Details Row */}
             {(task.description || task.takenBy) && (
             <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {task.description && (
                    <p className="text-[9px] md:text-[10px] text-[#064E3B]/70 font-bold truncate">
                      {task.description}
                    </p>
                  )}
                </div>
                {task.takenBy && (
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-60">
                     <span className="text-[6px] font-black text-[#064E3B] uppercase tracking-[0.2em] italic">POR:</span>
                     <span className="text-[8px] md:text-[9px] font-black text-[#064E3B] tracking-tighter uppercase leading-none">
                        {task.takenBy}
                     </span>
                  </div>
                )}
             </div>
             )}
          </div>
        )}

        {/* Regular Compact Reservation Layout */}
        {isReservation && !task.clientArrived && (
          <div className="p-3 md:p-4 flex flex-col gap-2 md:gap-3 relative z-20"> 
             {/* Upper Meta Row */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="bg-[#064E3B] px-2 py-0.5 rounded-sm">
                      <span className="text-[8px] font-black text-[#FCFAF7] uppercase tracking-[0.25em]">{task.location}</span>
                   </div>
                   {task.eventType && (
                     <div className="border border-[#064E3B]/20 bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded-sm flex items-center gap-1 font-sans">
                        <Sparkles size={7} className="text-[#064E3B]" />
                        <span className="text-[8px] font-black text-[#064E3B] uppercase tracking-widest">{task.eventType}</span>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                   {task.clientArrived && (
                     <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                        <Check size={7} className="text-emerald-600" />
                        <span className="text-[7px] font-black text-emerald-700 uppercase tracking-widest">EN MESA</span>
                     </div>
                   )}
                   <Users size={9} className="text-[#064E3B]" />
                   <span className="text-[7px] font-black text-[#064E3B] uppercase tracking-[0.3em]">RES-{task.id?.slice(-4) || 'VIP'}</span>
                </div>
             </div>

             {/* Dynamic Central Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                
                {/* Client Profile (Col 1-7) */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-4 h-[1px] bg-[#064E3B]/30" />
                      <span className="text-[8px] font-black text-[#064E3B]/60 uppercase tracking-[0.4em]">REGISTRO CLIENTE</span>
                   </div>
                   <h3 className="text-xl md:text-3xl font-black text-[#064E3B] leading-[0.85] tracking-tighter uppercase mb-0.5">
                     {task.title}
                   </h3>
                   {task.clientPhone && (
                     <div className="flex items-center gap-1.5 text-[#064E3B]/70 mt-1">
                        <div className="w-4 h-4 rounded-full border border-[#064E3B]/20 flex items-center justify-center">
                           <Phone size={8} className="text-[#064E3B]" />
                        </div>
                        <span className="text-xs font-black tracking-tight">{task.clientPhone}</span>
                     </div>
                   )}
                </div>

                {/* Vertical Data Rails (Col 8-12) */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-2 h-full">
                   {/* Time & Date Block */}
                   <div className="flex flex-col justify-center p-2 bg-white border border-[#064E3B]/10 rounded-xl shadow-sm gap-1.5">
                      <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#064E3B]" />
                         <span className="text-[7px] font-black text-[#064E3B]/50 uppercase tracking-widest">AGENDA</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-lg font-black text-[#064E3B] tracking-tighter leading-none mb-0.5">{task.reservationTime}</span>
                         <span className="text-[7px] font-black text-[#064E3B]/60 uppercase tracking-tighter leading-none">{task.reservationDate}</span>
                      </div>
                   </div>

                   {/* Guest & Table Jewel */}
                   <div className="flex flex-col items-center justify-center p-1.5 relative group">
                      {/* The Table Jewel */}
                      <div className="relative w-12 h-12 flex items-center justify-center">
                         {/* Golden Rim */}
                         <div className="absolute inset-0 rounded-full border-[3px] border-[#064E3B] shadow-sm" />
                         <div className="absolute inset-[1.5px] rounded-full border border-[#FCFAF7]/20" />
                         
                         {/* Centered Content */}
                         <div className="relative z-10 flex flex-col items-center justify-center -space-y-0.5">
                            <span className="text-[6px] font-black text-[#FCFAF7]/50 uppercase tracking-[0.2em] mt-0.5">MESA</span>
                            <span className="text-2xl font-black text-white italic tracking-tighter shadow-sm leading-none">{task.tableNumber}</span>
                         </div>

                         {/* Background Plate */}
                         <div className="absolute inset-0 bg-[#064E3B] rounded-full -z-10 shadow-inner" />
                         
                         {/* Refined Chairs - Compact & Clean */}
                         {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                           <div 
                             key={i} 
                             className="absolute top-1/2 left-1/2 transition-all duration-1000"
                             style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-22px)` }}
                           >
                              <div className="w-2 h-1 bg-[#064E3B]/20 rounded-full border border-[#064E3B]/10" />
                           </div>
                         ))}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                         <span className="text-lg font-black text-[#064E3B] leading-none tracking-tighter">{task.guests}</span>
                         <span className="text-[7px] font-black text-[#064E3B]/40 uppercase tracking-widest">PAX</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Signature Row */}
             {task.takenBy && (
               <div className="mt-0.5 pt-2 border-t border-[#064E3B]/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[6px] font-black text-[#064E3B]/40 uppercase tracking-[0.3em] mb-0.5 italic">VERIFICACIÓN</span>
                        <div className="flex items-center gap-1 bg-[#064E3B]/5 px-1.5 py-0.5 rounded-full border border-[#064E3B]/10">
                           <div className="w-1 h-1 rounded-full bg-[#064E3B] animate-pulse" />
                           <span className="text-[7px] font-black text-[#064E3B] uppercase tracking-widest">CONFIRMADA</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[6px] font-black text-[#064E3B]/40 uppercase tracking-[0.3em] mb-0.5 italic">POR</span>
                     <div className="flex flex-col items-end relative">
                        <span className="text-base font-black text-[#064E3B] tracking-tighter uppercase text-right leading-none">
                           {task.takenBy}
                        </span>
                        <div className="w-full h-0.5 bg-[#064E3B] mt-0.5 origin-right scale-x-75 rounded-full opacity-20" />
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Header Row - Hide for reservations as we handled it above */}
        {!isReservation && (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-4 md:mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            {isAnnouncement ? (
              <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-indigo-600 text-white text-[9px] md:text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                <Megaphone size={12} className="md:w-3.5 md:h-3.5" fill="currentColor" />
                SHOWCASE: {task.location}
              </span>
            ) : (
              <span className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest shadow-sm ${getPriorityColor(task.priority)} flex items-center gap-1`}>
                {task.priority === TaskPriority.HIGH ? <><AlertTriangle size={12} className="md:w-3.5 md:h-3.5"/>URGENTE</> : task.priority === TaskPriority.MEDIUM ? 'PRIORIDAD MEDIA' : 'BAJA'}
              </span>
            )}
            
            {!isAnnouncement && (
              <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-[9px] md:text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-slate-700">
                {task.departmentName}
              </span>
            )}

            {task.recurrence === TaskRecurrence.DAILY && !isAnnouncement && (
              <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] md:text-xs font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-1.5">
                <RotateCcw size={12} className="md:w-3.5 md:h-3.5" />
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
        )}

        {/* Main Content */}
        {!(isReservation && task.clientArrived) && (
          <div className={`${isReservation ? 'px-6 pb-6' : 'mb-4 md:mb-6'}`}>
          {!isReservation && (
            <h3 className={`font-black uppercase tracking-tighter leading-tight break-words 
              text-2xl md:text-5xl leading-[0.95] md:leading-[0.9] mb-4
              ${isCompleted 
                ? 'text-gray-900 dark:text-white line-through decoration-4 decoration-gray-300 dark:decoration-slate-700 opacity-60' 
                : isUrgent && !isAnnouncement
                  ? 'text-red-600 dark:text-red-500 drop-shadow-sm' 
                  : isAnnouncement
                    ? 'text-indigo-900 dark:text-indigo-100'
                    : 'text-slate-900 dark:text-white'
              }`}
            >
              {task.title}
            </h3>
          )}

          {/* Dates - Hide limits for announcements, show only relevant info */}
          {!isAnnouncement && !isReservation && (task.startDate || task.dueDate) && (
            <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
              {task.startDate && (
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <Clock size={12} className="md:w-3.5 md:h-3.5" />
                  <span>Inicio: {new Date(task.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              )}
              {task.dueDate && (
                <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg border ${
                  !isCompleted && task.dueDate < Date.now() 
                    ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' 
                    : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                }`}>
                  <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                  <span>Límite: {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              )}
            </div>
          )}

          {isAnnouncement && task.startDate && (
            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 w-fit mb-4 uppercase tracking-widest">
              <Calendar size={12} className="md:w-3.5 md:h-3.5" />
              <span>Fecha: {new Date(task.startDate).toLocaleDateString([], { dateStyle: 'long' })}</span>
            </div>
          )}
          
          {task.description && (
            <div className={`rounded-[0.75rem] md:rounded-2xl border-l-[3px] md:border-l-4 
              ${isReservation ? 'p-3 md:p-4 border-[#064E3B]/40 bg-white/50 backdrop-blur-sm' : 'p-3 md:p-6 mb-4'}
              ${isUrgent && !isCompleted && !isAnnouncement && !isReservation
                ? 'bg-red-50 dark:bg-red-900/10 border-red-500' 
                : isAnnouncement
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-400'
                  : !isReservation ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-300 dark:border-slate-600' : ''
              }`}
            >
              <p className={`whitespace-pre-wrap leading-tight
                ${isReservation ? 'text-xs md:text-base font-bold' : 'text-sm md:text-2xl font-bold md:leading-snug'}
                ${isCompleted 
                  ? 'text-gray-700 dark:text-slate-300 opacity-60' 
                  : isUrgent && !isAnnouncement && !isReservation
                    ? 'text-red-800 dark:text-red-300' 
                    : isAnnouncement
                      ? 'text-indigo-950 dark:text-indigo-50'
                      : isReservation
                        ? 'text-[#064E3B]/80'
                        : 'text-gray-700 dark:text-slate-300'
                }`}
              >
                {renderDescriptionWithHighlights(task.description, isCompleted, isAnnouncement || isReservation)}
              </p>
            </div>
          )}

          {/* Checklist Display - In announcements just show as points */}
          {task.checklist && task.checklist.length > 0 && (
            <div className={`space-y-2 mb-4 ${isAnnouncement ? 'bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-inner' : ''}`}>
              {task.checklist.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    !isAnnouncement && item.isCompleted 
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-900/30' 
                      : !isAnnouncement 
                        ? 'bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700'
                        : 'bg-transparent'
                  }`}
                >
                  {isAnnouncement ? (
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  ) : (
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
                  )}
                  <div className="flex flex-col">
                    <span className={`text-base font-bold ${
                      !isAnnouncement && item.isCompleted 
                        ? 'text-gray-500 dark:text-slate-400 line-through decoration-2' 
                        : isAnnouncement
                          ? 'text-indigo-900 dark:text-indigo-200'
                          : 'text-gray-800 dark:text-slate-200'
                    }`}>
                      {item.text}
                    </span>
                    {!isAnnouncement && item.isCompleted && item.completedBy && (
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
        )}

        {/* Images & Videos */}
        {!(isReservation && task.clientArrived) && ( (task.imageUrls && task.imageUrls.length > 0) || (task.videoUrls && task.videoUrls.length > 0) ) && (
          <div className="mb-6">
            {(task.imagesTitle || (task.videoUrls && task.videoUrls.length > 0)) && (
              <div className="flex items-center mb-4 ml-1 gap-2">
                {task.imagesTitle && (
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg transform -rotate-1 ${isAnnouncement ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-red-600 dark:bg-red-500'}`}>
                    <Camera size={14} className="text-white" />
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">
                      {task.imagesTitle}
                    </span>
                  </div>
                )}
                {task.videoUrls && task.videoUrls.length > 0 && (
                  <div className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-900 px-4 py-1.5 rounded-full shadow-lg transform rotate-1 border border-white/10">
                    <Video size={14} className="text-white" />
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">
                      Videos
                    </span>
                  </div>
                )}
              </div>
            )}
            <div 
              className="flex gap-4 overflow-x-auto pb-4 no-scrollbar touch-pan-x snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Videos First */}
              {task.videoUrls?.map((url, i) => (
                <div 
                  key={`vid-${i}`} 
                  className="relative w-56 h-36 md:w-80 md:h-48 rounded-[2rem] border-4 border-white dark:border-slate-800 overflow-hidden flex-shrink-0 shadow-2xl snap-start group/vid"
                >
                  <video 
                    src={url} 
                    className="w-full h-full object-cover" 
                    controls
                    preload="metadata"
                    playsInline
                    muted
                  />
                  <div className="absolute top-3 right-3 p-2 bg-black/60 rounded-xl backdrop-blur-md">
                    <Play size={16} className="text-white fill-white" />
                  </div>
                </div>
              ))}

              {/* Images */}
              {task.imageUrls?.map((url, i) => (
                <button 
                  key={`img-${i}`} 
                  onClick={() => onViewImages(task.imageUrls!, i)} 
                  className={`relative w-40 h-40 md:w-56 md:h-56 rounded-[2rem] border-4 overflow-hidden flex-shrink-0 hover:scale-[1.03] transition-all shadow-2xl snap-start group/img ${isAnnouncement ? 'border-indigo-100 dark:border-indigo-900' : 'border-white dark:border-slate-800'}`}
                >
                  <img src={url} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className={`mt-auto pt-4 flex flex-wrap justify-between items-center gap-3 ${isReservation ? 'border-t border-emerald-100 dark:border-emerald-900/20' : 'border-t-2 border-gray-100 dark:border-slate-800 pt-5'}`}>
          
          {/* User Info */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-inner text-xs ${isReservation ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : isAnnouncement ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
              {task.createdBy.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className={`font-black text-[10px] md:text-xs leading-tight uppercase tracking-tight ${isReservation ? 'text-emerald-900 dark:text-emerald-100' : isAnnouncement ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'}`}>{task.createdBy}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{new Date(task.createdAt).toLocaleDateString([], {day: '2-digit', month: 'short'})}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Comments Button */}
            <button 
              onClick={() => onComment(task.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all border ${
                (task.comments?.length || 0) > 0 
                  ? isReservation
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isAnnouncement 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                      : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' 
                  : 'bg-white text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              <MessagesSquare size={12} strokeWidth={3} />
              <span>{task.comments?.length || 0}</span>
            </button>

            {/* Action Buttons - Only for tasks */}
            {!isAnnouncement && !isReservation && task.status !== TaskStatus.COMPLETED && (
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
            
            {/* Announcement Badge/Status */}
            {isAnnouncement && (
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-900/30">
                <Info size={14} />
                Solo Informativo
              </div>
            )}

            {/* Reservation Badge/Status */}
            {isReservation && (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/50 border border-[#064E3B]/10 rounded-lg p-1">
                  {(currentUser.role === UserRole.ADMIN || (currentUser.permissions?.includes('CAN_MANAGE_TASKS') && task.createdById === currentUser.id)) && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
                        className="p-2 text-[#064E3B]/40 hover:text-[#064E3B] hover:bg-[#064E3B]/5 rounded-md transition-all active:scale-90"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(task); }} 
                        className="p-2 text-[#064E3B]/40 hover:text-red-600 hover:bg-red-50 rounded-md transition-all active:scale-90"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {currentUser.role === UserRole.ADMIN && (
                    <div className="flex items-center border-l border-[#064E3B]/10 ml-1 pl-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onShare(task); }} 
                        className="p-2 text-[#064E3B]/40 hover:text-[#064E3B] hover:bg-[#064E3B]/5 rounded-md transition-all active:scale-90"
                        title="Compartir"
                      >
                        <Share2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSharePdf(task); }} 
                        className="p-2 text-[#064E3B]/40 hover:text-[#064E3B] hover:bg-[#064E3B]/5 rounded-md transition-all active:scale-90"
                        title="PDF"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {!isCompleted && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleArrival?.(task); }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm border transition-all active:scale-95 ${
                      task.clientArrived 
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-700 shadow-inner' 
                        : 'bg-white border-[#064E3B]/20 text-[#064E3B] hover:bg-[#064E3B]/5'
                    }`}
                  >
                    <Check size={12} strokeWidth={4} className={task.clientArrived ? 'text-emerald-600' : 'text-[#064E3B]/40'} />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      {task.clientArrived ? 'En Mesa' : 'Llegó'}
                    </span>
                  </button>
                )}
                <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm border ${
                  task.status === TaskStatus.COMPLETED 
                    ? 'bg-gray-100 border-gray-200 text-gray-500' 
                    : 'bg-[#064E3B] border-[#064E3B] text-white'
                }`}>
                  <ConciergeBell size={12} className={task.status === TaskStatus.COMPLETED ? 'text-gray-400' : 'text-[#FCFAF7]/80'} />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                    {task.status === TaskStatus.COMPLETED ? 'Finalizada' : 'Activa'}
                  </span>
                </div>
              </div>
            )}
            
            {!isAnnouncement && task.status === TaskStatus.COMPLETED && task.completedAt && (
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
