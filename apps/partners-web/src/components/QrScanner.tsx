import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Modal } from './Modal';

type Decode = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
let decoder: Promise<Decode> | null = null;
/** jsQR is loaded only when someone opens the scanner. */
const loadDecoder = () => (decoder ??= import('jsqr').then((m) => m.default as unknown as Decode));

/** Only Delivez handover codes (DZ1.<order>.<signature>) are accepted. */
export const isHandoverQr = (s: string) => /^DZ1\.[0-9a-f-]{36}\.[\w-]{10,}$/i.test(s.trim());

const MAX_SIDE = 960;

function readCanvas(source: CanvasImageSource, w: number, h: number, canvas: HTMLCanvasElement) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Scans the rider's handover QR with the device camera (back camera on phones/tablets).
 * Falls back to a photo when the camera is blocked or missing. Calls onCode once with a valid code.
 */
export function QrScanner({ onCode, onClose, title }: { onCode: (code: string) => void; onClose: () => void; title: string }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const done = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'no-camera'>('starting');
  const [hint, setHint] = useState<string | null>(null);

  const found = (text: string) => {
    if (done.current) return;
    if (!isHandoverQr(text)) return setHint(t('qr.notOurs'));
    done.current = true;
    onCode(text.trim());
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      const decode = await loadDecoder();
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) return stream.getTracks().forEach((tr) => tr.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setStatus('scanning');
        const tick = () => {
          if (stopped || done.current) return;
          if (v.readyState >= 2 && v.videoWidth) {
            const img = readCanvas(v, v.videoWidth, v.videoHeight, canvas.current);
            const hit = decode(img.data, img.width, img.height);
            if (hit?.data) found(hit.data);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!stopped) setStatus('no-camera');
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setHint(null);
    const decode = await loadDecoder();
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const data = readCanvas(img, img.naturalWidth, img.naturalHeight, canvas.current);
      const hit = decode(data.data, data.width, data.height);
      if (hit?.data) found(hit.data);
      else setHint(t('qr.notFound'));
    } catch {
      setHint(t('qr.notFound'));
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4 / 3' }}>
          <video ref={video} muted playsInline className={`h-full w-full object-cover ${status === 'scanning' ? '' : 'hidden'}`} aria-label={t('qr.camera')} />
          {status === 'scanning' && <span className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-dz-yellow shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" aria-hidden />}
          {status !== 'scanning' && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/90">
              <span className="flex flex-col items-center gap-2">
                <Camera className="h-8 w-8" aria-hidden />
                {status === 'starting' ? t('qr.starting') : t('qr.noCamera')}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-ink-2" data-qr-status={status}>{status === 'scanning' ? t('qr.pointCamera') : t('qr.usePhoto')}</p>
        {hint && <p className="rounded-lg bg-dz-red-soft px-3 py-2 text-sm font-semibold text-dz-red" role="alert">{hint}</p>}
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-3 text-sm font-bold hover:border-black">
          <ImageUp className="h-4 w-4" aria-hidden /> {t('qr.photo')}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void fromPhoto(e.target.files?.[0])} aria-label={t('qr.photo')} />
        </label>
      </div>
    </Modal>
  );
}
