import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Image as ImageIcon, 
  QrCode, 
  Zap, 
  ListChecks, 
  ArrowRight,
  Play,
  Settings,
  LayoutGrid,
  History,
  X,
  Clock,
  User as UserIcon,
  Video
} from 'lucide-react';
import { Hall, HallSetup, HallExecution, HallSetupType, HallExecutionStatus, User, UserRole } from '../types';
import * as hallService from '../services/hallService';
import { Logo } from '../components/Logo';

interface HallSetupProps {
  currentUser: User;
}

const HallSetupPage: React.FC<HallSetupProps> = ({ currentUser }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [selectedSetup, setSelectedSetup] = useState<HallSetup | null>(null);
  const [setups, setSetups] = useState<HallSetup[]>([]);
  const [executions, setExecutions] = useState<HallExecution[]>([]);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [view, setView] = useState<'lobby' | 'detail' | 'setup' | 'execution'>('lobby');
  
  // Form states for Admin
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [showHallForm, setShowHallForm] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [hallForm, setHallForm] = useState<Partial<Hall>>({});
  const [setupForm, setSetupForm] = useState<Partial<HallSetup>>({});
  
  // Execution states
  const [checklistResults, setChecklistResults] = useState<Record<string, boolean>>({});
  const [resultImage, setResultImage] = useState<File | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    hallService.seedInitialHalls();
    const unsub = hallService.subscribeToHalls(setHalls);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      const unsub = hallService.subscribeToHallSetups(selectedHall.id, setSetups);
      const unsubExec = hallService.subscribeToHallExecutions(selectedHall.id, setExecutions);
      return () => { unsub(); unsubExec(); };
    }
  }, [selectedHall]);

  const handleSelectHall = (hall: Hall) => {
    setSelectedHall(hall);
    setView('detail');
  };

  const handleSelectSetup = (setup: HallSetup) => {
    setSelectedSetup(setup);
    setChecklistResults({});
    setResultImageUrl(null);
    setResultImage(null);
    setView('setup');
  };

  const handleToggleChecklist = (item: string) => {
    setChecklistResults(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleFinishSetup = async () => {
    if (!selectedHall || !selectedSetup) return;
    
    setIsSubmitting(true);
    try {
      let finalImageUrl = '';
      if (resultImage) {
        finalImageUrl = await hallService.uploadHallMedia(resultImage, 'executions');
      }

      const execution: HallExecution = {
        id: '',
        hallId: selectedHall.id,
        hallName: selectedHall.name,
        setupTypeId: selectedSetup.id,
        setupTypeName: selectedSetup.setupType,
        workerName: currentUser.name,
        workerId: currentUser.id,
        status: HallExecutionStatus.COMPLETED,
        checklistResults,
        resultImageUrl: finalImageUrl,
        completedAt: Date.now()
      };

      await hallService.submitHallExecution(execution);
      setView('detail');
      setSelectedSetup(null);
    } catch (error) {
      console.error("Error submitting execution:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHall = async () => {
    if (!hallForm.name) return;
    await hallService.saveHall(hallForm);
    setShowHallForm(false);
    setHallForm({});
  };

  const handleSaveSetup = async () => {
    if (!selectedHall || !setupForm.setupType) return;
    await hallService.saveHallSetup({ ...setupForm, hallId: selectedHall.id });
    setShowSetupForm(false);
    setSetupForm({});
  };

  const renderLobby = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            Montaje de <span className="text-red-600 italic">Salones</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Selecciona un salón para comenzar</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setHallForm({}); setShowHallForm(true); }}
            className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {halls.map(hall => (
          <motion.div
            key={hall.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectHall(hall)}
            className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                <Building2 size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {hall.name}
                </h3>
                <p className="text-slate-500 text-sm truncate">{hall.description || 'Sin descripción'}</p>
              </div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
            
            {isAdmin && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setHallForm(hall); setShowHallForm(true); }} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); hallService.deleteHall(hall.id); }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 size={16} /></button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {halls.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
            <LayoutGrid size={40} />
          </div>
          <p className="text-slate-500 font-medium tracking-tight">No hay salones registrados aún.</p>
        </div>
      )}
    </div>
  );

  const renderHallDetail = () => {
    if (!selectedHall) return null;
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header Sticky */}
        <div className="sticky top-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 safe-top flex items-center justify-between">
          <button onClick={() => setView('lobby')} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 active:scale-90"><ArrowLeft size={24} /></button>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate mx-4">{selectedHall.name}</h2>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400"><QrCode size={20} /></button>
            {isAdmin && <button onClick={() => setIsEditorMode(!isEditorMode)} className={`p-2 rounded-lg ${isEditorMode ? 'bg-red-600 text-white' : 'text-slate-400'}`}><Settings size={20} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {/* Quick Mode Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsQuickMode(!isQuickMode)}
            className={`w-full p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl transition-all duration-500 ${isQuickMode ? 'bg-orange-500 text-white shadow-orange-500/30 ring-4 ring-orange-500/20' : 'bg-slate-900 text-white shadow-slate-900/20 dark:bg-white dark:text-slate-900'}`}
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">
                {isQuickMode ? 'Modo Estándar' : '¿Cómo dejo este salón YA?'}
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Zap size={24} fill={isQuickMode ? "currentColor" : "none"} className={isQuickMode ? "animate-pulse" : ""} />
                {isQuickMode ? 'DESACTIVAR MODO RÁPIDO' : 'MODO RÁPIDO'}
              </h3>
            </div>
            <ArrowRight size={24} className={isQuickMode ? 'rotate-90 transition-transform' : ''} />
          </motion.button>

          {/* Setup types list */}
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-2">
               <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Tipos de Montaje</h3>
               {isAdmin && <button onClick={() => { setSetupForm({}); setShowSetupForm(true); }} className="text-xs font-black text-red-600 uppercase tracking-tighter flex items-center gap-1"><Plus size={14} strokeWidth={3} /> AÑADIR</button>}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {setups.map(setup => (
                <motion.div
                  key={setup.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectSetup(setup)}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    {setup.finalImageUrl ? (
                      <img src={setup.finalImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{setup.setupType}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                      <span className="flex items-center gap-1"><LayoutGrid size={12} /> {setup.tablesCount || 0} Mesas</span>
                      <span className="flex items-center gap-1"><UserIcon size={12} /> {setup.chairsCount || 0} Sillas</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                  
                  {isAdmin && (
                    <div className="absolute right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setSetupForm(setup); setShowSetupForm(true); }} className="p-2 text-blue-500"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); hallService.deleteHallSetup(setup.id); }} className="p-2 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {setups.length === 0 && (
              <div className="py-8 bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <ImageIcon size={32} className="text-slate-300 mb-2" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sin montajes definidos</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
               <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                 <Building2 size={20} />
               </div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Material</h4>
               <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">{selectedHall.storageInfo || 'No especificado'}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
               <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                 <AlertTriangle size={20} />
               </div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Normativa</h4>
               <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">{selectedHall.rules || 'Estándar del hotel'}</p>
             </div>
          </div>

          {/* History */}
          <div className="space-y-3">
             <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-2">
               <History size={14} /> Historial de Montajes
             </h3>
             <div className="space-y-2">
               {executions.map(exec => (
                 <div key={exec.id} className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{exec.setupTypeName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Por {exec.workerName} • <Clock size={8} className="inline mb-0.5" /> {new Date(exec.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                   </div>
                   {exec.resultImageUrl && (
                     <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                       <img src={exec.resultImageUrl} alt="" className="w-full h-full object-cover" />
                     </div>
                   )}
                 </div>
               ))}
               {executions.length === 0 && <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sin registros recientes</p>}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSetupDetail = () => {
    if (!selectedSetup) return null;
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-hidden">
        {/* Absolute Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center pointer-events-none">
          <button onClick={() => setView('detail')} className="p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pointer-events-auto active:scale-90"><ArrowLeft size={24} /></button>
          <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pointer-events-auto flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{selectedSetup.setupType}</span>
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
           {/* Visual Section */}
           <div className="h-[45vh] w-full relative">
              <img src={selectedSetup.finalImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent " />
              <div className="absolute bottom-6 left-6 flex flex-col">
                 <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedSetup.setupType}</h1>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Protocolo de {selectedHall?.name}</p>
              </div>
           </div>

           <div className="px-6 space-y-8 mt-4">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-5 flex flex-col items-center text-center">
                    <span className="text-[40px] font-black text-red-600 leading-none mb-1">{selectedSetup.tablesCount || 0}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">MESAS</span>
                 </div>
                 <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-5 flex flex-col items-center text-center">
                    <span className="text-[40px] font-black text-red-600 leading-none mb-1">{selectedSetup.chairsCount || 0}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">SILLAS</span>
                 </div>
              </div>

              {/* Visual Schema Modal Trigger */}
              {selectedSetup.schemaUrl && (
                <div className="space-y-3">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                     <LayoutGrid size={14} /> Esquema Visual
                   </h3>
                   <div className="aspect-video w-full rounded-3xl overflow-hidden border border-white/10 group relative cursor-pointer" onClick={() => {/* Expand Image */}}>
                      <img src={selectedSetup.schemaUrl} alt="Esquema" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="bg-white/20 backdrop-blur-xl px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">VER ESQUEMA</span>
                      </div>
                   </div>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-4">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                   <Clock size={14} /> {isQuickMode ? '3 Pasos Clave (Urgente)' : 'Pasos a Seguir'}
                 </h3>
                 <div className="space-y-3">
                    {(isQuickMode ? (selectedSetup.steps || []).slice(0, 3) : (selectedSetup.steps || [])).map((step, idx) => (
                      <div key={idx} className={`flex gap-4 p-5 rounded-3xl border items-start transition-all ${isQuickMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/5'}`}>
                         <div className={`w-8 h-8 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-1 ${isQuickMode ? 'bg-orange-500' : 'bg-red-600'}`}>{idx + 1}</div>
                         <p className="text-sm font-bold text-slate-200 leading-relaxed pt-1.5">{step}</p>
                      </div>
                    ))}
                    {(!selectedSetup.steps || selectedSetup.steps.length === 0) && <p className="text-center text-slate-500 text-xs italic">Pasos no definidos</p>}
                 </div>
              </div>

              {/* Video Support if exists */}
              {!isQuickMode && selectedSetup.videoUrl && (
                 <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                      <Video size={14} /> Video de Instrucciones
                    </h3>
                    <a 
                      href={selectedSetup.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full aspect-video bg-slate-900 rounded-3xl border border-white/10 flex flex-col items-center justify-center group active:scale-95 transition-all overflow-hidden relative"
                    >
                       <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-600/30 group-hover:scale-110 transition-transform">
                          <Play size={32} fill="currentColor" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest mt-4 text-slate-400 group-hover:text-white transition-colors">VER DEMOSTRACIÓN</span>
                    </a>
                 </div>
              )}

              {/* Checklist */}
              <div className="space-y-4">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                   <ListChecks size={14} /> {isQuickMode ? 'Checklist Mínimo' : 'Checklist de Finalización'}
                 </h3>
                 <div className="space-y-2">
                    {(isQuickMode ? (selectedSetup.checklist || []).slice(0, 3) : (selectedSetup.checklist || [])).map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleChecklist(item)}
                        className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${checklistResults[item] ? 'bg-green-500/10 border-green-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                      >
                         <span className={`text-sm font-bold uppercase tracking-tight transition-all ${checklistResults[item] ? 'text-green-400' : 'text-slate-300'}`}>{item}</span>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${checklistResults[item] ? 'bg-green-500 border-green-500 text-white' : 'border-white/10'}`}>
                            {checklistResults[item] && <CheckCircle2 size={18} strokeWidth={3} />}
                         </div>
                      </motion.div>
                    ))}
                 </div>
              </div>

              {/* Errors to avoid (If in standard mode) */}
              {!isQuickMode && selectedHall?.commonErrors && selectedHall.commonErrors.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                   <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 px-1 animate-pulse">
                     <AlertTriangle size={14} /> Errores Comunes (NO HACER)
                   </h3>
                   <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {selectedHall.commonErrors.map(error => (
                        <div key={error.id} className="min-w-[200px] bg-red-950/20 rounded-3xl p-4 border border-red-500/10 shrink-0">
                           <div className="aspect-square w-full rounded-2xl overflow-hidden mb-3 border-2 border-red-500/30">
                              <img src={error.imageUrl} alt="" className="w-full h-full object-cover grayscale" />
                           </div>
                           <h4 className="text-[10px] font-black uppercase text-red-400 tracking-wider mb-1">{error.title}</h4>
                           <p className="text-[10px] text-slate-500 leading-tight">{error.description}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Footer Fixed Action */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pb-safe z-50">
           <div className="flex gap-3">
              <label className={`flex-[0.3] h-16 rounded-[1.5rem] flex items-center justify-center transition-all cursor-pointer ${resultImage ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/10 border border-white/10 text-white active:scale-95'}`}>
                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setResultImage(e.target.files?.[0] || null)} />
                 {resultImage ? <ImageIcon size={24} /> : <Camera size={24} />}
              </label>
              <button 
                onClick={handleFinishSetup}
                disabled={isSubmitting || (selectedSetup.checklist?.length > 0 && Object.values(checklistResults).filter(Boolean).length < selectedSetup.checklist.length)}
                className={`flex-1 h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:grayscale disabled:opacity-50 transition-all ${isSubmitting ? 'bg-slate-700' : 'bg-red-600 text-white shadow-red-600/30 ring-4 ring-red-600/10'}`}
              >
                 {isSubmitting ? <Clock size={20} className="animate-spin" /> : <><CheckCircle2 size={24} strokeWidth={3} /> FINALIZAR</>}
              </button>
           </div>
        </div>
      </div>
    );
  };

  const renderHallForm = () => (
    <AnimatePresence>
      {showHallForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Configurar <span className="text-red-600">Salón</span></h3>
              <button onClick={() => setShowHallForm(false)} className="p-2 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre</label>
                <input 
                  type="text" 
                  value={hallForm.name || ''} 
                  onChange={e => setHallForm({...hallForm, name: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-bold dark:text-white"
                  placeholder="Ej: Salón Victoria"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Descripción</label>
                <textarea 
                  value={hallForm.description || ''} 
                  onChange={e => setHallForm({...hallForm, description: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-bold dark:text-white h-24"
                  placeholder="Ubicación, capacidad, etc."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Almacenaje (¿Dónde está el material?)</label>
                <input 
                  type="text" 
                  value={hallForm.storageInfo || ''} 
                  onChange={e => setHallForm({...hallForm, storageInfo: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-bold dark:text-white"
                  placeholder="Ej: Cuartillo Planta 1"
                />
              </div>
              
              <button 
                onClick={handleSaveHall}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-transform mt-4"
              >
                GUARDAR SALÓN
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderSetupForm = () => {
    // Basic setup form
    return (
      <AnimatePresence>
        {showSetupForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 my-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Nuevo <span className="text-red-600">Montaje</span></h3>
                <button onClick={() => setShowSetupForm(false)} className="p-2 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tipo de Montaje</label>
                  <select 
                    value={setupForm.setupType || ''}
                    onChange={e => setSetupForm({...setupForm, setupType: e.target.value as HallSetupType})}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-bold dark:text-white appearance-none"
                  >
                    <option value="">Seleccionar Tipo</option>
                    {Object.values(HallSetupType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Mesas</label>
                    <input 
                      type="number" 
                      value={setupForm.tablesCount || ''} 
                      onChange={e => setSetupForm({...setupForm, tablesCount: Number(e.target.value)})}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none transition-all font-bold dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sillas</label>
                    <input 
                      type="number" 
                      value={setupForm.chairsCount || ''} 
                      onChange={e => setSetupForm({...setupForm, chairsCount: Number(e.target.value)})}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none transition-all font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">URL Foto Resultado (Prototipo: usar URL imagen)</label>
                  <input 
                    type="text" 
                    value={setupForm.finalImageUrl || ''} 
                    onChange={e => setSetupForm({...setupForm, finalImageUrl: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 outline-none transition-all font-bold dark:text-white text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pasos y Checklist (CSV)</label>
                   <p className="text-[9px] text-slate-400 ml-2 mb-2">Simplemente rellena estos campos en la fíchas reales del salón.</p>
                </div>
                
                <button 
                  onClick={handleSaveSetup}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-transform mt-4"
                >
                  CONFIRMAR MONTAJE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-white pb-24">
      <AnimatePresence mode="wait">
        {view === 'lobby' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderLobby()}
          </motion.div>
        )}
        {view === 'detail' && (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderHallDetail()}
          </motion.div>
        )}
        {view === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {renderSetupDetail()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      {renderHallForm()}
      {renderSetupForm()}
    </div>
  );
};

export default HallSetupPage;
