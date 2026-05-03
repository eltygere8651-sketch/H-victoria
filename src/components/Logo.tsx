import React, { useId } from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  simple?: boolean;
  strokeColor?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  simple = false,
  strokeColor = 'currentColor',
}) => {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 80,
    xl: 128,
    '2xl': 180
  };

  const pxSize = sizeMap[size];
  const uniqueId = useId();

  // Diseño Premium H-Logo: Minimalista con punto central de conexión (Hub)
  // Contenedor circular con borde y nodo central animado
  if (simple) {
      return (
        <svg viewBox="0 0 100 100" width={pxSize} height={pxSize} className={className}>
          <path d="M50 5 L88 27 L88 73 L50 95 L12 73 L12 27 Z" fill="transparent" stroke={strokeColor} strokeWidth="6" />
          <path d="M50 5 V42 M50 95 V58 M12 27 L38 43 M88 27 L62 43 M12 73 L38 57 M88 73 L62 57" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="10" fill="#fbbf24" />
        </svg>
      );
  }

  return (
    <motion.div 
        className={`relative ${className}`}
        style={{ width: pxSize, height: pxSize }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.svg 
        viewBox="0 0 100 100" 
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id={`shadow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Diseño Hexagonal Corporativo */}
        <motion.path 
            d="M50 5 L88 27 L88 73 L50 95 L12 73 L12 27 Z"
            stroke={`url(#gradient-${uniqueId})`} 
            strokeWidth="6" 
            fill="transparent"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
            filter={`url(#shadow-${uniqueId})`}
        />
        {/* Conectores internos */}
        <motion.path
          d="M50 5 V42 M50 95 V58 M12 27 L38 43 M88 27 L62 43 M12 73 L38 57 M88 73 L62 57"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.8, repeat: Infinity, repeatDelay: 2 }}
          strokeOpacity="0.8"
        />
        
        {/* Nodo Central (Hub) */}
        <motion.circle 
            cx="50" cy="50" r="10" 
            fill="#fbbf24"
            filter={`url(#glow-${uniqueId})`}
            animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
        />
      </motion.svg>
    </motion.div>
  );
};
