import React, { useMemo } from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl', className?: string, solid?: boolean }> = ({ size = 'md', className = '', solid = false }) => {
  // Explicit pixel sizes are crucial for PDF generation tools to render correctly
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 128
  };

  const pxSize = sizeMap[size];
  
  // Generate a unique ID for this instance's gradient
  const gradientId = useMemo(() => `grad-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={pxSize}
      height={pxSize}
      className={className}
      style={{ 
        width: pxSize, 
        height: pxSize,
        minWidth: pxSize,
        minHeight: pxSize,
        display: 'block',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Conditionally render the gradient definition to avoid issues in PDF generation */}
      {!solid && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" /> {/* Red-600 */}
            <stop offset="100%" stopColor="#7f1d1d" /> {/* Red-900 */}
          </linearGradient>
        </defs>
      )}
      
      {/* Background - Squircle Shape */}
      {/* If solid prop is true (for print safety), use flat color, otherwise use gradient */}
      <rect 
        x="0" 
        y="0" 
        width="100" 
        height="100" 
        rx="22" 
        ry="22" 
        fill={solid ? '#dc2626' : `url(#${gradientId})`}
      />
      
      {/* 
        Modern "V" Shape 
        - Sharp, geometric, luxury style
        - Explicit white fill
      */}
      <path 
        d="M30 35 L50 75 L70 35 H58 L50 51 L42 35 Z" 
        fill="#ffffff"
        className="logo-path" 
        style={{ fill: '#ffffff' }}
      />
    </svg>
  );
};
