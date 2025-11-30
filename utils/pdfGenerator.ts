const PDF_GENERATION_TIMEOUT = 15000; // 15 seconds

/**
 * Generates a PDF from an HTML element with robust error handling and a timeout.
 * @param {string} elementId The ID of the element to capture.
 * @param {string} filename The desired filename for the downloaded PDF.
 * @returns {Promise<void>} A promise that resolves when the PDF is saved, or rejects on error/timeout.
 */
export const generatePdfFromElement = (elementId: string, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).html2pdf === 'undefined') {
      return reject(new Error('html2pdf.js library is not loaded.'));
    }

    const sourceElement = document.getElementById(elementId);
    if (!sourceElement) {
      return reject(new Error('Element to print not found.'));
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('PDF generation timed out.'));
    }, PDF_GENERATION_TIMEOUT);

    // Create a dedicated wrapper for printing. This provides a stable rendering environment.
    const printWrapper = document.createElement('div');
    printWrapper.style.position = 'fixed';
    printWrapper.style.opacity = '0'; // Use opacity to hide instead of positioning off-screen
    printWrapper.style.pointerEvents = 'none'; // Prevent any interaction
    printWrapper.style.zIndex = '-1'; // Ensure it's behind all other content
    printWrapper.style.top = '0';
    printWrapper.style.left = '0';
    printWrapper.style.width = '210mm'; // Standard A4 width
    printWrapper.style.height = 'auto';
    printWrapper.style.overflow = 'visible';
    
    // Clone the source element to avoid modifying the live DOM
    const elementToPrint = sourceElement.cloneNode(true) as HTMLElement;
    
    // Style the clone for optimal printing
    elementToPrint.classList.add('force-light-mode');
    elementToPrint.style.width = '100%';
    elementToPrint.style.maxWidth = 'none';
    elementToPrint.style.animation = 'none';
    elementToPrint.style.transform = 'none';
    elementToPrint.style.display = 'block';

    // Append clone to the wrapper, and wrapper to the body
    printWrapper.appendChild(elementToPrint);
    document.body.appendChild(printWrapper);
    
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
    
    // Allow a brief moment for the browser to render the cloned content
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
          // Always clean up the wrapper element from the DOM
          if (document.body.contains(printWrapper)) {
            document.body.removeChild(printWrapper);
          }
        });
    }, 100);
  });
};