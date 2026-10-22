import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiUrl } from './config';

// Admin session — stored separately from the Partners app so both can be open at once.
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (s: { accessToken: string; refreshToken: string }) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setSession: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    { name: 'dz-admin-auth', storage: createJSONStorage(() => localStorage) },
  ),
);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { refreshToken, setSession, clear } = useAuth.getState();
    if (!refreshToken) return false;
    const res = await fetch(apiUrl('/v1/auth/refresh'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    if (!res.ok) {
      clear();
      return false;
    }
    setSession(await res.json());
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}, retried = false): Promise<T> {
  const { accessToken } = useAuth.getState();
  const res = await fetch(apiUrl(`/v1${path}`), {
    method: opts.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 401 && !retried && accessToken && (await refreshSession())) return api<T>(path, opts, true);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401) useAuth.getState().clear();
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'Something went wrong', err.details);
  }
  return data as T;
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const d = err.details as { problems?: string[]; fieldErrors?: Record<string, string[]> } | undefined;
    if (d?.problems?.length) return `${err.message}:\n• ${d.problems.join('\n• ')}`;
    const fe = d?.fieldErrors && Object.values(d.fieldErrors).flat()[0];
    return fe ?? err.message;
  }
  return 'Network error. Try again.';
}
