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
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('La librería html2pdf no está cargada. Refresca la página.'));
    }

    const A4_WIDTH_PX = 794; 
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px'; 
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.backgroundColor = '#ffffff'; 
    container.style.margin = '0';
    container.style.padding = '0';
    
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    
    try {
      flushSync(() => {
        root.render(React.createElement(React.StrictMode, null, component));
      });
    } catch (e) {
      document.body.removeChild(container);
      return reject(e);
    }

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
          image: { type: 'jpeg', quality: 1.0 },
          enableLinks: false, 
          html2canvas: { 
            scale: 2,
            useCORS: true, 
            logging: false,
            windowWidth: A4_WIDTH_PX, 
            scrollY: 0,
            scrollX: 0,
            x: 0,
            y: 0,
            letterRendering: false,
          },
          jsPDF: { 
            unit: 'px', 
            format: [794, 1123],
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
    }, 800);
  });
};

export const sharePdfFromReactComponent = async (component: React.ReactElement, filename: string, title: string = 'Documento', text: string = 'Aquí tienes el pedido interno en formato PDF.'): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('La librería html2pdf no está cargada. Refresca la página.'));
    }

    const A4_WIDTH_PX = 794; 
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px'; 
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.backgroundColor = '#ffffff'; 
    container.style.margin = '0';
    container.style.padding = '0';
    
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    
    try {
      flushSync(() => {
        root.render(React.createElement(React.StrictMode, null, component));
      });
    } catch (e) {
      document.body.removeChild(container);
      return reject(e);
    }

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
          image: { type: 'jpeg', quality: 1.0 },
          enableLinks: false, 
          html2canvas: { 
            scale: 2,
            useCORS: true, 
            logging: false,
            windowWidth: A4_WIDTH_PX, 
            scrollY: 0,
            scrollX: 0,
            x: 0,
            y: 0,
            letterRendering: false,
          },
          jsPDF: { 
            unit: 'px', 
            format: [794, 1123],
            orientation: 'portrait',
            compress: true,
            hotfixes: ['px_scaling'] 
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy']
          }
        };

        const worker = (window as any).html2pdf();

        worker.set(options).from(elementToPrint).outputPdf('blob')
          .then(async (pdfBlob: Blob) => {
            try {
              const file = new File([pdfBlob], finalName, { type: 'application/pdf' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: title,
                  text: text,
                  files: [file]
                });
                resolve();
              } else {
                console.warn("Web Share API no soporta compartir archivos en este navegador. Descargando en su lugar...");
                worker.save().then(resolve).catch(reject);
              }
            } catch (shareError: any) {
              if (shareError.name !== 'AbortError') {
                console.error("Error al compartir:", shareError);
                worker.save().then(resolve).catch(reject);
              } else {
                resolve(); 
              }
            }
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
    }, 800);
  });
};