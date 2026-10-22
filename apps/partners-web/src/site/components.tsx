import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconChevron } from './icons';
import { useRegisterHref } from './links';

export function Section({ id, eyebrow, title, intro, children, className = '', center = false }: { id?: string; eyebrow?: string; title?: string; intro?: string; children: ReactNode; className?: string; center?: boolean }) {
  return (
    <section id={id} className={`px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl">
        {(eyebrow || title || intro) && (
          <div className={`mb-10 max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
            {eyebrow && <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-dz-red">{eyebrow}</p>}
            {title && <h2 className="text-[clamp(30px,4vw,44px)] leading-none">{title}</h2>}
            {intro && <p className="mt-3 text-lg text-ink-2">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line bg-gradient-to-br from-dz-yellow-soft via-dz-yellow-soft/60 to-white px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        {eyebrow && <p className="dz-badge mb-4">{eyebrow}</p>}
        <h1 className="max-w-3xl text-[clamp(34px,5vw,56px)]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-ink-2">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export function RegisterButton({ children = 'Register your business', className = '' }: { children?: ReactNode; className?: string }) {
  const href = useRegisterHref();
  return (
    <Link to={href} className={`dz-btn-red ${className}`}>
      {children}
    </Link>
  );
}

export function SecondaryLink({ to, children, dark = false }: { to: string; children: ReactNode; dark?: boolean }) {
  return (
    <Link
      to={to}
      className={dark ? 'inline-flex min-h-12 items-center justify-center rounded-[10px] border-[1.5px] border-white/40 px-6 font-extrabold text-white transition hover:border-white' : 'dz-btn-outline'}
    >
      {children}
    </Link>
  );
}

export function CtaBand({ title = 'Ready to sell on Delivez?', body = 'Registration is free and takes about 15 minutes. Documents can come later.' }: { title?: string; body?: string }) {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[18px] border-b-4 border-dz-red bg-black px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
        <div>
          <h2 className="text-[clamp(28px,3.5vw,40px)] leading-none">{title}</h2>
          <p className="mt-2 text-neutral-300">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <RegisterButton />
          <SecondaryLink to="/contact" dark>
            Talk to us
          </SecondaryLink>
        </div>
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dz-green-soft text-dz-green">
            <IconCheck size={16} />
          </span>
          <span className="text-neutral-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-[14px] border border-line bg-white">
      {items.map((f, i) => (
        <div key={f.q}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold">
            {f.q}
            <IconChevron size={20} className={`shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="px-5 pb-5 text-neutral-600">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}

export function SoonBadge() {
  return <span className="dz-badge ml-2 px-2 py-0.5 text-[11px]">Coming soon</span>;
}

/** Illustrative Partners order card used in heroes (not live data). */
export function OrderCardMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border-l-8 border-state-preparing bg-white p-5 shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">#DEL-83421</span>
        <span className="rounded-full bg-state-preparing/30 px-2 py-0.5 text-xs font-bold">PREPARING · 08:12</span>
      </div>
      <p className="mt-2 text-sm text-neutral-500">Rahul S. · 3 items · ₹522 · UPI paid</p>
      {!compact && (
        <ul className="mt-3 space-y-1 text-sm">
          <li>Chicken Biryani × 1</li>
          <li>Butter Naan × 2</li>
          <li>Coke 500 ml × 1</li>
        </ul>
      )}
      <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">Rider Akash · arriving in 6 min · SLA risk: low</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="flex h-11 items-center justify-center rounded-xl bg-state-almost text-sm font-bold text-white">Ready soon</span>
        <span className="flex h-11 items-center justify-center rounded-xl bg-state-ready text-sm font-bold text-white">ORDER READY</span>
      </div>
    </div>
  );
}
