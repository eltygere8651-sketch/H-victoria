import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Headset, Loader2, Sparkles, Check, CheckCheck } from 'lucide-react';
import { User, SupportMessage, UserRole } from '../types';
import { sendSupportMessage, subscribeToSupportMessages, markSupportMessagesAsRead } from '../services/storageService';

interface SupportWidgetProps {
  currentUser: User;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser) return;
    
    // Only subscribe for business owners / admin/staff, not super admin themselves (who has a full dashboard)
    if (currentUser.isSuperAdmin || currentUser.email === 'eltygere8651@gmail.com') return;

    const workspaceId = localStorage.getItem('hub_workspace_id') || '';
    if (!workspaceId) return;

    const unsub = subscribeToSupportMessages(workspaceId, (msgs) => {
      setMessages(msgs);
      
      // Calculate unread
      const unreads = msgs.filter(m => m.senderRole === 'SUPER_ADMIN' && !m.readByUser);
      setUnreadCount(unreads.length);
    });

    return () => unsub();
  }, [currentUser]);

  // Scroll to bottom when new messages arrive or chat opens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Mark messages as read when open
  useEffect(() => {
    if (isOpen && currentUser) {
      const workspaceId = localStorage.getItem('hub_workspace_id') || '';
      if (workspaceId) {
        markSupportMessagesAsRead(workspaceId, false);
      }
    }
  }, [isOpen, messages.length, currentUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      await sendSupportMessage(text, currentUser);
    } catch (error) {
      console.error('Error sending support message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // If super admin, do not render floating widget (they manage chats from the Admin dashboard)
  if (currentUser.isSuperAdmin || currentUser.email === 'eltygere8651@gmail.com') return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-4 w-[380px] h-[550px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white flex justify-between items-center relative">
              <div className="absolute top-0 right-0 left-0 h-full opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%)] pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                    <Headset size={20} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm tracking-tight leading-none">Soporte Express Premium</h3>
                    <Sparkles size={12} className="text-amber-300 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-medium opacity-80 mt-0.5 block">Soporte en directo por Super Admin</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/20 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center shadow-inner">
                    <Headset size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200">¿Cómo podemos ayudarte hoy?</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Envía un mensaje y nuestro Super Administrador te responderá directamente.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div 
                      key={msg.id || index} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Sender Label */}
                        {!isMe && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-purple-500 mb-1 ml-1">
                            {msg.senderRole === 'SUPER_ADMIN' ? '⚡ Soporte Técnico' : msg.senderName}
                          </span>
                        )}
                        {/* Bubble */}
                        <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-red-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-700/50 rounded-bl-none'
                        }`}>
                          {msg.message}
                        </div>
                        {/* Time & Read Status */}
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 font-bold px-1">
                          <span>{formattedTime}</span>
                          {isMe && (
                            msg.readByAdmin ? (
                              <CheckCheck size={12} className="text-emerald-500" />
                            ) : (
                              <Check size={12} className="text-gray-400" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Escribe tu mensaje..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800/50 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 outline-none text-xs focus:border-red-600 dark:focus:border-red-500 font-medium transition-all"
                required
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 shadow-md shadow-button-red"
              >
                {isSending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-gradient-to-tr from-red-600 to-pink-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-600/20 cursor-pointer relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageSquare size={24} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse shadow-md">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};
