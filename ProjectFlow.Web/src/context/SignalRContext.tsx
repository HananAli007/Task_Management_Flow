"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { Phone, PhoneOff, Maximize2, Minimize2, X } from 'lucide-react';

interface SignalRContextType {
  isConnected: boolean;
  sendMessage: (receiverId: string, content: string, attachmentUrl?: string | null, messageType?: string) => Promise<void>;
  connection: signalR.HubConnection | null;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  markAsRead: (userId: string) => void;
}

const SignalRContext = createContext<SignalRContextType | null>(null);

const HUB_URL = '/hubs/chat';


export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isCallExpanded, setIsCallExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeChatUserIdRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const { token, fetchPermissions, user } = useAuthStore();
  const { incomingCall, setIncomingCall, setActiveChatUser } = useChatStore();

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset expansion state when call is ended or cleared
  useEffect(() => {
    if (!incomingCall) {
      setIsCallExpanded(false);
    }
  }, [incomingCall]);

  // Listen for chat open/close events to track active chat
  useEffect(() => {
    const handleOpened = (e: any) => { activeChatUserIdRef.current = e.detail.userId; };
    const handleClosed = () => { activeChatUserIdRef.current = null; };
    window.addEventListener('chat-opened', handleOpened);
    window.addEventListener('chat-closed', handleClosed);
    return () => {
      window.removeEventListener('chat-opened', handleOpened);
      window.removeEventListener('chat-closed', handleClosed);
    };
  }, []);

  // Request desktop notification permission when token is active
  useEffect(() => {
    if (token && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [token]);

  // Audio synthesizer for premium pleasing enterprise double-tone notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  }, []);

  // Standard premium desktop notification pusher
  const showDesktopNotification = useCallback((title: string, body: string, taskId?: string | null, senderId?: string, senderName?: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: body,
        icon: '/favicon.ico',
        tag: taskId ? `task-${taskId}` : senderId ? `chat-${senderId}` : 'general-notification',
        requireInteraction: false
      };
      
      const notification = new Notification(title, options);
      
      notification.onclick = () => {
        window.focus();
        if (taskId) {
          window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId } }));
        } else if (senderId && senderName) {
          window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: senderId, name: senderName } }));
        }
        notification.close();
      };
    }
  }, []);

  const markAsRead = useCallback((userId: string) => {
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('MarkAsRead', userId).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const hubUrl = HUB_URL;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    connection.on('PermissionsUpdated', () => {
      fetchPermissions();
    });

    // Real-time Status & Counts
    connection.on('InitialOnlineUsers', (userIds: string[]) => {
      setOnlineUsers(new Set(userIds.map(id => id.toLowerCase())));
    });

    connection.on('UserStatusChanged', (userId: string, isOnline: boolean) => {
      const lowerId = userId.toLowerCase();
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) next.add(lowerId);
        else next.delete(lowerId);
        return next;
      });
    });

    connection.on('InitialUnreadCounts', (counts: Record<string, number>) => {
      const lowerCounts: Record<string, number> = {};
      Object.entries(counts).forEach(([id, count]) => {
        lowerCounts[id.toLowerCase()] = count;
      });
      setUnreadCounts(lowerCounts);
    });

    connection.on('ReceiveMessage', (message: any) => {
      const msgId = message.id;
      const senderId = (message.senderId || message.sender_id)?.toLowerCase();
      const receiverId = (message.receiverId || message.receiver_id)?.toLowerCase();
      const currentUserId = user?.id?.toLowerCase();
      const activeChatId = activeChatUserIdRef.current?.toLowerCase();

      // Prevent processing the same message ID twice
      if (processedMessagesRef.current.has(msgId)) return;
      processedMessagesRef.current.add(msgId);

      // Only increment unread count if I am the receiver AND not in active chat
      if (currentUserId && receiverId === currentUserId) {
        if (activeChatId !== senderId) {
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));

          // Play premium pleasing tone
          playNotificationSound();

          // Push Desktop Notification
          const cleanContent = message.content.length > 80 ? message.content.substring(0, 80) + '...' : message.content;
          showDesktopNotification(message.senderName || 'New Chat Message', cleanContent, null, senderId, message.senderName);

          import('sonner').then(({ toast }) => {
            toast(message.senderName || 'New Message', {
              description: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
              action: {
                label: 'Reply',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: senderId, name: message.senderName } }));
                }
              }
            });
          });
        }
      }
    });

    connection.on('NotificationReceived', (notification: any) => {
      // Play premium pleasing tone
      playNotificationSound();

      // Push Desktop Notification
      showDesktopNotification(notification.title, notification.message, notification.taskId);

      // Push custom in-app Toast
      import('sonner').then(({ toast }) => {
        toast.info(notification.title, {
          description: notification.message,
          duration: 7000,
          action: notification.taskId ? {
            label: 'View Task',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: notification.taskId } }));
            }
          } : undefined
        });
      });
    });

    connection.on('MessagesRead', (senderId: string) => {
      const lowerSenderId = senderId.toLowerCase();
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[lowerSenderId];
        return next;
      });
    });

    connection.on('IncomingCall', (callerId: string, sdpOffer: string, callerName: string) => {
      useChatStore.getState().setIncomingCall({ callerId, callerName, sdpOffer });
    });

    connection.on('CallEnded', (peerId: string) => {
      useChatStore.getState().setIncomingCall(null);
      window.dispatchEvent(new CustomEvent('webrtc-call-ended', { detail: { peerId } }));
    });

    connection.on('CallRejected', (peerId: string, reason: string) => {
      window.dispatchEvent(new CustomEvent('webrtc-call-rejected', { detail: { peerId, reason } }));
    });

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        setTimeout(startConnection, 5000);
      }
    };

    connection.onclose(() => setIsConnected(false));
    startConnection();
    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [token, fetchPermissions, user]);

  const sendMessage = useCallback(async (receiverId: string, content: string, attachmentUrl: string | null = null, messageType: string = 'text') => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('SendMessage', receiverId, content, attachmentUrl, messageType);
      } catch (err) {
        console.error('SignalR SendMessage Error: ', err);
      }
    }
  }, []);

  const handleTimeoutCall = useCallback(() => {
    if (!incomingCall) return;

    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('RejectCall', incomingCall.callerId, 'timeout').catch(console.error);
    }

    sendMessage(incomingCall.callerId, "Missed Call", null, "call").catch(console.error);
    
    // Log call to local history
    useChatStore.getState().addCallLog({
      userId: incomingCall.callerId,
      userName: incomingCall.callerName,
      avatarUrl: incomingCall.callerAvatar,
      type: 'missed',
    });

    setIncomingCall(null);
    setIsCallExpanded(false);
  }, [incomingCall, sendMessage, setIncomingCall]);

  useEffect(() => {
    if (!incomingCall) return;

    const timer = setTimeout(() => {
      handleTimeoutCall();
    }, 30000); // 30 seconds WhatsApp-like ring duration

    return () => clearTimeout(timer);
  }, [incomingCall, handleTimeoutCall]);

  // Ringtone synthesizer
  useEffect(() => {
    if (!incomingCall) return;

    let active = true;
    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Audio Context failed", e);
    }

    const playRing = () => {
      if (!active || !ctx) return;
      try {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.frequency.value = 453;
        osc2.frequency.value = 440;
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        
        osc1.stop(ctx.currentTime + 1.4);
        osc2.stop(ctx.currentTime + 1.4);
      } catch (e) {
        console.error(e);
      }
    };

    playRing();
    const interval = setInterval(playRing, 3000);

    return () => {
      active = false;
      if (ctx) ctx.close().catch(console.error);
      clearInterval(interval);
    };
  }, [incomingCall]);

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    // Open chat panel for this user
    setActiveChatUser({
      id: incomingCall.callerId,
      name: incomingCall.callerName,
      email: '',
      role: '',
      is_deleted: false,
      created_at: ''
    });

    // Notify the chat panel to handle the inbound SDP offer
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('webrtc-accept-call', { detail: incomingCall }));
    }, 500);

    setIncomingCall(null);
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;
    
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('RejectCall', incomingCall.callerId, 'declined').catch(console.error);
    }
    
    sendMessage(incomingCall.callerId, "Declined Call", null, "call").catch(console.error);

    // Log call to local history
    useChatStore.getState().addCallLog({
      userId: incomingCall.callerId,
      userName: incomingCall.callerName,
      avatarUrl: incomingCall.callerAvatar,
      type: 'missed',
    });

    setIncomingCall(null);
  };

  return (
    <SignalRContext.Provider value={{ 
      isConnected, 
      sendMessage, 
      connection: connectionRef.current,
      onlineUsers,
      unreadCounts,
      markAsRead
    }}>
      {children}
      
      {incomingCall && mounted && createPortal(
        <div 
          className={`fixed transition-all duration-500 ease-in-out flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.45)] overflow-hidden border border-slate-200 dark:border-white/10 ${
            isCallExpanded 
              ? 'inset-0 md:inset-6 w-auto h-auto' 
              : 'bottom-6 right-6 w-[340px] h-[500px] animate-in slide-in-from-bottom-8'
          }`} 
          style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: isCallExpanded ? '16px' : '24px', zIndex: 999999 }}
        >
          {/* Premium Header */}
          <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                  {incomingCall.callerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 rounded-full shadow-sm bg-green-500 animate-pulse" style={{ borderColor: 'var(--bg-secondary)' }} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{incomingCall.callerName}</h3>
                <p className="text-[10px] font-semibold tracking-wide opacity-60 mt-0.5 animate-pulse" style={{ color: 'var(--text-muted)' }}>
                  Incoming Audio Call...
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCallExpanded(!isCallExpanded)} 
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-400 hover:scale-105 active:scale-95"
                title={isCallExpanded ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isCallExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              
              <button 
                onClick={handleDeclineCall} 
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-500/15 hover:text-red-500 transition-all text-slate-400 hover:scale-105 active:scale-95"
                title="Decline Call"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col justify-between p-8 text-current" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-center space-y-6 pt-12 flex-1 flex flex-col justify-center">
              {/* Pulsing Avatar Container */}
              <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
                <div className="absolute inset-2 rounded-full bg-blue-500/10 animate-pulse duration-700" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold shadow-2xl ring-4 ring-white/10 text-white">
                  {incomingCall.callerName.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{incomingCall.callerName}</h2>
                <p className="text-xs uppercase tracking-widest text-blue-500 font-bold animate-pulse">
                  Incoming Audio Call
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-10 pb-12">
              <button
                onClick={handleDeclineCall}
                className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all"
                title="Decline Call"
              >
                <PhoneOff size={28} />
              </button>
              
              <button
                onClick={handleAcceptCall}
                className="w-16 h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all animate-bounce"
                title="Accept Call"
              >
                <Phone size={28} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </SignalRContext.Provider>
  );
};

export const useSignalRContext = () => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalRContext must be used within a SignalRProvider');
  }
  return context;
};
