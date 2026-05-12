"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/store/useAuthStore';

interface SignalRContextType {
  isConnected: boolean;
  sendMessage: (receiverId: string, content: string, attachmentUrl?: string | null, messageType?: string) => Promise<void>;
  connection: signalR.HubConnection | null;
}

const SignalRContext = createContext<SignalRContextType | null>(null);

const getHubUrl = () => {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      baseUrl = `http://${hostname}:5000`;
    }
  }
  return `${baseUrl}/hubs/chat`;
};

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const { token, fetchPermissions } = useAuthStore();

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
      console.log('Real-time permissions update received via Provider.');
      fetchPermissions();
    });

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);
        console.log('SignalR Connected (Provider).');
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
  }, [token, fetchPermissions]);

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
    <SignalRContext.Provider value={{ isConnected, sendMessage, connection: connectionRef.current }}>
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
