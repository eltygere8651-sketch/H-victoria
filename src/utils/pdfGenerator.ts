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
    // Width is critical to force "desktop mode" rendering on mobile
    const A4_WIDTH_PX = 794; 
    
    // 3. Create a container that is technically "visible" to the DOM but outside the viewport.
    // We use fixed positioning off-screen to prevent scrollbars or interference.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px'; 
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.width = `${A4_WIDTH_PX}px`;
    // Force white background to ensure no transparency issues on dark mode devices
    container.style.backgroundColor = '#ffffff'; 
    
    document.body.appendChild(container);

    // 4. Render the React component
    const root = ReactDOM.createRoot(container);
    
    try {
      // Use flushSync to force synchronous rendering before we try to capture
      flushSync(() => {
        root.render(React.createElement(React.StrictMode, null, component));
      });
    } catch (e) {
      document.body.removeChild(container);
      return reject(e);
    }

    // 5. Wait for rendering and images/fonts to stabilize
    // A small timeout allows the browser to layout the new DOM nodes correctly
    setTimeout(() => {
        const elementToPrint = container.firstChild as HTMLElement;
        
        if (!elementToPrint) {
          root.unmount();
          document.body.removeChild(container);
          return reject(new Error('Error al renderizar el contenido del PDF.'));
        }
        
        // Ensure standard filename extension
        const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

        const options = {
          margin: 0, // CRITICAL: We handle all spacing via CSS padding inside the component to prevent page 2 overflow
          filename: finalName,
          image: { type: 'jpeg', quality: 0.98 },
          enableLinks: false, // Disabling links improves stability on some mobile parsers
          html2canvas: { 
            scale: 2, // 2x scale for sharpness (Retina ready)
            useCORS: true, 
            logging: false,
            // CRITICAL: Force the canvas window size to simulate a desktop environment.
            // This prevents the "mobile view" layout from triggering during capture on phones.
            windowWidth: A4_WIDTH_PX, 
            scrollY: 0,
            scrollX: 0,
            letterRendering: true,
          },
          jsPDF: { 
            unit: 'px', // Use pixels to match our CSS exactly
            format: [794, 1123], // Exact A4 dimensions at 96DPI
            orientation: 'portrait',
            compress: true,
            hotfixes: ['px_scaling'] // Fix for some jsPDF scaling issues
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            // Prevent breaks inside specific elements
            avoid: 'tr, .break-inside-avoid'
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
            // Cleanup: remove the temporary container
            setTimeout(() => {
                try {
                    root.unmount();
                    if (document.body.contains(container)) {
                        document.body.removeChild(container);
                    }
                } catch(e) { console.warn("Cleanup warning", e); }
            }, 100);
          });
    }, 500); // 500ms delay to ensure DOM is ready
  });
};