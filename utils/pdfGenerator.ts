const PDF_GENERATION_TIMEOUT = 15000; // 15 seconds

/**
 * Generates a PDF from an HTML element with robust error handling and a timeout.
 * @param {string} elementId The ID of the element to capture.
 * @param {string} filename The desired filename for the downloaded PDF.
 * @returns {Promise<void>} A promise that resolves when the PDF is saved, or rejects on error/timeout.
 */
export const generatePdfFromElement = (elementId: string, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // This makes sure html2pdf is available on the window object
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('html2pdf.js library is not loaded.'));
    }

    const printElement = document.getElementById(elementId);
    if (!printElement) {
      return reject(new Error('Element to print not found.'));
    }

    // Set a timeout to prevent the process from hanging indefinitely
    const timeoutId = setTimeout(() => {
      reject(new Error('PDF generation timed out.'));
    }, PDF_GENERATION_TIMEOUT);

    // Use a clone to avoid issues with modal styling and scroll context
    const elementToPrint = printElement.cloneNode(true) as HTMLElement;
    
    // Force a light mode theme for reliable printing
    elementToPrint.classList.add('force-light-mode');

    // CRITICAL: Reset any transformations or animations that might hide the element
    elementToPrint.style.animation = 'none';
    elementToPrint.style.transform = 'none';
    elementToPrint.style.opacity = '1';

    // Must append to body for html2pdf to calculate dimensions, but hide it
    elementToPrint.style.position = 'absolute';
    elementToPrint.style.left = '-9999px';
    elementToPrint.style.top = '0';
    elementToPrint.style.width = '8.5in'; // Standard paper width for better scaling
    document.body.appendChild(elementToPrint);
    
    // Optimized options for better reliability and performance
    const options = {
      margin: [10, 10, 10, 10], // mm
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Give the browser a moment to render the cloned element
    setTimeout(() => {
      (window as any).html2pdf().set(options).from(elementToPrint).save()
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          reject(err);
        })
        .finally(() => {
          // Always clean up the cloned element
          if (document.body.contains(elementToPrint)) {
            document.body.removeChild(elementToPrint);
          }
        });
    }, 100);
  });
};
