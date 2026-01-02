import React, { useId } from 'react';

// CONFIGURACIÓN: 'hub' es el diseño corporativo principal (H estilizada).
const CURRENT_VARIANT: 'hub' | 'nexus' | 'pulse' | 'legacy' = 'hub';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl', className?: string, solid?: boolean, simple?: boolean, variant?: 'hub' | 'nexus' | 'pulse' | 'legacy' }> = ({ 
  size = 'md', 
  className = '', 
  solid = false, 
  simple = false,
  variant = CURRENT_VARIANT 
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

  // Definición de los trazados (Paths) para cada opción de logo
  const logoPaths = {
    // OPCIÓN 1: HUB (Corporativo, Solidez, Conexión) - Una H estilizada y gruesa
    hub: (
      <path 
        d="M28 24 C28 21.79 29.79 20 32 20 H36 C38.21 20 40 21.79 40 24 V44 H60 V24 C60 21.79 61.79 20 64 20 H68 C70.21 20 72 21.79 72 24 V76 C72 78.21 70.21 80 68 80 H64 C61.79 80 60 78.21 60 76 V52 H40 V76 C40 78.21 38.21 80 36 80 H32 C29.79 80 28 78.21 28 76 V24 Z" 
        fill="white"
      />
    ),
    
    // OPCIÓN 2: NEXUS (Logística, Red, Distribución)
    nexus: (
      <g fill="white">
        <rect x="38" y="38" width="24" height="24" rx="6" />
        <path d="M50 20 V34 M50 66 V80 M20 50 H34 M66 50 H80" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <circle cx="50" cy="18" r="5" />
        <circle cx="50" cy="82" r="5" />
        <circle cx="18" cy="50" r="5" />
        <circle cx="82" cy="50" r="5" />
      </g>
    ),

    // OPCIÓN 3: PULSE (Operativo, Tiempo Real)
    pulse: (
      <path 
        d="M50 20 C33.43 20 20 33.43 20 50 C20 66.57 33.43 80 50 80 C66.57 80 80 66.57 80 50 C80 33.43 66.57 20 50 20 Z M50 70 C38.95 70 30 61.05 30 50 C30 38.95 38.95 30 50 30 C61.05 30 70 38.95 70 50 C70 61.05 61.05 70 50 70 Z M46 42 L60 50 L46 58 V42 Z" 
        fill="white"
      />
    ),

    // OPCIÓN 4: LEGACY (La "V" Original)
    legacy: (
      <path d="M30 35 L50 75 L70 35 H58 L50 51 L42 35 Z" fill="white" />
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

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={pxSize}
      height={pxSize}
      className={`${className} overflow-visible`} 
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

      <g filter={!solid ? `url(#${innerShadowId})` : undefined}>
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