import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';

/**
 * Generates a PDF from a React component.
 * Optimized for crisp rendering and auto-height adjustment.
 */
export const generatePdfFromReactComponent = async (component: React.ReactElement, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('html2pdf.js library is not loaded.'));
    }

    // Container setup - Positioned off-screen but not hidden via display:none
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.zIndex = '-1';
    
    // IMPORTANT: Set width exactly to A4 printable width at ~96 DPI to match html2canvas expectations.
    // 210mm is roughly 793.7px. We use 794px.
    container.style.width = '794px'; 
    
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    
    try {
      // Synchronous render to ensure DOM is ready immediately
      flushSync(() => {
        root.render(React.createElement(React.StrictMode, null, component));
      });

      const elementToPrint = container.firstChild as HTMLElement;
      
      if (!elementToPrint) {
        throw new Error('Failed to render PDF component.');
      }
      
      const options = {
        margin: 0, // Margins are handled by the component's internal padding (20mm)
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, // Higher scale for text sharpness
          useCORS: true, 
          logging: false,
          scrollY: 0, // Prevent window scroll from affecting capture
          windowWidth: 794,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        // 'avoid-all' prevents breaking inside elements, 'css' respects CSS break rules
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      (window as any).html2pdf()
        .set(options)
        .from(elementToPrint)
        .save()
        .then(() => resolve())
        .catch((err: any) => reject(err))
        .finally(() => {
          root.unmount();
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        });

    } catch (err) {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      reject(err);
    }
  });
};