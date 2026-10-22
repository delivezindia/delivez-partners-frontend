import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** DELIVEZ wordmark (italic, condensed, red) + product pill — as in the Delivez web reference. */
export function Brand({ size = 'sm', product = 'Partners', compact = false }: { size?: 'sm' | 'lg'; product?: string; compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 text-dz-red no-underline" aria-label={`Delivez ${product} home`}>
      <b className={`font-black italic leading-none tracking-tight ${size === 'lg' ? 'text-5xl' : 'text-[30px]'}`} style={{ fontStretch: '72%' }}>
        DELIVEZ
      </b>
      <span className={`whitespace-nowrap rounded-md border-[1.5px] border-black bg-white px-2 py-0.5 text-xs font-bold text-black ${compact ? 'hidden md:inline' : ''}`}>{product}</span>
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
      // A caller-supplied min-h-* replaces the default 48px touch height.
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
