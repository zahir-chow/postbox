import { useEffect, useRef, useCallback, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * WebSocket hook for real-time admin notifications.
 * Connects when admin is logged in, auto-reconnects on failure.
 */
export function useWebSocket(isAdmin, onEvent) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (!isAdmin) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/admin/notifications/?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Display toast for various event types
          switch (data.type) {
            case 'new_complaint':
              toast('📬 New complaint: ' + (data.subject || 'Untitled'), {
                duration: 5000,
                className: 'toast-custom',
              });
              break;
            case 'status_change':
              toast('🔄 Status updated: ' + (data.subject || ''), {
                duration: 4000,
                className: 'toast-custom',
              });
              break;
            case 'nid_verified':
              toast.success('✅ NID verified: ' + (data.extracted_name || ''), {
                duration: 5000,
                className: 'toast-custom',
              });
              break;
            case 'nid_failed':
              toast.error('❌ NID verification failed', {
                duration: 5000,
                className: 'toast-custom',
              });
              break;
            case 'complaint_escalated':
              toast('⚠️ Complaint escalated: ' + (data.subject || ''), {
                duration: 6000,
                className: 'toast-custom',
                icon: '🔺',
              });
              break;
            default:
              break;
          }

          // Pass event to callback
          if (onEvent) onEvent(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket creation failed
    }
  }, [isAdmin, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}

export default useWebSocket;
