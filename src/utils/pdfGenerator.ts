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
    // Check for the global variable injected by index.html
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('html2pdf.js library is not loaded. Please refresh the page.'));
    }

    // Create a temporary, off-screen container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Position it off-screen
    container.style.top = '0';
    
    // EXPLICIT A4 WIDTH (at 96 DPI, A4 is approx 794px x 1123px)
    // Setting this ensures the component renders exactly how it fits on the PDF page,
    // regardless of the mobile device's actual screen width.
    container.style.width = '794px'; 
    
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    
    // Use flushSync to ensure the component is fully rendered before proceeding.
    flushSync(() => {
      root.render(React.createElement(React.StrictMode, null, component));
    });

    // Short delay to ensure styles/images (like logo) are fully applied/loaded in the DOM
    setTimeout(() => {
        const elementToPrint = container.firstChild as HTMLElement;
        if (!elementToPrint) {
          document.body.removeChild(container);
          return reject(new Error('Failed to render the PDF component.'));
        }
        
        const options = {
          margin: 0,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, // Higher scale for crisp text
            useCORS: true,
            logging: false,
            // CRITICAL: Set windowWidth to match the container width.
            // This prevents html2canvas from using the mobile viewport width, which causes squashed layouts.
            windowWidth: 794, 
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
                } catch(e) { console.warn("Cleanup warning", e); }
            }, 100);
          });
    }, 500); // 500ms delay for asset loading
  });
};