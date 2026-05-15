"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/store/useAuthStore';

interface SignalRContextType {
  isConnected: boolean;
  sendMessage: (receiverId: string, content: string, attachmentUrl?: string | null, messageType?: string) => Promise<void>;
  connection: signalR.HubConnection | null;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  markAsRead: (userId: string) => void;
}

const SignalRContext = createContext<SignalRContextType | null>(null);

const getHubUrl = () => {
  return '/backend-hubs/chat';
};

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeChatUserIdRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const { token, fetchPermissions, user } = useAuthStore();

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

    const hubUrl = getHubUrl();
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

    connection.on('MessagesRead', (senderId: string) => {
      const lowerSenderId = senderId.toLowerCase();
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[lowerSenderId];
        return next;
      });
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
