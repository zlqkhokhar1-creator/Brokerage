import { useState, useEffect, useRef } from 'react';

interface PnLData {
  currentPnL: number;
  dailyPnL: number;
  totalPnL: number;
  timestamp: number;
}

export const usePnlStream = () => {
  const [pnlData, setPnLData] = useState<PnLData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws/pnl');
      
      ws.onopen = () => {
        console.log('P&L WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setPnLData(data);
        } catch (err) {
          console.error('Error parsing P&L data:', err);
        }
      };

      ws.onclose = () => {
        console.log('P&L WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('P&L WebSocket error:', error);
        setError('Connection error');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create P&L WebSocket:', err);
      setError('Failed to connect');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    pnlData,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
};
