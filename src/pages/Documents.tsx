import React, { useState, useEffect, useRef } from 'react';
import { Document, User, UserRole } from '../types';
import * as storageService from '../services/storageService';
import { FileText, Plus, X, Save, Loader2, Trash2, Download, UploadCloud, Search } from 'lucide-react';

interface DocumentsProps {
  currentUser: User;
}

const Documents: React.FC<DocumentsProps> = ({ currentUser }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('');
  
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    const unsubscribe = storageService.subscribeToDocuments((data) => {
      setDocuments(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setFileToUpload(null);
    setDocName('');
    setDocCategory('');
    setIsUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      setDocName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload || !docName.trim() || !docCategory.trim()) {
      alert('Todos los campos son obligatorios.');
      return;
    }

    setIsUploading(true);
    try {
      const downloadUrl = await storageService.uploadDocumentFile(fileToUpload);
      const newDocument: Omit<Document, 'id'> = {
        name: docName.trim(),
        category: docCategory.trim(),
        url: downloadUrl,
        fileType: fileToUpload.type,
        uploadedBy: currentUser.name,
        createdAt: Date.now(),
      };
      await storageService.saveDocument(newDocument);
      resetUploadModal();
    } catch (error) {
      console.error("Upload failed:", error);
      alert('La subida del archivo falló. Por favor, inténtalo de nuevo.');
      setIsUploading(false);
    }
  };
  
  const handleDelete = async () => {
    if (docToDelete) {
      await storageService.deleteDocument(docToDelete);
      setDocToDelete(null);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const categories = [...new Set(documents.map(d => d.category))];

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  };

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter">Documentos</h2>
          {isAdmin && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-slate-200 transition-all active:scale-95"
              title="Subir Nuevo Documento"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-100 dark:bg-slate-800/60 text-base shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600">
            <FileText size={40} className="mx-auto mb-2 opacity-50" />
            <p>No hay documentos.</p>
          </div>
        ) : (
          filteredDocuments.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg dark:hover:border-slate-700 transition-all group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="text-4xl">{getFileIcon(doc.fileType)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{doc.name}</h3>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-1">{doc.category} • Subido por {doc.uploadedBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-95 shadow-sm"
                  title="Descargar/Ver"
                >
                  <Download size={20} />
                </a>
                <button 
                  onClick={() => setDocToDelete(doc)}
                  className="w-12 h-12 flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors active:scale-95 shadow-sm"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Subir Documento</h3>
              <button onClick={resetUploadModal} className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50"><X size={24} /></button>
            </div>
            
            <div className="space-y-5">
              {!fileToUpload ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  <UploadCloud size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-2" />
                  <p className="font-bold text-gray-700 dark:text-slate-300">Haz clic para seleccionar un archivo</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">PDF, JPG, PNG, DOCX, etc.</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-between border border-gray-200 dark:border-slate-600">
                  <p className="font-bold truncate pr-4">{fileToUpload.name}</p>
                  <button onClick={() => setFileToUpload(null)} className="text-red-500 hover:underline text-sm font-semibold">Cambiar</button>
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Nombre del Documento</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white shadow-sm"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="Ej. Manual de Seguridad"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Categoría</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white shadow-sm"
                  value={docCategory}
                  onChange={e => setDocCategory(e.target.value)}
                  placeholder="Ej. Manuales"
                  list="categories-datalist"
                />
                <datalist id="categories-datalist">
                  {categories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={resetUploadModal} className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]">Cancelar</button>
              <button onClick={handleUpload} disabled={isUploading || !fileToUpload} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-red-400">
                {isUploading ? <Loader2 className="animate-spin"/> : <Save size={20} />} {isUploading ? 'Subiendo...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Documento?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Se eliminará <strong className="text-gray-800 dark:text-slate-200">{docToDelete.name}</strong> permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDocToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;