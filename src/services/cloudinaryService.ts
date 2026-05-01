/**
 * Cloudinary Service for free video hosting
 * 
 * To use this service, you need:
 * 1. A Cloudinary account (Free tier)
 * 2. An 'Unsigned Upload Preset' (Settings -> Upload -> Upload presets -> Add upload preset -> Signing Mode: Unsigned)
 * 3. Your 'Cloud Name' (Found in Dashboard)
 */

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadVideoToCloudinary = async (file: File): Promise<string> => {
  return uploadToCloudinary(file, 'video');
};

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  return uploadToCloudinary(file, 'image');
};

const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image'): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Configuración de Cloudinary incompleta. Pídele al usuario que agregue VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'hotel_victoria_tasks');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const msg = errorData.error?.message || '';
      throw new Error(msg || `Error al subir ${resourceType} a Cloudinary`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary Trace:', error);
    throw error;
  }
};
