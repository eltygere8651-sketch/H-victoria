import React from 'react';
import { Task } from '../types';
import { X, Check, Users, Phone, Sparkles, ConciergeBell } from 'lucide-react';

interface ReservationViewModalProps {
  task: Task;
  onClose: () => void;
}

export const ReservationViewModal: React.FC<ReservationViewModalProps> = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#064E3B]/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#FCFAF7] w-full max-w-2xl rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        style={{ border: '1px solid rgba(6, 78, 59, 0.2)' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 transform rotate-12">
            <ConciergeBell size={400} strokeWidth={0.5} />
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-3 bg-[#FCFAF7]/50 dark:bg-slate-800/50 hover:bg-[#FCFAF7] dark:hover:bg-slate-800 rounded-full text-[#064E3B] dark:text-emerald-400 transition-colors shadow-sm"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="p-8 pb-6 relative z-10 border-b border-[#064E3B]/10 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#064E3B] dark:bg-emerald-900 px-3 py-1 rounded-sm">
              <span className="text-xs font-black text-[#FCFAF7] uppercase tracking-[0.25em]">{task.location}</span>
            </div>
            {task.eventType && (
              <div className="border border-[#064E3B]/20 dark:border-emerald-900/50 bg-[#FCFAF7]/50 dark:bg-slate-800 px-3 py-1 rounded-sm flex items-center gap-1.5 font-sans">
                <Sparkles size={12} className="text-[#064E3B] dark:text-emerald-400" />
                <span className="text-xs font-black text-[#064E3B] dark:text-emerald-300 uppercase tracking-widest">{task.eventType}</span>
              </div>
            )}
            {task.clientArrived && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 ml-auto mr-12">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">EN MESA</span>
              </div>
            )}
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-[#064E3B] dark:text-white uppercase tracking-tighter leading-[0.9]">
            {task.title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-8 pt-6 relative z-10 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">DETALLES DE RESERVA</span>
                <div className="bg-[#FCFAF7] dark:bg-slate-900 rounded-xl py-4 px-5 border border-[#064E3B]/10 dark:border-slate-800 shadow-sm flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-[#064E3B]/50 dark:text-slate-500 uppercase tracking-widest mb-1">AGENDA</span>
                     <span className="text-3xl font-black text-[#064E3B] dark:text-slate-200 tracking-tighter leading-none">{task.reservationTime}</span>
                     <span className="text-xs font-black text-[#064E3B]/60 dark:text-slate-400 uppercase tracking-tighter mt-1">{task.reservationDate}</span>
                   </div>
                   <div className="w-[1px] h-12 bg-[#064E3B]/10 dark:bg-slate-800"></div>
                   <div className="flex flex-col text-right">
                     <span className="text-[10px] font-black text-[#064E3B]/50 dark:text-slate-500 uppercase tracking-widest mb-1">PERSONAS</span>
                     <div className="flex items-center justify-end gap-2">
                       <Users size={16} className="text-[#064E3B] dark:text-emerald-400" />
                       <span className="text-3xl font-black text-[#064E3B] dark:text-slate-200 tracking-tighter leading-none">{task.guests}</span>
                     </div>
                   </div>
                </div>
              </div>

              {task.clientPhone && (
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">CONTACTO</span>
                  <div className="flex items-center gap-3 bg-[#FCFAF7] dark:bg-slate-900 px-5 py-4 rounded-xl border border-[#064E3B]/10 dark:border-slate-800 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-[#064E3B]/5 dark:bg-slate-800 flex items-center justify-center">
                      <Phone size={18} className="text-[#064E3B] dark:text-emerald-400" />
                    </div>
                    <span className="text-xl font-black text-[#064E3B] dark:text-slate-200 tracking-tight">{task.clientPhone}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">ASIGNACIÓN</span>
                <div className="bg-[#064E3B] dark:bg-emerald-950 rounded-xl flex items-center p-8 justify-center relative overflow-hidden shadow-md">
                   <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                   
                   {/* Smart Table Visual for Modal */}
                   <div className="relative z-10 flex flex-col items-center justify-center">
                      <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                         {/* Chairs around the table */}
                         {Array.from({ length: Math.min(task.guests || 2, 8) }).map((_, i, arr) => (
                           <div 
                             key={i} 
                             className="absolute w-5 h-3 bg-white/20 rounded-full border border-white/10"
                             style={{ transform: `rotate(${(360 / arr.length) * i}deg) translateY(-54px)` }}
                           />
                         ))}
                         
                         {/* Table Surface */}
                         <div className="absolute inset-0 rounded-full border-[6px] border-white/20 bg-white/10 backdrop-blur-sm shadow-2xl" />
                         <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-white/20 to-transparent flex flex-col items-center justify-center -space-y-1">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-1">MESA</span>
                            <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-md leading-none">{task.tableNumber}</span>
                         </div>
                      </div>
                      <span className="text-xs font-black text-[#FCFAF7]/50 dark:text-emerald-200/50 uppercase tracking-[0.4em]">SALA PREPARADA</span>
                   </div>
                </div>
              </div>

              {task.description && (
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">NOTAS / AVISOS</span>
                  <div className="bg-[#064E3B]/5 dark:bg-slate-800 rounded-xl p-5 border border-[#064E3B]/10 dark:border-slate-800">
                    <p className="text-sm font-medium text-[#064E3B]/80 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                </div>
              )}

            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#064E3B]/5 dark:bg-slate-950 border-t border-[#064E3B]/10 dark:border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1 italic">TICKET DE RESERVA</span>
             <span className="text-xs font-black text-[#064E3B] dark:text-slate-200 uppercase tracking-[0.3em]">RES-{task.id?.slice(-6) || 'VIP-000'}</span>
          </div>
          {task.takenBy && (
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-[#064E3B]/40 dark:text-slate-500 uppercase tracking-[0.3em] mb-1 italic">TOMADA POR</span>
               <span className="text-sm font-black text-[#064E3B] dark:text-emerald-400 tracking-tighter uppercase leading-none">
                  {task.takenBy}
               </span>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};
