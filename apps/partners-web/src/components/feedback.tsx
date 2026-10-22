import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';

/* ---------- Toasts: short confirmations for quick actions (toggle, pause, save) ---------- */

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}
const useToasts = create<{ items: Toast[]; push: (t: Omit<Toast, 'id'>) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), t.tone === 'error' ? 6000 : 3000);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (text: string) => useToasts.getState().push({ tone: 'success', text }),
  error: (text: string) => useToasts.getState().push({ tone: 'error', text }),
  info: (text: string) => useToasts.getState().push({ tone: 'info', text }),
};

const TONE: Record<Tone, { icon: LucideIcon; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-dz-green' },
  error: { icon: XCircle, cls: 'text-dz-red' },
  info: { icon: Info, cls: 'text-dz-blue' },
};

export function Toaster() {
  const { items, drop } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[108px] z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => {
        const { icon: Icon, cls } = TONE[t.tone];
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="dz-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
            <Icon className={`h-5 w-5 shrink-0 ${cls} rounded-full bg-white`} aria-hidden />
            <span className="flex-1">{t.text}</span>
            <button type="button" onClick={() => drop(t.id)} aria-label="Dismiss" className="text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Loading + empty states ---------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`dz-skeleton rounded-lg ${className}`} aria-hidden />;
}

/** A few stacked rows — the default placeholder while a list loads. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-px overflow-hidden rounded-[14px] border border-line bg-white" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-12 w-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-[14px] border-[1.5px] border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-dz-yellow-soft text-ink">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 text-lg font-extrabold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------- Avatar + dropdown menu ---------- */

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials =
    name
      .replace(/^\+?\d+$/, '#')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  return <span className={`grid shrink-0 place-items-center rounded-full bg-black font-extrabold text-dz-yellow ${className}`}>{initials}</span>;
}

/**
 * Small popover menu that closes on outside click, Escape or after choosing an item.
 * `items` with `danger` render red; a `null` item renders a divider.
 */
export function Dropdown({
  trigger,
  label,
  items,
  align = 'right',
  triggerClass = '',
}: {
  trigger: ReactNode;
  label: string;
  items: ({ label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean } | null)[];
  align?: 'left' | 'right';
  triggerClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={triggerClass}>
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`dz-pop absolute z-40 mt-1.5 min-w-44 rounded-xl border border-line bg-white p-1 text-sm text-ink shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((it, i) =>
            it === null ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold hover:bg-dz-yellow-soft ${it.danger ? 'text-dz-red' : ''}`}
              >
                {it.icon && <it.icon className="h-4 w-4 opacity-70" aria-hidden />}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
