import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Announcement, User, UserRole } from '../types';
import { Megaphone, Plus, X, Save, Loader2, Edit2, Trash2, Clock, User as UserIcon } from 'lucide-react';

interface AnnouncementsProps {
  currentUser: User;
}

const Announcements: React.FC<AnnouncementsProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!editingAnnouncement || !editingAnnouncement.title || !editingAnnouncement.content) {
      alert('El título y el contenido son obligatorios.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await storageService.saveAnnouncement(editingAnnouncement, currentUser);
      setShowModal(false);
      setEditingAnnouncement(null);
    } catch (error: any) {
      console.error("Failed to save announcement:", error);
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
  };

  const confirmDelete = async () => {
    if (announcementToDelete) {
      await storageService.deleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
    }
  };

  const openNewModal = () => {
    setEditingAnnouncement({});
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement({ ...announcement });
    setSaveError(null);
    setShowModal(true);
  };
  
  if (loading && announcements.length === 0) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;
  }

  return (
    <div className="pb-24 md:pb-6 font-sans">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Anuncios Internos</h2>
          {currentUser.role === UserRole.ADMIN && (
            <button 
              onClick={openNewModal}
              className="bg-red-600 text-white p-3 rounded-full shadow-lg shadow-button-red hover:bg-red-700 active:scale-95"
              title="Publicar Nuevo Anuncio"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingAnnouncement?.id ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h3>
              <button onClick={() => {setShowModal(false); setEditingAnnouncement(null);}} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <input value={editingAnnouncement?.title || ''} onChange={e => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})} placeholder="Título del anuncio" className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none font-bold text-gray-900 dark:text-white shadow-sm" />
              <textarea value={editingAnnouncement?.content || ''} onChange={e => setEditingAnnouncement({...editingAnnouncement, content: e.target.value})} placeholder="Contenido del anuncio..." className="w-full p-4 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:border-red-500 outline-none dark:text-white shadow-sm h-40" />
            </div>
            
            {saveError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium mt-6 border border-red-100 dark:border-red-900/30">
                <p className="font-bold text-center">Error al Publicar</p>
                <p className="mt-1 whitespace-pre-wrap text-left">{saveError}</p>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button onClick={() => {setShowModal(false); setEditingAnnouncement(null);}} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400">
                {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Publicar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border text-center">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Anuncio?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Se eliminará el anuncio: <strong className="text-gray-800 dark:text-slate-200">{announcementToDelete.title}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setAnnouncementToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 dark:bg-slate-700/50 rounded-xl active:scale-[0.98]">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {announcements.length === 0 && (
          <div className="text-center py-20 text-gray-400 dark:text-slate-600">
            <Megaphone size={48} className="mx-auto mb-4 opacity-50"/>
            <p className="font-bold text-lg">No hay anuncios publicados</p>
            {currentUser.role === UserRole.ADMIN && <p className="text-sm">¡Crea el primer anuncio para el equipo!</p>}
          </div>
        )}
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card-soft border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{ann.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500 mt-2">
                        <span className="flex items-center gap-1.5"><UserIcon size={12}/>{ann.authorName}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12}/>{new Date(ann.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                {currentUser.role === UserRole.ADMIN && (
                    <div className="flex gap-2">
                        <button onClick={() => openEditModal(ann)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteClick(ann)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                )}
            </div>
            <p className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 text-gray-600 dark:text-slate-300 whitespace-pre-wrap">{ann.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;