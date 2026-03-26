import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DeletionTimerProps {
  completedAt: number;
}

const DELETION_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 Hours

export const DeletionTimer: React.FC<DeletionTimerProps> = ({ completedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deletionTime = completedAt + DELETION_WINDOW_MS;
      const now = Date.now();
      const difference = deletionTime - now;

      if (difference <= 0) {
        setTimeLeft('Pendiente de eliminación');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (hours > 0) {
        setTimeLeft(`Eliminación en ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`Eliminación en ${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [completedAt]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-sm border w-fit mx-auto sm:mx-0 ${
      isExpired 
        ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
        : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
    }">
      <Clock size={14} strokeWidth={3} />
      <span>{timeLeft}</span>
    </div>
  );
};
