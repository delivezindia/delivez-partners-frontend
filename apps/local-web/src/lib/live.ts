import { useEffect, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './auth-store';
import { API_URL } from './config';

/**
 * Follows `order:{id}` or `booking:{id}` over the socket and refetches `queryKey` whenever the shop
 * changes something. The server only sends a "changed" signal, never the order itself.
 * Returns true while the room is joined, so callers can slow their polling down.
 */
export function useLiveRoom(room: string | null, queryKey: QueryKey) {
  const token = useAuth((s) => s.accessToken);
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  const key = JSON.stringify(queryKey);

  useEffect(() => {
    if (!room || !token) return;
    const opts = { auth: { token }, transports: ['websocket'] };
    // Same origin by default (Vite proxy); the API's own domain when hosted separately.
    const socket: Socket = API_URL ? io(API_URL, opts) : io(opts);
    socket.on('connect', () => {
      socket.emit('join', { room }, (res: { ok?: boolean } | undefined) => setLive(!!res?.ok));
    });
    socket.on('disconnect', () => setLive(false));
    socket.onAny((_type: string, event: unknown) => {
      if (event && typeof event === 'object' && 'type' in event) void qc.invalidateQueries({ queryKey: JSON.parse(key) as QueryKey });
    });
    return () => {
      setLive(false);
      socket.close();
    };
  }, [room, token, key, qc]);

  return live;
}
