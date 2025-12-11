import React, { useId } from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl', className?: string, solid?: boolean, simple?: boolean }> = ({ size = 'md', className = '', solid = false, simple = false }) => {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 128
  };

  const pxSize = sizeMap[size];
  const uniqueId = useId();
  const gradId = `main-grad-${uniqueId}`;
  const bevelId = `bevel-${uniqueId}`;
  const shadowId = `shadow-${uniqueId}`;
  const innerShadowId = `inner-${uniqueId}`;

  // For PDF generation (simple mode), we avoid complex filters and gradients that html2canvas/iOS struggles with.
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
        {/* Solid Red Background */}
        <rect x="5" y="5" width="90" height="90" rx="24" ry="24" fill="#dc2626" />
        {/* White V */}
        <path d="M30 35 L50 75 L70 35 H58 L50 51 L42 35 Z" fill="white" />
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
        {/* Main vibrant gradient: Bright Coral Red to Deep Maroon */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5f5f" /> 
          <stop offset="100%" stopColor="#990000" />
        </linearGradient>

        {/* 3D Drop Shadow */}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
        </filter>
        
        {/* Inner V Shadow for depth */}
        <filter id={innerShadowId} x="-20%" y="-20%" width="140%" height="140%">
           <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 
        3D Body Construction 
      */}
      <g filter={!solid ? `url(#${shadowId})` : undefined}>
        {/* Main squircle shape */}
        <rect 
          x="5" 
          y="5" 
          width="90" 
          height="90" 
          rx="24" 
          ry="24" 
          fill={solid ? '#dc2626' : `url(#${gradId})`}
        />
        
        {/* Bevel Effect (Highlight Top-Left, Shadow Bottom-Right) */}
        {!solid && (
          <>
            {/* Top/Left Highlight */}
            <path 
              d="M29 5 H71 A24 24 0 0 1 95 29 V71 A24 24 0 0 1 71 95 H29 A24 24 0 0 1 5 71 V29 A24 24 0 0 1 29 5 Z"
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="2"
              mask="url(#mask-top)"
            />
            {/* Inner Dark Rim for depth */}
            <rect 
              x="5" 
              y="5" 
              width="90" 
              height="90" 
              rx="24" 
              ry="24" 
              fill="none"
              stroke="black"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          </>
        )}
      </g>

      {/* The V Logo Symbol */}
      <path 
        d="M30 35 L50 75 L70 35 H58 L50 51 L42 35 Z" 
        fill="white"
        filter={!solid ? `url(#${innerShadowId})` : undefined}
      />
      
      {/* Subtle glossy sheen on top half */}
      {!solid && (
         <path 
           d="M10 30 Q 50 60 90 30 V 29 A 24 24 0 0 0 66 5 H 34 A 24 24 0 0 0 10 29 Z" 
           fill="white" 
           fillOpacity="0.07"
           style={{ mixBlendMode: 'overlay' }} 
         />
      )}
    </svg>
  );
};