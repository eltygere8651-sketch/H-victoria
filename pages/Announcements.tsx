import React, { useEffect, useState } from 'react';
import { Task, TaskType, User } from '../types';
import * as storageService from '../services/storageService';
import { Megaphone, Loader2, Clock, User as UserIcon, MapPin } from 'lucide-react';
import { ImageViewer } from '../components/ImageViewer';

interface AnnouncementsProps {
  currentUser: User;
}

const Announcements: React.FC<AnnouncementsProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

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

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  const AnnouncementCard: React.FC<{ announcement: Task }> = ({ announcement }) => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-800 transition-all">
        <h3 className="font-extrabold text-lg text-gray-900 dark:text-white leading-tight mb-3">{announcement.title}</h3>
        
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
        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Anuncios</h2>
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
    </div>
  );
};

export default Announcements;
