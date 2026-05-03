import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Send, QrCode, Link as LinkIcon, Download } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'links' | 'qr'>('links');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`Consulta esto en Hub: ${title}`);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  
  // High quality QR code URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&margin=10&bgcolor=ffffff`;

  const handleDownloadQr = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `hub-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading QR", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 w-full max-w-sm rounded-[2rem] shadow-pop-in p-6 animate-pop-in border border-slate-700 overflow-hidden flex flex-col text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Compartir</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex p-1 bg-slate-900/50 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('links')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'links' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon size={16} strokeWidth={2.5} /> Enlace
          </button>
          <button 
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'qr' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={16} strokeWidth={2.5} /> Código QR
          </button>
        </div>

        {activeTab === 'links' ? (
          <div className="space-y-3 animate-fade-in">
            {/* WhatsApp */}
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full p-4 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                <MessageCircle size={22} fill="white" className="stroke-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">WhatsApp</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Enviar mensaje</p>
              </div>
            </a>

            {/* Telegram */}
            <a 
              href={telegramUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full p-4 rounded-2xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0088cc] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                <Send size={20} className="ml-0.5" fill="white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">Telegram</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Enviar mensaje</p>
              </div>
            </a>

            {/* Copiar Enlace */}
            <button 
              onClick={handleCopy}
              className="flex items-center gap-4 w-full p-4 rounded-2xl bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors group text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110 ${copied ? 'bg-green-500' : 'bg-gray-600 dark:bg-slate-500'}`}>
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-gray-900 dark:text-white">{copied ? '¡Copiado!' : 'Copiar Enlace'}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate pr-2 opacity-70">{url}</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in space-y-6 pt-2">
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-100 dark:border-slate-700">
               <img 
                 src={qrImageUrl} 
                 alt="QR Code" 
                 className="w-48 h-48 object-contain rounded-lg"
               />
            </div>
            
            <div className="w-full text-center">
               <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Escanea para acceder</p>
               <p className="text-xs text-gray-500 dark:text-slate-400 max-w-[200px] mx-auto">Comparte este código para dar acceso rápido a la tarea o sección.</p>
            </div>

            <button 
              onClick={handleDownloadQr}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
            >
              <Download size={18} />
              {isDownloading ? 'Descargando...' : 'Guardar Imagen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};