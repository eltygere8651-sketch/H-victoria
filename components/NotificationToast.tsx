import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { X } from 'lucide-react';
import { NotificationIcon } from './NotificationIcon';

interface NotificationToastProps {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  timeout?: number; // Milliseconds before auto-dismiss
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss, timeout = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Give time for exit animation if any, then dismiss
      setTimeout(() => onDismiss(notification.id), 300); 
    }, timeout);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, timeout]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 flex items-start gap-4 animate-slide-up w-full max-w-sm">
      <div className="flex-shrink-0">
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
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{timeAgo(notification.timestamp)}</p>
      </div>
      <button 
        onClick={handleDismiss} 
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};