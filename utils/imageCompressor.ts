/**
 * Compresses an image file before uploading.
 * @param {File} file The image file to compress.
 * @param {number} maxWidth The maximum width of the compressed image.
 * @returns {Promise<File>} A promise that resolves with the compressed image file.
 */
export const compressImage = (file: File, maxWidth: number = 600): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleFactor = maxWidth / img.width;
        const newWidth = img.width > maxWidth ? maxWidth : img.width;
        const newHeight = img.width > maxWidth ? img.height * scaleFactor : img.height;

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob, then to file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Canvas to Blob conversion failed'));
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.6 // 60% quality for Firestore Base64 storage optimization
        );
      };
      // FIX: Reject with a proper Error object for consistent error handling.
      img.onerror = (error) => reject(new Error('Image could not be loaded. It may be corrupt or in an unsupported format.'));
    };
    // FIX: Reject with a proper Error object for consistent error handling.
    reader.onerror = (error) => reject(new Error('The file could not be read.'));
  });
};

/**
 * Converts a File object to a Base64 string.
 * @param {File} file The file to convert.
 * @returns {Promise<string>} A promise that resolves with the Base64 data URL.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};