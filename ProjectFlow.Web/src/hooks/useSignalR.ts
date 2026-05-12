import { useEffect } from 'react';
import { useSignalRContext } from '@/context/SignalRContext';

export const useSignalR = (onMessageReceived: (message: any) => void) => {
  const { isConnected, sendMessage, connection } = useSignalRContext();

  useEffect(() => {
    if (!connection) return;

    const handler = (message: any) => {
      onMessageReceived(message);
    };

    connection.on('ReceiveMessage', handler);

    return () => {
      connection.off('ReceiveMessage', handler);
    };
  }, [connection, onMessageReceived]);

  return { isConnected, sendMessage };
};
