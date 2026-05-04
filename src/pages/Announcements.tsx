import React, { useEffect, useState } from 'react';
import { Task, TaskType, User, UserRole } from '../types';
import * as storageService from '../services/storageService';
import { Megaphone, Loader2, Clock, User as UserIcon, MapPin, Share2 } from 'lucide-react';
import { ImageViewer } from '../components/ImageViewer';
import { ShareModal } from '../components/ShareModal';

interface AnnouncementsProps {
  currentUser: User;
}

const Announcements: React.FC<AnnouncementsProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('restaurante');
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '' });

  useEffect(() => {
    const unsubscribeTasks = storageService.subscribeToTasks((allTasks) => {
      const filteredAnnouncements = allTasks
        .filter(task => task.type === TaskType.ANNOUNCEMENT)
        .sort((a, b) => b.createdAt - a.createdAt);
      setAnnouncements(filteredAnnouncements);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, []);

  const filteredAnnouncements = announcements.filter(a => (a.location || 'restaurante') === activeTab);

  const handleSharePublicAccess = () => {
    try {
      const url = new URL(window.location.href);
      url.search = ''; 
      url.hash = '';
      url.searchParams.set('public', 'true');
      const publicUrl = url.toString();

      setShareData({ url: publicUrl, title: 'Acceso Invitado: Tareas y Anuncios' });
      setShowShareModal(true);
    } catch (error) {
      console.error("Error creating public URL", error);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  const AnnouncementCard: React.FC<{ announcement: Task }> = ({ announcement }) => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-800 transition-all">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-extrabold text-lg text-gray-900 dark:text-white leading-tight flex-1 pr-4">{announcement.title}</h3>
        </div>
        
        {announcement.description && (
          <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap text-sm mb-4">{announcement.description}</p>
        )}
        
        {announcement.imageUrls && announcement.imageUrls.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {announcement.imageUrls.map((url, index) => (
                <button 
                  key={index} 
                  onClick={() => setViewingImages({ images: announcement.imageUrls!, startIndex: index })} 
                  className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden hover:ring-2 ring-red-500 transition-all active:scale-95"
                >
                  <img src={url} alt={`Adjunto ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-3">
          <span className="flex items-center gap-1.5 font-semibold"><UserIcon size={14} /> {announcement.createdBy}</span>
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {announcement.departmentName}</span>
          {announcement.location && (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
              <Megaphone size={14} /> {announcement.location}
            </span>
          )}
          <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(announcement.createdAt).toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Anuncios</h2>
            
             {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={handleSharePublicAccess}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
                  title="Compartir enlace de acceso público para personal"
                >
                  <Share2 size={18} />
                  <span className="hidden sm:inline">Compartir Acceso</span>
                </button>
             )}
        </div>

        {/* Tabs Selector */}
        <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1.5 rounded-2xl gap-1.5">
          {['restaurante', 'salon c', 'terraza'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600">
            <Megaphone size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-bold uppercase tracking-tight text-sm">No hay anuncios en {activeTab}.</p>
          </div>
        ) : (
          filteredAnnouncements.map(announcement => <AnnouncementCard key={announcement.id} announcement={announcement} />)
        )}
      </div>
      
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

export default Announcements;