import { useAuth } from './auth-store';
import { apiUrl } from './config';

// Mirrors the server error contract (plan §13.1).
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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Sends an Idempotency-Key; pass the same key when retrying the same user action. */
  idempotencyKey?: string;
}

let refreshing: Promise<boolean> | null = null;

// Single-flight refresh so parallel 401s trigger one rotation.
async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { refreshToken, setSession, clear } = useAuth.getState();
    if (!refreshToken) return false;
    const res = await fetch(apiUrl('/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
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

export async function api<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const { accessToken } = useAuth.getState();
  const res = await fetch(apiUrl(`/v1${path}`), {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(opts.idempotencyKey ? { 'idempotency-key': opts.idempotencyKey } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  if (res.status === 401 && !retried && accessToken && (await refreshSession())) {
    return api<T>(path, opts, true);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401) useAuth.getState().clear();
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'Something went wrong', err.details);
  }
  return data as T;
}

export const newIdempotencyKey = () => crypto.randomUUID();
