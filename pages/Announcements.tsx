import React, { useEffect, useState } from 'react';
import { Task, TaskType, User, UserRole } from '../types';
import * as storageService from '../services/storageService';
import { Megaphone, Loader2, Clock, User as UserIcon, MapPin, Share2, Link } from 'lucide-react';
import { ImageViewer } from '../components/ImageViewer';
import { ShareModal } from '../components/ShareModal';

interface AnnouncementsProps {
  currentUser: User;
}

const Announcements: React.FC<AnnouncementsProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  // Share Modal State
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

  const handleShareAnnouncement = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const url = new URL(window.location.href);
      url.search = ''; // Clear existing query params
      url.hash = '';   // Clear existing hash
      url.searchParams.set('shareId', task.id);
      const shareUrl = url.toString();

      setShareData({ url: shareUrl, title: task.title });
      setShowShareModal(true);

    } catch (error) {
      console.error("Failed to construct share URL", error);
    }
  };

  // Generate public link for the entire announcements/tasks view
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
          {/* BOTÓN COMPARTIR ROJO PARPADEANTE */}
          <button onClick={(e) => handleShareAnnouncement(announcement, e)} className="text-red-600 dark:text-red-400 p-2 -mr-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all animate-pulse" title="Compartir">
            <Share2 size={20} />
          </button>
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
          <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(announcement.createdAt).toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Anuncios</h2>
            
             {/* SHARE PUBLIC ACCESS BUTTON (ADMIN ONLY) */}
             {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={handleSharePublicAccess}
                  className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                  title="Compartir enlace público"
                >
                  <Link size={20} />
                </button>
             )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {announcements.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600">
            <Megaphone size={40} className="mx-auto mb-2 opacity-50" />
            <p>No hay anuncios publicados.</p>
          </div>
        ) : (
          announcements.map(announcement => <AnnouncementCard key={announcement.id} announcement={announcement} />)
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