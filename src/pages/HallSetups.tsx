import React, { useEffect, useState, useRef } from 'react';
import { EventHall, SetupGuide, User, UserRole } from '../types';
import * as storageService from '../services/storageService';
import { LayoutDashboard, Plus, X, Save, Loader2, Edit2, Trash2, Map, Images, Users, List, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageViewer } from '../components/ImageViewer';

export const HallSetups: React.FC = () => {
  const [halls, setHalls] = useState<EventHall[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showHallModal, setShowHallModal] = useState(false);
  const [editingHall, setEditingHall] = useState<Partial<EventHall> | null>(null);
  const [hallToDelete, setHallToDelete] = useState<EventHall | null>(null);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Partial<SetupGuide> | null>(null);
  const [activeHallForGuide, setActiveHallForGuide] = useState<EventHall | null>(null);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeUser = storageService.subscribeToCurrentUser((user) => {
      setCurrentUser(user);
    });
    
    const unsubscribeHalls = storageService.subscribeToEventHalls(
      (data) => {
        setHalls(data);
        setLoading(false);
      },
      (error) => {
        console.error('HallSetups: Subscription error', error);
        setLoading(false); // Stop loading even if error
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeHalls();
    };
  }, []);

  const isDeveloper = storageService.auth.currentUser?.email === storageService.SUPER_ADMIN_EMAIL || 
                       !!currentUser?.isSuperAdmin || 
                       currentUser?.role === UserRole.ADMIN ||
                       storageService.auth.currentUser?.isAnonymous;

  const canManage = isDeveloper || currentUser?.role === UserRole.ADMIN || 
                    (currentUser?.role === UserRole.STAFF && currentUser?.permissions?.includes('CAN_MANAGE_TASKS'));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveHall = async () => {
    if (!editingHall?.name) return;
    setIsSaving(true);
    try {
      await storageService.saveEventHall(editingHall);
      setShowHallModal(false);
      setEditingHall(null);
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar el salón: ' + (error.message || 'Error desconocido') + '. Por favor revisa los permisos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHall = async () => {
    if (hallToDelete) {
      await storageService.deleteEventHall(hallToDelete.id, hallToDelete.imageUrls);
      setHallToDelete(null);
    }
  };

  const handleSaveGuide = async () => {
    if (!editingGuide?.title || !activeHallForGuide) return;
    setIsSaving(true);
    try {
      let finalImageUrls = editingGuide.imageUrls || [];
      
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(file => storageService.uploadImage(file, 'halls'));
        const uploadedUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      const currentGuides = [...(activeHallForGuide.setupGuides || [])];
      let updatedGuides;
      
      if (editingGuide.id) {
        updatedGuides = currentGuides.map(g => g.id === editingGuide.id ? { ...g, ...editingGuide, imageUrls: finalImageUrls } as SetupGuide : g);
      } else {
        const newGuide: SetupGuide = {
          ...editingGuide as SetupGuide,
          id: Date.now().toString(),
          imageUrls: finalImageUrls
        };
        updatedGuides = [...currentGuides, newGuide];
      }

      await storageService.saveEventHall({
        id: activeHallForGuide.id,
        setupGuides: updatedGuides
      });
      setShowGuideModal(false);
      setEditingGuide(null);
      setActiveHallForGuide(null);
      setPreviews([]);
      setSelectedImages([]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGuide = async (hall: EventHall, guideId: string) => {
    if (!window.confirm('¿Eliminar esta guía de montaje?')) return;
    const updatedGuides = (hall.setupGuides || []).filter(g => g.id !== guideId);
    await storageService.saveEventHall({
      id: hall.id,
      setupGuides: updatedGuides
    });
  };

  const handleViewImages = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setShowViewer(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="animate-spin text-red-600 mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Cargando Salones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="p-6 md:p-10 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-900/30 mb-4">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-widest">Guías de Montaje</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none italic">
              Espacios <br /><span className="text-red-600">Victoria</span>
            </h1>
          </div>
          
          {canManage && (
            <button 
              onClick={() => {
                setEditingHall({});
                setShowHallModal(true);
              }}
              className="px-8 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black uppercase tracking-widest rounded-[2rem] shadow-2xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
            >
              <Plus size={24} strokeWidth={3} />
              Añadir Salón
            </button>
          )}
        </div>
      </div>

      <div className="p-6 md:p-10">
        {halls.length === 0 ? (
          <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-slate-800 shadow-inner">
            <LayoutDashboard size={80} className="mx-auto mb-6 text-gray-200 dark:text-slate-800" />
            <p className="text-3xl font-black text-gray-300 dark:text-slate-700 uppercase tracking-tighter">No hay salones registrados</p>
            <p className="text-slate-400 font-medium mt-2">Empieza por añadir un nuevo salón para subir sus guías.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {halls.map(hall => (
              <motion.div 
                layout
                key={hall.id}
                className="bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-gray-100 dark:border-slate-800 overflow-hidden shadow-2xl transition-all hover:border-red-500/30"
              >
                <div className="p-8 md:p-10">
                   <div className="flex justify-between items-start mb-8">
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.3em] mb-1">Salón de Eventos</span>
                       <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none italic">{hall.name}</h3>
                       {hall.capacity && (
                         <div className="flex items-center gap-2 mt-3 bg-slate-100 dark:bg-slate-800 self-start px-3 py-1.5 rounded-xl">
                           <Users size={14} className="text-slate-500" />
                           <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase">Capacidad: {hall.capacity}</span>
                         </div>
                       )}
                     </div>
                     {canManage && (
                       <div className="flex gap-2">
                         <button onClick={() => { setEditingHall(hall); setShowHallModal(true); }} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-2xl text-blue-600 hover:rotate-12 transition-all shadow-md"><Edit2 size={20} /></button>
                         <button onClick={() => setHallToDelete(hall)} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-2xl text-red-600 hover:rotate-12 transition-all shadow-md"><Trash2 size={20} /></button>
                       </div>
                     )}
                   </div>
                   
                   <div className="space-y-8">
                     <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                       <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 italic">
                         <List size={18} className="text-red-600" /> Guías de Montaje
                       </h4>
                       {canManage && (
                         <button 
                           onClick={() => {
                             setActiveHallForGuide(hall);
                             setEditingGuide({});
                             setPreviews([]);
                             setSelectedImages([]);
                             setShowGuideModal(true);
                           }}
                           className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-lg shadow-red-600/20"
                         >
                           + Nueva Guía
                         </button>
                       )}
                     </div>
                     
                     {(!hall.setupGuides || hall.setupGuides.length === 0) ? (
                       <div className="flex flex-col items-center py-12 bg-gray-50 dark:bg-slate-950/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                         <Images size={32} className="text-gray-300 mb-3" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Sin guías publicadas</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 gap-6">
                         {hall.setupGuides.map(guide => (
                           <div key={guide.id} className="group bg-gray-50 dark:bg-slate-950/50 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-xl ring-2 ring-white dark:ring-slate-700">
                                    <Map size={24} />
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-900 dark:text-white uppercase leading-none text-lg italic tracking-tight">{guide.title}</h5>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 md:line-clamp-none font-medium">{guide.description}</p>
                                  </div>
                               </div>
                               {canManage && (
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { 
                                     setActiveHallForGuide(hall); 
                                     setEditingGuide(guide); 
                                     setPreviews([]);
                                     setSelectedImages([]);
                                     setShowGuideModal(true); 
                                   }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                   <button onClick={() => handleDeleteGuide(hall, guide.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                 </div>
                               )}
                             </div>
                             
                             {guide.imageUrls && guide.imageUrls.length > 0 && (
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                                 {guide.imageUrls.map((url, idx) => (
                                   <div 
                                     key={idx} 
                                     onClick={() => handleViewImages(guide.imageUrls!, idx)}
                                     className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-zoom-in group/img shadow-md ring-2 ring-white dark:ring-slate-700"
                                   >
                                     <img src={url} alt="Montaje" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-125" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-3">
                                       <span className="text-[9px] font-black text-white uppercase tracking-widest">Ver Ampliado</span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Hall Modal */}
      <AnimatePresence>
        {showHallModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg my-auto shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
               <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 rounded-t-[3rem]">
                  <div>
                     <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.4em] mb-1 block">Administración</span>
                     <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italic">
                       {editingHall?.id ? 'Editar Salón' : 'Nuevo Salón'}
                     </h3>
                  </div>
                  <button onClick={() => setShowHallModal(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full shadow-lg hover:scale-110 transition-transform">
                     <X size={24} strokeWidth={3} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Nombre del Salón</label>
                     <input 
                       value={editingHall?.name || ''}
                       onChange={e => setEditingHall({ ...editingHall, name: e.target.value })}
                       className="w-full px-6 py-5 font-black text-2xl bg-gray-50 dark:bg-slate-800/50 border-4 border-transparent focus:border-red-600 dark:focus:border-red-500/50 outline-none rounded-[2rem] transition-all dark:text-white italic placeholder-gray-300 dark:placeholder-slate-700"
                       placeholder="Ej: Salón Real..."
                     />
                  </div>
                  
                  <div>
                     <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Capacidad Máx.</label>
                     <input 
                        value={editingHall?.capacity || ''}
                        onChange={e => setEditingHall({ ...editingHall, capacity: e.target.value })}
                        className="w-full px-5 py-4 font-bold bg-gray-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-red-500 outline-none dark:text-white"
                        placeholder="Ej: 200 Personas"
                     />
                  </div>
               </div>
               
               <div className="p-8 border-t border-gray-100 dark:border-slate-800 flex gap-4 bg-gray-50 dark:bg-slate-900 sticky bottom-0 z-10 rounded-b-[3rem]">
                  <button onClick={() => setShowHallModal(false)} className="flex-1 py-5 font-black text-slate-500 uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-800 rounded-[1.5rem] transition-colors">Cancelar</button>
                  <button 
                    onClick={handleSaveHall} 
                    disabled={isSaving || !editingHall?.name}
                    className="flex-[2] py-5 bg-red-600 text-white font-black uppercase tracking-widest rounded-[1.5rem] shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {editingHall?.id ? 'GUARDAR' : 'CREAR'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 overflow-y-auto">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl my-auto shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col max-h-[95vh]"
            >
               <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 rounded-t-[3rem]">
                  <div>
                     <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.4em] mb-1 block">Configuración</span>
                     <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italic">
                       Publicar en: {activeHallForGuide?.name}
                     </h3>
                  </div>
                  <button onClick={() => setShowGuideModal(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full shadow-lg hover:scale-110 transition-transform">
                     <X size={24} strokeWidth={3} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div>
                     <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Título del Montaje</label>
                     <input 
                       value={editingGuide?.title || ''}
                       onChange={e => setEditingGuide({ ...editingGuide, title: e.target.value })}
                       className="w-full px-6 py-4 font-black text-xl bg-gray-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 focus:border-red-600 rounded-2xl outline-none transition-all dark:text-white uppercase italic"
                       placeholder="Ej: Montaje tipo Banquete..."
                     />
                  </div>
                  
                  <div>
                     <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Instrucciones</label>
                     <textarea 
                       value={editingGuide?.description || ''}
                       onChange={e => setEditingGuide({ ...editingGuide, description: e.target.value })}
                       className="w-full px-6 py-4 font-bold text-base bg-gray-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 focus:border-red-600 rounded-2xl outline-none transition-all dark:text-white min-h-[150px] resize-none"
                       placeholder="Detalla los pasos para dejar el salón perfecto..."
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Galeria Visual (Fotos)</label>
                     <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-32 h-32 rounded-[2rem] border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-300 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-all flex-shrink-0 group"
                        >
                          <Camera size={40} className="group-hover:scale-110 transition-transform"/>
                          <span className="text-[10px] font-black mt-2">AÑADIR</span>
                        </button>
                        
                        {editingGuide?.imageUrls?.map((url, i) => (
                          <div key={`ex-${i}`} className="relative w-32 h-32 flex-shrink-0 group">
                             <img src={url} className="w-full h-full object-cover rounded-[2rem] ring-4 ring-slate-100 dark:ring-slate-800 shadow-xl opacity-70" />
                             <button 
                              onClick={() => setEditingGuide({ ...editingGuide, imageUrls: editingGuide.imageUrls?.filter((_, idx) => idx !== i) })}
                              className="absolute -top-2 -right-2 bg-slate-900 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                             >
                              <Trash2 size={16} />
                             </button>
                          </div>
                        ))}

                        {previews.map((url, i) => (
                          <div key={`new-${i}`} className="relative w-32 h-32 flex-shrink-0 group">
                             <img src={url} className="w-full h-full object-cover rounded-[2rem] ring-4 ring-red-100 dark:ring-red-900 shadow-xl" />
                             <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><X size={16} strokeWidth={3} /></button>
                          </div>
                        ))}
                     </div>
                     <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
               </div>
               
               <div className="p-8 border-t border-gray-100 dark:border-slate-800 flex gap-4 bg-gray-50 dark:bg-slate-900 sticky bottom-0 z-10 rounded-b-[3rem]">
                  <button onClick={() => setShowGuideModal(false)} className="flex-1 py-5 font-black text-slate-500 uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-800 rounded-[1.5rem] transition-colors">Cancelar</button>
                  <button 
                    onClick={handleSaveGuide} 
                    disabled={isSaving || !editingGuide?.title}
                    className="flex-[2] py-5 bg-red-600 text-white font-black uppercase tracking-widest rounded-[1.5rem] shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {editingGuide?.id ? 'ACTUALIZAR' : 'PUBLICAR'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {hallToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-4 border-slate-100 dark:border-slate-800"
            >
              <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-8 text-red-600 dark:text-red-500 shadow-inner">
                 <Trash2 size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase mb-3 tracking-tighter leading-none italic">¿Borrar Salón?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-bold text-lg leading-snug">Se eliminará "{hallToDelete.name}" y todas sus guías. Esta acción es definitiva.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteHall} className="w-full py-5 font-black text-white bg-red-600 rounded-[1.5rem] hover:bg-red-700 shadow-xl shadow-red-600/30 transition-all uppercase tracking-widest">SÍ, BORRAR TODO</button>
                <button onClick={() => setHallToDelete(null)} className="w-full py-5 font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showViewer && (
        <ImageViewer 
          images={viewerImages}
          startIndex={viewerIndex}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
};
