import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronDown, Globe, Menu, X } from 'lucide-react';
import { Brand } from './ui';
import { PARTNERS_URL } from '../lib/config';
import { useAuth } from '../lib/auth-store';
import { useI18n, type MsgKey } from '../lib/i18n';
import { VERTICAL_LABEL } from '../lib/labels';
import { VerticalIcon } from './VerticalIcon';
import type { Vertical } from '../lib/types';

/* Public-site building blocks, matching the Delivez Partners site (apps/partners-web/src/site). */

export const SITE_VERTICALS: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'];

export function Section({ id, eyebrow, title, intro, children, className = '', center = false }: { id?: string; eyebrow?: string; title?: string; intro?: string; children: ReactNode; className?: string; center?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl">
        {(eyebrow || title || intro) && (
          <div className={`mb-10 max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
            {eyebrow && <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-dz-red">{eyebrow}</p>}
            {title && <h2 className="text-[clamp(30px,4vw,44px)] leading-none">{title}</h2>}
            {intro && <p className={`mt-3 text-lg ${className.includes('text-white') ? 'text-neutral-300' : 'text-ink-2'}`}>{intro}</p>}
          </div>
        )}
        {children}
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
            <Check className="h-4 w-4" aria-hidden />
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
            <ChevronDown className={`h-5 w-5 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open === i && <p className="px-5 pb-5 text-neutral-600">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}

/** Black band with the red bottom rule — for shop owners. */
export function ShopCtaBand() {
  const { t } = useI18n();
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[18px] border-b-4 border-dz-red bg-black px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
        <div>
          <h2 className="text-[clamp(28px,3.5vw,40px)] leading-none">{t('lc.land.shopTitle')}</h2>
          <p className="mt-2 max-w-xl text-neutral-300">{t('lc.site.shopBody')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={PARTNERS_URL} className="dz-btn-red">
            {t('lc.land.shopCta')}
          </a>
          <a href={`${PARTNERS_URL}/how-it-works`} className="inline-flex min-h-12 items-center justify-center rounded-[10px] border-[1.5px] border-white/40 px-6 font-extrabold text-white transition hover:border-white">
            {t('lc.land.howTitle')}
          </a>
        </div>
      </div>
    </section>
  );
}

const navCls = 'flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-sm font-semibold text-black transition hover:text-dz-red';

function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

/** Site header: yellow with the red rule, like the Partners site. `onCategory` lets the landing page react to a pick. */
export function SiteNavbar({ onCategory }: { onCategory?: (v: Vertical) => void }) {
  const { pathname } = useLocation();
  const token = useAuth((s) => s.accessToken);
  const { t, lang, languages, setLanguage } = useI18n();
  const [catOpen, setCatOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  useClickOutside(catRef, () => setCatOpen(false));
  useClickOutside(langRef, () => setLangOpen(false));

  useEffect(() => {
    setCatOpen(false);
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const home = pathname === '/';
  const anchor = (id: string) => (home ? `#${id}` : `/#${id}`);
  const LINKS: { href: string; label: MsgKey }[] = [
    { href: anchor('how'), label: 'lc.land.howTitle' },
    { href: anchor('faq'), label: 'lc.site.faq' },
  ];
  const pickCategory = (v: Vertical) => {
    setCatOpen(false);
    setMobileOpen(false);
    onCategory?.(v);
  };

  return (
    <>
      <header className={`dz-header sticky top-0 z-50 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-5" aria-label="Main">
          <Brand />

          <div className="ml-4 hidden items-center gap-0.5 lg:flex">
            <div ref={catRef} className="relative">
              <button type="button" aria-expanded={catOpen} onClick={() => setCatOpen((o) => !o)} className={navCls}>
                {t('lc.home.categories')} <ChevronDown className={`h-4 w-4 transition ${catOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {catOpen && (
                <div className="absolute left-0 top-full mt-3 w-[440px] rounded-[14px] border border-line bg-white p-3 text-ink shadow-xl">
                  <div className="grid grid-cols-2 gap-1">
                    {SITE_VERTICALS.map((v) => (
                      <Link key={v} to={`/?v=${v}`} onClick={() => pickCategory(v)} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-dz-yellow-soft">
                        <VerticalIcon v={v} />
                        <span className="text-sm font-bold">{t(VERTICAL_LABEL[v])}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={navCls}>
                {t(l.label)}
              </a>
            ))}
            <a href={PARTNERS_URL} className={navCls}>
              {t('lc.site.forShops')}
            </a>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div ref={langRef} className="relative hidden sm:block">
              <button type="button" onClick={() => setLangOpen((o) => !o)} className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-bold text-black hover:bg-black/5" aria-label={t('lc.acc.language')}>
                <Globe className="h-[18px] w-[18px]" aria-hidden /> {lang}
              </button>
              {langOpen && (
                <ul className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-line bg-white p-1 text-ink shadow-xl">
                  {languages.map((l) => (
                    <li key={l.code}>
                      <button
                        type="button"
                        onClick={() => {
                          void setLanguage(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-dz-yellow-soft ${l.code === lang ? 'font-bold' : ''}`}
                      >
                        {l.label} <span className="text-xs text-ink-3">{l.english}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {token ? (
              <>
                <Link to="/orders" className="hidden px-2 text-sm font-bold text-black hover:text-dz-red sm:inline">
                  {t('lc.ord.all')}
                </Link>
                <Link to="/account" className="inline-flex min-h-10 items-center rounded-[10px] bg-black px-4 text-sm font-extrabold text-white hover:bg-neutral-800">
                  {t('lc.acc.title')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden min-h-10 items-center rounded-[10px] border-[1.5px] border-black bg-white px-4 text-sm font-extrabold hover:bg-soft sm:inline-flex">
                  {t('lc.login')}
                </Link>
                <Link to="/signup" className="inline-flex min-h-10 items-center rounded-[10px] bg-dz-red px-4 text-sm font-extrabold text-white hover:bg-dz-red-deep">
                  {t('lc.auth.signup')}
                </Link>
              </>
            )}
            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-black/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t('lc.site.menu')}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="dz-rise absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col overflow-y-auto bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('lc.site.menu')}>
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-soft" aria-label={t('lc.cancel')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.home.categories')}</p>
            <ul className="mt-2 space-y-1">
              {SITE_VERTICALS.map((v) => (
                <li key={v}>
                  <Link to={`/?v=${v}`} onClick={() => pickCategory(v)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 font-bold hover:bg-dz-yellow-soft">
                    <VerticalIcon v={v} size="sm" bare /> {t(VERTICAL_LABEL[v])}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-line pt-4">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-2 py-2.5 font-bold hover:bg-soft">
                  {t(l.label)}
                </a>
              ))}
              {token && (
                <Link to="/orders" className="block rounded-xl px-2 py-2.5 font-bold hover:bg-soft">
                  {t('lc.ord.all')}
                </Link>
              )}
              <a href={PARTNERS_URL} className="block rounded-xl px-2 py-2.5 font-bold hover:bg-soft">
                {t('lc.site.forShops')}
              </a>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.acc.language')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {languages.map((l) => (
                  <button key={l.code} type="button" onClick={() => void setLanguage(l.code)} className={`rounded-full border px-3 py-1.5 text-sm ${l.code === lang ? 'border-black bg-black font-bold text-dz-yellow' : 'border-line'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            {!token && (
              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                <Link to="/login" className="dz-btn-outline px-3">
                  {t('lc.login')}
                </Link>
                <Link to="/signup" className="dz-btn-red px-3">
                  {t('lc.auth.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  return (
    <footer className="bg-dz-black text-neutral-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <p className="flex items-center gap-2.5">
            <b className="text-[30px] font-black italic leading-none tracking-tight text-dz-yellow" style={{ fontStretch: '72%' }}>
              DELIVEZ
            </b>
          </p>
          <p className="mt-3 text-sm text-neutral-400">{t('lc.site.footerAbout')}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t('lc.home.categories')}</p>
          <ul className="space-y-2 text-sm">
            {SITE_VERTICALS.map((v) => (
              <li key={v}>
                <Link to={`/?v=${v}`} className="hover:text-dz-yellow">
                  {t(VERTICAL_LABEL[v])}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t('lc.site.yourAccount')}</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/refund-policy" className="hover:text-dz-yellow">
                {t('lc.site.policy')}
              </Link>
            </li>
            <li>
              <Link to={token ? '/orders' : '/login?next=/orders'} className="hover:text-dz-yellow">
                {t('lc.ord.all')}
              </Link>
            </li>
            <li>
              <Link to={token ? '/account' : '/login?next=/account'} className="hover:text-dz-yellow">
                {t('lc.acc.addresses')}
              </Link>
            </li>
            {!token && (
              <>
                <li>
                  <Link to="/login" className="hover:text-dz-yellow">
                    {t('lc.login')}
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-dz-yellow">
                    {t('lc.auth.signup')}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t('lc.site.forBusiness')}</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={PARTNERS_URL} className="hover:text-dz-yellow">
                {t('lc.land.shopCta')}
              </a>
            </li>
            <li>
              <a href={`${PARTNERS_URL}/pricing`} className="hover:text-dz-yellow">
                {t('lc.site.partnerPricing')}
              </a>
            </li>
            <li>
              <a href={`${PARTNERS_URL}/login`} className="hover:text-dz-yellow">
                {t('lc.site.partnerLogin')}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-neutral-500 sm:px-6">
          <span>© {new Date().getFullYear()} Delivez. {t('lc.site.rights')}</span>
          <span>Delivez One · Delivez Customer App · Delivez Partners</span>
        </div>
      </div>
    </footer>
  );
}
