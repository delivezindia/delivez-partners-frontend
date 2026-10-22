import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './auth-store';
import { API_URL } from './config';

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  occurredAt: string;
  actor?: { type: string; userId?: string; role?: string };
  data: T;
}

/** Joins `store:{id}` and calls onEvent for every event routed to that room. Returns connection state. */
export function useStoreSocket(storeId: string | undefined, onEvent: (event: DomainEvent) => void) {
  const token = useAuth((s) => s.accessToken);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!storeId || !token) return;
    // Same origin by default; the API's own domain when the web app is hosted separately.
    const socket: Socket = API_URL ? io(API_URL, { auth: { token }, transports: ['websocket'] }) : io({ auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { room: `store:${storeId}` });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.onAny((_type: string, event: DomainEvent) => {
      if (event && typeof event === 'object' && 'type' in event) onEvent(event);
    });
    return () => {
      socket.close();
    };
    // onEvent is intentionally excluded: callers pass inline handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, token]);

  return connected;
}
