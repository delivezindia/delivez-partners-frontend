import { apiUrl } from './config';
import { useAuth } from './auth-store';

/**
 * Downloads a file from the API with the user's token (a plain link can't send it).
 * Returns the row count the server reports, for the toast.
 */
export async function downloadFile(path: string, filename: string, failMessage: string) {
  const res = await fetch(apiUrl(`/v1${path}`), { headers: { authorization: `Bearer ${useAuth.getState().accessToken ?? ''}` } });
  if (!res.ok) {
    const e = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(e?.error?.message ?? failMessage);
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  // The link must be in the page for Firefox (and some Chrome setups) to save the file.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  return Number(res.headers.get('x-row-count') ?? 0);
}
