import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DeletionTimerProps {
  completedAt: number;
}

const DELETION_WINDOW_MS = 30 * 60 * 1000;

export const DeletionTimer: React.FC<DeletionTimerProps> = ({ completedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deletionTime = completedAt + DELETION_WINDOW_MS;
      const now = Date.now();
      const difference = deletionTime - now;

      if (difference <= 0) {
        setTimeLeft('Pendiente de eliminación');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (hours > 0) {
        setTimeLeft(`Se eliminará en aprox. ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`Se eliminará en aprox. ${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [completedAt]);

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-500 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-lg">
      <Clock size={14} />
      <span>{timeLeft}</span>
    </div>
  );
};