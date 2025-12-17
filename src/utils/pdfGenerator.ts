import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';

/**
 * Generates a PDF from a React component.
 * Optimized for cross-platform consistency (iOS/Android/Desktop).
 * Uses a Pixel-Perfect strategy (A4 = 794px x 1123px @ 96DPI) to guarantee exact layout.
 */
export const generatePdfFromReactComponent = async (component: React.ReactElement, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 1. Verify library availability
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('La librería html2pdf no está cargada. Refresca la página.'));
    }

    // 2. Constants for A4 at 96 DPI
    const A4_WIDTH_PX = 794; 
    
    // 3. Create a container off-screen
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px'; 
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.backgroundColor = '#ffffff'; 
    
    document.body.appendChild(container);

    // 4. Render the React component
    const root = ReactDOM.createRoot(container);
    
    try {
      flushSync(() => {
        root.render(React.createElement(React.StrictMode, null, component));
      });
    } catch (e) {
      document.body.removeChild(container);
      return reject(e);
    }

    // 5. Wait for rendering and images/fonts to stabilize
    setTimeout(() => {
        const elementToPrint = container.firstChild as HTMLElement;
        
        if (!elementToPrint) {
          root.unmount();
          document.body.removeChild(container);
          return reject(new Error('Error al renderizar el contenido del PDF.'));
        }
        
        const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

        const options = {
          margin: 0,
          filename: finalName,
          image: { type: 'jpeg', quality: 0.98 },
          enableLinks: false, 
          html2canvas: { 
            scale: 2, // 2x is good balance for quality/performance on iOS
            useCORS: true, 
            logging: false,
            // CRITICAL: Force window size to simulate desktop capture
            windowWidth: A4_WIDTH_PX, 
            scrollY: 0,
            scrollX: 0,
            letterRendering: true,
          },
          jsPDF: { 
            unit: 'px', 
            format: [794, 1123], // A4 Standard
            orientation: 'portrait',
            compress: true,
            hotfixes: ['px_scaling'] 
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy']
          }
        };

        const worker = (window as any).html2pdf();

        worker.set(options).from(elementToPrint).save()
          .then(() => {
            resolve();
          })
          .catch((err: any) => {
            console.error("PDF Generation Error:", err);
            reject(err);
          })
          .finally(() => {
            setTimeout(() => {
                try {
                    root.unmount();
                    if (document.body.contains(container)) {
                        document.body.removeChild(container);
                    }
                } catch(e) { console.warn("Cleanup warning", e); }
            }, 100);
          });
    }, 500); 
  });
};