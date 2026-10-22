import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs font-medium text-state-delayed">{error}</span> : hint ? <span className="mt-1 block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

const inputCls = 'h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 outline-none transition focus:border-dz-black disabled:bg-neutral-100';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  const cls = props.className ?? '';
  // A caller-supplied width (w-24, flex-1…) replaces the default full width.
  const base = /(^|\s)(w-|flex-1)/.test(cls) ? inputCls.replace(' w-full', ' min-w-0') : inputCls;
  return <input ref={ref} {...props} className={`${base} ${cls}`} />;
});

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} h-auto min-h-24 py-2 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-400 disabled:opacity-60"
    >
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-state-ready' : 'bg-neutral-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex h-12 items-center overflow-hidden rounded-xl border border-neutral-300 bg-white">
      <button type="button" className="h-full w-12 text-xl font-bold hover:bg-neutral-100" onClick={() => onChange(clamp(value - step))} aria-label="Decrease">
        −
      </button>
      <span className="flex-1 text-center text-lg font-semibold">
        {value}
        {unit && <span className="text-sm font-normal text-neutral-500"> {unit}</span>}
      </span>
      <button type="button" className="h-full w-12 text-xl font-bold hover:bg-neutral-100" onClick={() => onChange(clamp(value + step))} aria-label="Increase">
        +
      </button>
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange, multiple = false }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multiple?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(multiple ? (active ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${active ? 'border-dz-black bg-dz-black text-dz-yellow' : 'border-neutral-300 bg-white hover:border-dz-black'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 ${className}`}>
      {title && <h3 className="mb-4 font-semibold">{title}</h3>}
      {children}
    </section>
  );
}
