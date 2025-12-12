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

    // Create a temporary, off-screen container for rendering
    // We use a fixed width of 794px which corresponds to A4 width at 96 DPI
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; 
    container.style.margin = '0';
    container.style.padding = '0';
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
    
    // Configuration for html2pdf
    const options = {
      margin: [5, 5, 5, 5], // 5mm margins (Top, Left, Bottom, Right)
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Higher scale for crisp text
        useCORS: true,
        logging: false,
        windowWidth: 794, // Force exact A4 pixel width
        letterRendering: true,
        scrollY: 0,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    (window as any).html2pdf().set(options).from(elementToPrint).save()
      .then(() => {
        resolve();
      })
      .catch((err: any) => {
        console.error("PDF Generation Error:", err);
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
                console.warn("Cleanup warning:", e);
            }
        }, 100);
      });
  });
};