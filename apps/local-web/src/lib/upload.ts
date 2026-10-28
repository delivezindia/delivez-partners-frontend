import { api } from './api';
import { apiUrl } from './config';

interface Presigned {
  fileKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_MB = 10;

/** Presign on the API (`presignPath`), then PUT the file straight to storage. Resolves with the file key. */
export async function uploadFile(presignPath: string, file: File): Promise<string> {
  const pre = await api<Presigned>(presignPath, { method: 'POST', body: { contentType: file.type, size: file.size } });
  const url = /^https?:\/\//.test(pre.uploadUrl) ? pre.uploadUrl : apiUrl(pre.uploadUrl);
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!res.ok) throw new Error('Upload failed — try again');
  return pre.fileKey;
}
