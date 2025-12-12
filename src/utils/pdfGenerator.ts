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
    // Use '210mm' (A4 width) to match physical dimensions exactly.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    container.style.width = '210mm'; // Physical A4 width
    container.style.height = 'auto'; 
    container.style.overflow = 'visible'; 
    container.style.backgroundColor = '#ffffff';
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
    
    // Calculate dimensions based on scroll values to capture overflowing content if any
    // This prevents cutting off the right side or bottom
    const totalWidth = elementToPrint.scrollWidth;
    const totalHeight = elementToPrint.scrollHeight;

    const options = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        // Capture the full scroll dimensions
        width: totalWidth, 
        height: totalHeight,
        windowWidth: totalWidth,
        windowHeight: totalHeight,
        scrollY: 0, 
        scrollX: 0,
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