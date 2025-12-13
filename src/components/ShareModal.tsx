import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title }) => {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Compartir</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3">
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 w-full p-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
              <MessageCircle size={22} fill="white" className="stroke-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white">WhatsApp</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Enviar mensaje</p>
            </div>
          </a>

          <a 
            href={telegramUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 w-full p-4 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
              <Send size={20} className="ml-0.5" fill="white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white">Telegram</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Enviar mensaje</p>
            </div>
          </a>

          <button 
            onClick={handleCopy}
            className="flex items-center gap-4 w-full p-4 rounded-xl bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors group text-left"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110 ${copied ? 'bg-green-500' : 'bg-gray-600 dark:bg-slate-500'}`}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white">{copied ? '¡Copiado!' : 'Copiar Enlace'}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate pr-2 opacity-70">{url}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};