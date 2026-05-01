import React, { useState, useEffect, useRef } from 'react';
import { User, RoomPost, RoomName } from '../types';
import * as storageService from '../services/storageService';
import { Camera, Video, Plus, X, Share2, Upload } from 'lucide-react';
import { ImageViewer } from '../components/ImageViewer';
import { motion, AnimatePresence } from 'motion/react';

interface RoomsProps {
  currentUser: User;
}

export default function Rooms({ currentUser }: RoomsProps) {
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [activeTab, setActiveTab] = useState<RoomName | 'TODOS'>('TODOS');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRoom, setNewRoom] = useState<RoomName>(RoomName.RESTAURANTE);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(-1);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToRoomPosts(data => setPosts(data));
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await storageService.saveRoomPost({
        title: newTitle,
        roomName: newRoom,
        createdBy: currentUser.name,
        createdById: currentUser.id,
      }, selectedImages, selectedVideos);
      setIsFormOpen(false);
      setNewTitle('');
      setSelectedImages([]);
      setSelectedVideos([]);
      setActiveTab(newRoom);
    } catch (e) {
      console.error(e);
      alert("Error al subir el post. Revisa que Cloudinary esté configurado correctamente para videos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedVideos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const filteredPosts = posts.filter(p => activeTab === 'TODOS' || p.roomName === activeTab);

  const openImageViewer = (post: RoomPost, index: number) => {
    if (!post.imageUrls) return;
    setViewerImages(post.imageUrls);
    setViewerIndex(index);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Montaje Salones</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Anuncios y fotos de montaje para cada salón</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-bold transition-transform active:scale-95"
        >
          {isFormOpen ? <X size={20} /> : <Plus size={20} />}
          <span>{isFormOpen ? 'Cancelar' : 'Nuevo Anuncio'}</span>
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/10">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ej: Montaje de gala 50 pax..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Salón</label>
                    <div className="flex gap-2">
                       {Object.values(RoomName).map(r => (
                          <button 
                            key={r}
                            onClick={() => setNewRoom(r)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newRoom === r ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500'}`}
                          >
                            {r}
                          </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Multimedia</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold transition-colors"
                      >
                        <Camera size={16} /> Fotos ({selectedImages.length})
                      </button>
                      <button 
                        onClick={() => videoInputRef.current?.click()}
                        className="flex-1 py-2 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold transition-colors"
                      >
                        <Video size={16} /> Videos ({selectedVideos.length})
                      </button>
                    </div>
                  </div>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                <input type="file" ref={videoInputRef} className="hidden" accept="video/*" multiple onChange={handleVideoChange} />

                <div className="flex justify-end pt-2">
                   <button 
                     onClick={handleCreatePost}
                     disabled={!newTitle.trim() || isSubmitting}
                     className="bg-blue-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                   >
                     {isSubmitting ? 'Publicando...' : <><Upload size={18} /> Publicar</>}
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
        <button
          onClick={() => setActiveTab('TODOS')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border ${activeTab === 'TODOS' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'}`}
        >
          TODOS
        </button>
        {Object.values(RoomName).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border ${activeTab === tab ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 font-medium">
             No hay publicaciones en esta sección.
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-white/5 space-y-4">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">{post.roomName}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">• {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {post.createdById === currentUser.id && (
                    <button onClick={() => storageService.deleteRoomPost(post.id)} className="p-2 bg-slate-50 hover:bg-red-50 dark:bg-slate-900/50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-xl transition-colors">
                      <X size={16} />
                    </button>
                  )}
               </div>

               {/* Media Grid */}
               {(post.imageUrls || post.videoUrls) && (
                 <div className="grid grid-cols-2 gap-2 mt-4">
                    {post.imageUrls?.map((url, i) => (
                      <div key={i} onClick={() => openImageViewer(post, i)} className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group">
                        <img src={url} alt="img" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ))}
                    {post.videoUrls?.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                        <video src={url} controls className="w-full h-full object-contain" />
                      </div>
                    ))}
                 </div>
               )}

               <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                 <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center font-bold text-[10px]">{post.createdBy[0]}</div> {post.createdBy}</span>
               </div>
            </div>
          ))
        )}
      </div>

      {viewerIndex !== -1 && (
        <ImageViewer images={viewerImages} startIndex={viewerIndex} onClose={() => setViewerIndex(-1)} />
      )}
    </div>
  );
}
