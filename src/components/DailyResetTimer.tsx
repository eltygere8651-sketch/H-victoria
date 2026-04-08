import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw } from 'lucide-react';

interface DailyResetTimerProps {
  completedAt: number;
}

const RESET_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 Hours

export const DailyResetTimer: React.FC<DailyResetTimerProps> = ({ completedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const resetTime = completedAt + RESET_WINDOW_MS;
      const now = Date.now();
      const difference = resetTime - now;

      if (difference <= 0) {
        setTimeLeft('Reiniciando...');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours > 0) {
        setTimeLeft(`Reinicio en ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`Reinicio en ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`Reinicio en ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000); // Update every second for better feedback

    return () => clearInterval(interval);
  }, [completedAt]);

  return (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-sm border w-fit mx-auto sm:mx-0 transition-colors ${
      isExpired 
        ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' 
        : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30'
    }`}>
      <RotateCcw size={14} strokeWidth={3} className={isExpired ? 'animate-spin' : ''} />
      <span>{timeLeft}</span>
    </div>
  );
};
