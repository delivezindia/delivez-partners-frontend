import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** DELIVEZ wordmark (italic, condensed, red) — the customer app has no product pill. */
export function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 text-dz-red no-underline" aria-label="Delivez home">
      <b className={`font-black italic leading-none tracking-tight ${size === 'lg' ? 'text-5xl' : 'text-[30px]'}`} style={{ fontStretch: '72%' }}>
        DELIVEZ
      </b>
    </Link>
  );
}

type Variant = 'primary' | 'dark' | 'ghost' | 'yellow';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-dz-red text-white hover:bg-dz-red-deep border-transparent',
    dark: 'bg-black text-white hover:bg-neutral-800 border-black',
    ghost: 'border-ink bg-white text-ink hover:bg-soft',
    yellow: 'bg-dz-yellow text-black border-black hover:bg-dz-yellow-strong',
  };
  return (
    <button
      {...props}
      className={`inline-flex ${/(^|\s)min-h-/.test(className) ? '' : 'min-h-12'} items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-5 font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-semibold text-dz-red">
      {children}
    </p>
  );
}

/** The Indian veg / non-veg mark: a square with a dot (green) or a triangle (brown). */
export function VegMark({ veg, label }: { veg: boolean | null; label: string }) {
  if (veg == null) return null;
  return (
    <span role="img" aria-label={label} title={label} className={`inline-grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-white ${veg ? 'border-dz-green' : 'border-[#8b4513]'}`}>
      {veg ? <span className="h-2 w-2 rounded-full bg-dz-green" /> : <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-[#8b4513]" />}
    </span>
  );
}

/** Grey placeholder while a list loads. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 ${className}`} aria-hidden />;
}

/** − 2 + control for a basket line. */
export function QtyStepper({ qty, onChange, max, label, size = 'md' }: { qty: number; onChange: (q: number) => void; max: number; label: string; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-10';
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-lg border-[1.5px] border-dz-green bg-dz-green-soft font-extrabold text-dz-green`} role="group" aria-label={label}>
      <button type="button" className="h-full w-9 text-lg hover:bg-dz-green hover:text-white" onClick={() => onChange(qty - 1)} aria-label={`− ${label}`}>
        −
      </button>
      <span className="min-w-6 text-center tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button type="button" className="h-full w-9 text-lg hover:bg-dz-green hover:text-white disabled:opacity-40" disabled={qty >= max} onClick={() => onChange(qty + 1)} aria-label={`+ ${label}`}>
        +
      </button>
    </div>
  );
}
