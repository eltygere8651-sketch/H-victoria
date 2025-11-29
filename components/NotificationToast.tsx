import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { X, BookOpen } from 'lucide-react'; // Changed CheckCircle2 to BookOpen for "Leer" button
import { NotificationIcon } from './NotificationIcon';

interface NotificationToastProps {
  notification: AppNotification;
  onDismiss: (id: string) => void; // For simple dismissal (timeout, or X on already read)
  onReadAndNavigate: (id: string) => void; // For "Leer" button (marks as read AND navigates)
  timeout?: number; // Milliseconds before auto-dismiss
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss, onReadAndNavigate, timeout = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isVisible) { // Only auto-dismiss if still visible
        handleDismiss();
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [notification.id, timeout, isVisible]); // Depend on isVisible to prevent re-scheduling if already dismissed

  const handleDismiss = () => {
    setIsVisible(false);
    // Then, dismiss the toast from the UI after a short delay for animation
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleReadClick = () => {
    setIsVisible(false);
    onReadAndNavigate(notification.id); // Delegate to App.tsx for marking as read and navigating
    // onReadAndNavigate will also call onDismiss internally after its actions
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 flex items-start gap-4 animate-slide-up w-full md:max-w-sm pointer-events-auto">
      <div className="flex-shrink-0 pt-1">
        <NotificationIcon 
          iconName={notification.icon} 
          size={24} 
          className={`
            ${notification.type === 'LOW_STOCK' ? 'text-amber-500' : 'text-red-600'}
          `}
        />
      </div>
      <div className="flex-1">
        <p className="font-bold text-gray-900 dark:text-white drop-shadow-sm">{notification.title}</p>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{notification.message}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">hace {timeAgo(notification.timestamp)}</p>
      </div>
      {/* Botón "Leer" para notificaciones no leídas */}
      {!notification.readStatus && (
        <button 
          onClick={handleReadClick} 
          className="flex-shrink-0 ml-2 px-3 py-1.5 bg-red-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1 drop-shadow-sm"
          aria-label="Marcar como leída y navegar a reportes"
        >
          <BookOpen size={16} /> Leer
        </button>
      )}
      {/* Botón X de cierre rápido para notificaciones ya leídas */}
      {notification.readStatus && (
        <button 
          onClick={handleDismiss} 
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-lg"
          aria-label="Cerrar notificación"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};