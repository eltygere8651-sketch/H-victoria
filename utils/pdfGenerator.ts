import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';

/**
 * Generates a PDF from a React component by rendering it off-screen.
 * This method is robust against screen size variations and ensures a consistent output.
 * @param {React.ReactElement} component The React component to render to PDF.
 * @param {string} filename The desired filename for the downloaded PDF.
 * @returns {Promise<void>} A promise that resolves when the PDF is saved.
 */
export const generatePdfFromReactComponent = async (component: React.ReactElement, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('html2pdf.js library is not loaded.'));
    }

    // Create a temporary container for rendering.
    // Using 'fixed' within the viewport (but hidden via z-index) prevents browser culling 
    // which happens with elements positioned far off-screen (left: -9999px).
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    // Explicitly set width to 794px (Standard A4 width at 96 DPI)
    container.style.width = '794px'; 
    container.style.height = 'auto'; // Allow height to grow
    container.style.overflow = 'visible'; // Ensure no clipping
    container.style.backgroundColor = '#ffffff'; // Ensure white background
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    
    // Use flushSync to ensure the component is fully rendered before proceeding.
    flushSync(() => {
      root.render(React.createElement(React.StrictMode, null, component));
    });

    const elementToPrint = container.firstChild as HTMLElement;
    if (!elementToPrint) {
      document.body.removeChild(container);
      return reject(new Error('Failed to render the PDF component.'));
    }
    
    // Calculate the total height of the rendered content
    const totalHeight = elementToPrint.offsetHeight;

    const options = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        width: 794, // Match container width exactly
        height: totalHeight, // Explicitly set height to avoid cutoff
        windowWidth: 794,
        windowHeight: totalHeight, // Ensure the "window" sees the full height
        scrollY: 0, 
        letterRendering: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    (window as any).html2pdf().set(options).from(elementToPrint).save()
      .then(() => {
        resolve();
      })
      .catch((err: any) => {
        console.error("PDF generation error:", err);
        reject(err);
      })
      .finally(() => {
        // Clean up: unmount the component and remove the container
        setTimeout(() => {
            try {
                root.unmount();
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            } catch (e) {
                console.error("Error cleaning up PDF container:", e);
            }
        }, 100);
      });
  });
};