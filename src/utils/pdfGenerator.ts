import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';

/**
 * Generates a PDF by rendering the React component into a hidden iframe and triggering the browser's print dialog.
 * This ensures high-quality vector output, selectable text, and native handling of page breaks.
 * 
 * @param {React.ReactElement} component The React component to render.
 * @param {string} filename The suggested filename (used as the document title).
 * @returns {Promise<void>} A promise that resolves when the print dialog is opened.
 */
export const generatePdfFromReactComponent = async (component: React.ReactElement, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden'; // Ensure it's not visible
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        return reject(new Error('Could not create iframe for printing'));
      }

      // 2. Setup the iframe document structure with Tailwind and Print Styles
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <!-- Load Tailwind CSS -->
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: { sans: ['Poppins', 'sans-serif'] },
                    colors: { slate: { 850: '#1e293b', 900: '#0f172a' } }
                  }
                }
              }
            </script>
            
            <!-- Load Fonts -->
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            
            <style>
              @page {
                size: A4;
                margin: 10mm; /* Standard print margin */
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white;
                margin: 0;
                padding: 0;
              }
              /* Ensure tables handle page breaks nicely */
              tr { page-break-inside: avoid; }
              thead { display: table-header-group; } 
              tfoot { display: table-footer-group; }
            </style>
          </head>
          <body>
            <div id="print-root"></div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // 3. Render the React component into the iframe
      const rootElement = iframeDoc.getElementById('print-root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        // Use flushSync to ensure DOM is ready immediately
        flushSync(() => {
          root.render(React.createElement(React.StrictMode, null, component));
        });

        // 4. Wait for styles/images to load and then Print
        // We use a safe timeout to allow Tailwind CDN to process classes
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            resolve();
          } catch (error) {
            console.error("Print failed:", error);
            reject(error);
          } finally {
            // Cleanup: Remove iframe after a delay to ensure print dialog doesn't break
            // (Some browsers need the iframe to exist while the dialog is open)
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 300000); // 5 minutes safety cleanup
          }
        }, 1000); // 1s delay for Tailwind/Fonts
      } else {
        reject(new Error('Root element not found in iframe'));
      }
    } catch (e) {
      reject(e);
    }
  });
};