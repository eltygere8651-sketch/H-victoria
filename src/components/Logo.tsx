import React, { useId } from 'react';

// CONFIGURACIÓN: 'v' es el diseño profesional simplificado.
const CURRENT_VARIANT: 'v' = 'v';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  solid?: boolean;
  simple?: boolean;
  variant?: 'v';
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  solid = false, 
  simple = false,
  variant = CURRENT_VARIANT,
  animated = false
}) => {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 128,
    '2xl': 180
  };

  const pxSize = sizeMap[size];
  const uniqueId = useId();
  const gradId = `main-grad-${uniqueId}`;
  const shadowId = `shadow-${uniqueId}`;
  const innerShadowId = `inner-${uniqueId}`;

  // Definición del logo "V" profesional y óptimo
  const logoPaths = {
    v: (
      <path 
        d="M22 28 L50 82 L78 28 H62 L50 58 L38 28 Z" 
        fill="white"
      />
    )
  };

  // Modo simple para generación de PDF
  if (simple) {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100" 
        width={pxSize}
        height={pxSize}
        className={`${className} overflow-visible`} 
        style={{ width: pxSize, height: pxSize, display: 'block' }}
      >
        <rect x="5" y="5" width="90" height="90" rx="24" ry="24" fill="#dc2626" />
        {logoPaths[variant]}
      </svg>
    );
  }

  // Clase de animación contenedora (flotar)
  const containerAnimationClass = animated ? 'animate-logo-float' : '';
  
  // Clase de animación interna (respirar/pulsar)
  const innerAnimationClass = animated ? 'animate-logo-breathe' : '';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={pxSize}
      height={pxSize}
      className={`${className} overflow-visible ${containerAnimationClass}`} 
      style={{ 
        width: pxSize, 
        height: pxSize,
        minWidth: pxSize,
        minHeight: pxSize,
        display: 'block',
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5f5f" /> 
          <stop offset="100%" stopColor="#990000" />
        </linearGradient>

        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.3" />
        </filter>
        
        <filter id={innerShadowId} x="-20%" y="-20%" width="140%" height="140%">
           <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={!solid ? `url(#${shadowId})` : undefined}>
        <rect 
          x="5" 
          y="5" 
          width="90" 
          height="90" 
          rx="26" 
          ry="26" 
          fill={solid ? '#dc2626' : `url(#${gradId})`}
        />
        
        {!solid && (
          <>
            <path 
              d="M31 5 H69 A26 26 0 0 1 95 31 V69 A26 26 0 0 1 69 95 H31 A26 26 0 0 1 5 69 V31 A26 26 0 0 1 31 5 Z"
              fill="none"
              stroke="white"
              strokeOpacity="0.3"
              strokeWidth="2"
            />
            <rect 
              x="5" 
              y="5" 
              width="90" 
              height="90" 
              rx="26" 
              ry="26" 
              fill="none"
              stroke="black"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          </>
        )}
      </g>

      <g filter={!solid ? `url(#${innerShadowId})` : undefined} className={innerAnimationClass}>
        {logoPaths[variant]}
      </g>
      
      {!solid && (
         <path 
           d="M10 30 Q 50 55 90 30 V 31 A 26 26 0 0 0 69 5 H 31 A 26 26 0 0 0 10 31 Z" 
           fill="white" 
           fillOpacity="0.1"
           style={{ mixBlendMode: 'overlay' }} 
         />
      )}
    </svg>
  );
};