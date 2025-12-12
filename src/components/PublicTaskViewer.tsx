import React, { useEffect, useState } from 'react';
import { Task, TaskType, TaskStatus, TaskPriority } from '../types';
import * as storageService from '../services/storageService';
import { Loader2, Calendar, User, MapPin, Flag, AlertTriangle, CheckCircle2, ClipboardCheck, LogIn } from 'lucide-react';
import { Logo } from './Logo';
import { ImageViewer } from './ImageViewer';

interface PublicTaskViewerProps {
  taskId: string;
}

export const PublicTaskViewer: React.FC<PublicTaskViewerProps> = ({ taskId }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingImages, setViewingImages] = useState<{ images: string[], startIndex: number } | null>(null);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const data = await storageService.getTaskById(taskId);
        if (data) {
          setTask(data);
        } else {
          setError('La tarea no existe o ha sido eliminada.');
        }
      } catch (err) {
        setError('Error al cargar la información.');
      } finally {
        setLoading(false);
      }
    };
    loadTask();
  }, [taskId]);

  const handleGoToApp = () => {
    // Robustly clean URL parameters using the URL API
    const url = new URL(window.location.href);
    url.search = ''; // Remove all query params (like ?shareId=...)
    url.hash = '';   // Remove any hash
    window.location.href = url.toString();
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Logo size="lg" className="animate-pulse mb-6" />
        <Loader2 size={32} className="animate-spin text-red-600" />
        <p className="mt-4 text-gray-500 font-medium">Cargando tarea compartida...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="h-[100dvh] w-full bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contenido no disponible</h1>
        <p className="text-gray-500 mb-8">{error}</p>
        <button onClick={handleGoToApp} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
          Ir a la Aplicación
        </button>
      </div>
    );
  }

  return (
    // FIX: Changed from h-full/overflow-y-auto to h-[100dvh] with internal scroll for layout consistency
    <div className="h-[100dvh] w-full bg-gray-50 dark:bg-slate-950 font-sans transition-colors duration-300 flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 shadow-sm flex-shrink-0">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-extrabold text-xl text-gray-900 dark:text-white">Hub</span>
          </div>
          <button 
            onClick={handleGoToApp}
            className="text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogIn size={16} /> Acceder
          </button>
        </div>
      </header>

      {/* Content - Scrollable Area */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-safe scroll-smooth">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-800 overflow-hidden animate-slide-up">
          
          {/* Banner / Type Indicator */}
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                <ClipboardCheck size={16} />
                Tarea Compartida
              </div>
              
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 ${
                task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {task.status === TaskStatus.COMPLETED && <CheckCircle2 size={16}/>}
                {task.status === TaskStatus.PENDING && 'Pendiente'}
                {task.status === TaskStatus.IN_PROGRESS && 'En Progreso'}
                {task.status === TaskStatus.COMPLETED && 'Completada'}
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mt-4 leading-tight">
              {task.title}
            </h1>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Description */}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {task.description || 'Sin descripción adicional.'}
              </p>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><MapPin size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Departamento</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{task.departmentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><User size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Publicado por</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{task.createdBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><Calendar size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Fecha</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{new Date(task.createdAt).toLocaleDateString()} <span className="text-sm font-normal text-gray-500">{new Date(task.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-gray-400 shadow-sm"><Flag size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Prioridad</p>
                  <p className={`font-semibold ${
                      task.priority === TaskPriority.HIGH ? 'text-red-600' : 
                      task.priority === TaskPriority.MEDIUM ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    {task.priority === TaskPriority.HIGH ? 'Alta' : task.priority === TaskPriority.MEDIUM ? 'Media' : 'Baja'}
                  </p>
                </div>
              </div>
            </div>

            {/* Images */}
            {task.imageUrls && task.imageUrls.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Imágenes Adjuntas ({task.imageUrls.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {task.imageUrls.map((url, index) => (
                    <button 
                      key={index} 
                      onClick={() => setViewingImages({ images: task.imageUrls!, startIndex: index })}
                      className="aspect-square rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-opacity bg-gray-100 dark:bg-slate-800"
                    >
                      <img src={url} alt={`Adjunto ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>Compartido vía Hub App</p>
        </footer>
      </main>

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