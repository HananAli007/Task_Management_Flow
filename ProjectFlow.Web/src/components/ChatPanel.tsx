"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2, Paperclip, Image as ImageIcon, FileText, Download } from 'lucide-react';
import { User } from '@/lib/api/users';
import { chatApi, ChatMessage } from '@/lib/api/chat';
import { useSignalR } from '@/hooks/useSignalR';

interface ChatPanelProps {
  user: User;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ user, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewMessage = React.useCallback((message: any) => {
    const sId = message.senderId || message.sender_id;
    const rId = message.receiverId || message.receiver_id;

    if (sId === user.id || rId === user.id) {
      setMessages(prev => {
        const mId = message.id;
        if (prev.some(m => m.id === mId)) return prev;
        return [...prev, message];
      });
    }
  }, [user.id]);

  const { sendMessage, isConnected } = useSignalR(handleNewMessage);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await chatApi.getConversation(user.id);
        setMessages(history);
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    
    const content = inputValue.trim();
    setInputValue('');
    await sendMessage(user.id, content);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isConnected) return;

    setIsUploading(true);
    try {
      const data = await chatApi.uploadFile(file);
      const messageType = data.file_type === 'image' ? 'image' : 'file';
      await sendMessage(user.id, `Sent a ${messageType}`, data.url, messageType);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[340px] h-[500px] flex flex-col glass-card shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] animate-in slide-in-from-bottom-8 duration-500 overflow-hidden border border-white/10" 
         style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px' }}>
      
      {/* Premium Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-indigo-600/10" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 rounded-full shadow-sm" style={{ borderColor: 'var(--bg-card)' }} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{user.name}</h3>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              {isConnected ? 'Active Now' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-slate-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-dots-pattern">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <p className="text-[10px] font-medium text-blue-500/50 uppercase tracking-widest">Loading Chat</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-3">
            <div className="p-4 bg-slate-500/10 rounded-full">
              <MessageCircle size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Say Hello!</p>
              <p className="text-[10px]">Start a conversation with {user.name.split(' ')[0]}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const senderId = msg.senderId || msg.sender_id;
            const isMe = senderId !== user.id;
            const time = msg.sentAt || msg.sent_at;
            const type = msg.messageType || msg.message_type || 'text';
            const url = msg.attachmentUrl || msg.attachment_url;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] shadow-sm overflow-hidden ${
                  isMe 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-none' 
                    : 'bg-slate-100 dark:bg-white/5 text-current rounded-2xl rounded-tl-none border border-black/5 dark:border-white/5'
                }`}>
                  {type === 'image' && url ? (
                    <div className="p-1">
                      <img src={url} alt="attachment" className="rounded-xl max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(url)} />
                    </div>
                  ) : type === 'file' && url ? (
                    <div className="p-3 flex items-center gap-3 min-w-[150px]">
                      <div className="p-2 bg-black/10 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[11px] font-bold truncate">File Attachment</p>
                        <a href={url} target="_blank" className="text-[9px] opacity-70 flex items-center gap-1 hover:underline">
                          <Download size={10} /> Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5">
                      <p className="text-[13px] leading-relaxed selection:bg-white/30">{msg.content}</p>
                    </div>
                  )}
                </div>
                <span className="text-[9px] mt-1.5 px-1 font-medium opacity-40 uppercase tracking-tighter">
                  {time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gradient-to-t from-black/5 to-transparent">
        <form 
          onSubmit={handleSend} 
          className="flex items-center gap-2 bg-white dark:bg-white/5 rounded-2xl p-1.5 shadow-inner border border-black/5 dark:border-white/10 focus-within:border-blue-500/50 transition-all"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !isConnected}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-transparent border-none outline-none text-sm px-1 py-1.5"
            style={{ color: 'var(--text-primary)' }}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || !isConnected}
            className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
