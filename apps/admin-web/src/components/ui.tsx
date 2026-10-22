import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DocStatus, StoreStatus } from '../lib/types';

export function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 text-dz-red" aria-label="Delivez Admin home">
      <b className="text-[30px] font-black italic leading-none tracking-tight" style={{ fontStretch: '72%' }}>
        DELIVEZ
      </b>
      <span className="whitespace-nowrap rounded-md border-[1.5px] border-black bg-white px-2 py-0.5 text-xs font-bold text-black">Admin</span>
    </Link>
  );
}

type Variant = 'red' | 'outline' | 'yellow' | 'dark' | 'green';
export function Button({ variant = 'red', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const v: Record<Variant, string> = {
    red: 'bg-dz-red text-white border-transparent hover:bg-dz-red-deep',
    outline: 'bg-white text-ink border-ink hover:bg-soft',
    yellow: 'bg-dz-yellow text-black border-black hover:bg-dz-yellow-strong',
    dark: 'bg-black text-white border-black hover:bg-neutral-800',
    green: 'bg-dz-green text-white border-transparent hover:brightness-110',
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ${v[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const STORE_STATUS: Record<StoreStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  SUBMITTED: 'bg-dz-yellow-soft text-ink border-dz-yellow-strong',
  UNDER_REVIEW: 'bg-dz-blue-soft text-dz-blue border-dz-blue',
  LIVE: 'bg-dz-green-soft text-dz-green border-dz-green',
  LIMITED: 'bg-amber-50 text-amber-800 border-amber-400',
  PAUSED: 'bg-orange-50 text-orange-800 border-orange-400',
  SUSPENDED: 'bg-dz-red-soft text-dz-red border-dz-red',
  REJECTED: 'bg-dz-red-soft text-dz-red border-dz-red',
  CLOSED: 'bg-neutral-100 text-neutral-500 border-neutral-300',
};
export function StatusChip({ status }: { status: StoreStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STORE_STATUS[status]}`}>{status.replace('_', ' ')}</span>;
}

const DOC_STATUS: Record<DocStatus, string> = {
  PENDING: 'bg-dz-yellow-soft text-ink border-dz-yellow-strong',
  UNDER_REVIEW: 'bg-dz-blue-soft text-dz-blue border-dz-blue',
  VERIFIED: 'bg-dz-green-soft text-dz-green border-dz-green',
  REJECTED: 'bg-dz-red-soft text-dz-red border-dz-red',
  EXPIRED: 'bg-dz-red-soft text-dz-red border-dz-red',
};
export function DocChip({ status }: { status: DocStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${DOC_STATUS[status]}`}>{status.replace('_', ' ')}</span>;
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-line bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-xl leading-none">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={`max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl ${wide ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-2xl leading-none">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-soft" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[clamp(32px,4vw,46px)]">{title}</h1>
        {sub && <p className="text-ink-2">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {hint && <span className="mt-0.5 block text-xs font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-10 w-full rounded-[9px] border-[1.5px] border-line bg-white px-3 outline-none focus:border-black';

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p role="alert" className="whitespace-pre-line rounded-lg bg-dz-red-soft p-3 text-sm font-semibold text-dz-red">{error}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-ink-3">{children}</p>;
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-dz-green' : 'bg-neutral-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
