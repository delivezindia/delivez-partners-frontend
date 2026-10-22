import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { api } from './api';
import { useAuth } from './auth-store';
import { disablePush } from './notifications';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    // Unlink this device first (needs the session), so the next person here doesn't get our alerts.
    await disablePush().catch(() => undefined);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Already logged out on the server; clear locally either way.
    }
    // Leave protected routes first, so RequireAuth doesn't redirect to /login?next=… as the session clears.
    flushSync(() => navigate('/login', { replace: true, state: { loggedOut: true } }));
    useAuth.getState().clear();
    queryClient.clear();
  };
}
