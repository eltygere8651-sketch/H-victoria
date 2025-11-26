import React, { useState, useRef } from 'react';
import { User, UploadedFile } from '../types';
import { storageService } from '../services/storageService';
import { Upload, CheckCircle2, Files, Loader2 } from 'lucide-react';

interface DocumentsProps {
  currentUser: User;
}

const Documents: React.FC<DocumentsProps> = ({ currentUser }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setShowSuccess(false);

    const filesArray: File[] = Array.from(selectedFiles);

    // Limit size check per file (500KB) - Firestore stores this in Base64 so we keep it small to avoid document limits, 
    // ideally real Firestore Storage SDK should be used for large files, but this keeps it simple with just Firestore DB.
    const oversizedFiles = filesArray.filter(f => f.size > 500 * 1024);
    if (oversizedFiles.length > 0) {
        alert(`Límite 500KB excedido en: ${oversizedFiles.map(f => f.name).join(', ')}`);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    try {
        const filePromises = filesArray.map(file => {
            return new Promise<UploadedFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    const type = file.type.includes('pdf') ? 'pdf' : 'image';
                    
                    resolve({
                        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        type: type,
                        data: base64,
                        uploadedBy: currentUser.name,
                        date: new Date().toLocaleString(),
                        timestamp: Date.now(),
                        size: (file.size / 1024).toFixed(1) + ' KB'
                    });
                };
                reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
                reader.readAsDataURL(file);
            });
        });

        const results = await Promise.all(filePromises);
        
        await storageService.saveFiles(results);
        setUploadCount(results.length);

        setIsUploading(false);
        setShowSuccess(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
        console.error(error);
        alert('Error al subir archivos.');
        setIsUploading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-6 font-sans min-h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Subir Archivos</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Enviar tickets, fotos o documentos PDF</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 dark:border-slate-700/50 w-full max-w-lg text-center transition-all">
          {showSuccess ? (
            <div className="animate-fade-in py-8">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400"><CheckCircle2 size={48} /></div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">¡Enviado!</h3>
              <p className="text-gray-500 dark:text-slate-400">Archivos guardados correctamente.</p>
              <button onClick={() => setShowSuccess(false)} className="mt-8 text-sm font-bold text-red-600 dark:text-red-400 hover:underline">Subir más</button>
            </div>
          ) : (
            <div className="py-4">
              <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-500"><Files size={48} /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Subir Documentación</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">Selecciona fotos o PDFs. Puedes seleccionar <b>varios archivos</b>.</p>

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-5 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-50 disabled:cursor-wait"
              >
                {isUploading ? <><Loader2 className="animate-spin" /> Procesando...</> : <><Upload size={24} /> Seleccionar Archivos</>}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/png, image/jpeg, image/jpg, application/pdf" className="hidden" multiple={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;