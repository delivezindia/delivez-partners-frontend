import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import { SERVICES } from './content';
import { IconChevron, IconClose, IconGlobe, IconMenu } from './icons';
import { useRegisterHref } from './links';
import { LANGUAGES, useI18n, type MsgKey } from '../lib/i18n';

const LINKS: { to: string; label: MsgKey }[] = [
  { to: '/how-it-works', label: 'nav.howItWorks' },
  { to: '/pricing', label: 'nav.pricing' },
  { to: '/faq', label: 'nav.faq' },
  { to: '/contact', label: 'nav.contact' },
];

// Reference header nav: black semibold links; active = red with a red underline.
const navCls = (active: boolean) =>
  `flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-sm font-semibold transition hover:text-dz-red ${
    active ? 'text-dz-red shadow-[inset_0_-2px_0_var(--color-dz-red)]' : 'text-black'
  }`;

function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

export function Navbar() {
  const { pathname } = useLocation();
  const token = useAuth((s) => s.accessToken);
  const { t, lang: language, setLanguage } = useI18n();
  const registerHref = useRegisterHref();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  useClickOutside(servicesRef, () => setServicesOpen(false));
  useClickOutside(langRef, () => setLangOpen(false));

  useEffect(() => {
    setServicesOpen(false);
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

  const onServicePage = pathname.startsWith('/services/');

  return (
    <>
      <header className={`dz-header sticky top-0 z-50 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-5" aria-label="Main">
          <Brand />

          {/* Desktop links */}
          <div className="ml-4 hidden items-center gap-0.5 lg:flex">
            <div ref={servicesRef} className="relative">
              <button type="button" aria-expanded={servicesOpen} onClick={() => setServicesOpen((o) => !o)} className={navCls(onServicePage)}>
                {t('nav.services')} <IconChevron size={16} className={`transition ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesOpen && (
                <div className="absolute left-0 top-full mt-3 w-[560px] rounded-[14px] border border-line bg-white p-3 text-ink shadow-xl">
                  <div className="grid grid-cols-2 gap-1">
                    {SERVICES.map((s) => (
                      <Link key={s.slug} to={`/services/${s.slug}`} className="flex gap-3 rounded-xl p-3 transition hover:bg-dz-yellow-soft">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-line ${s.accent}`}>
                          <s.icon size={20} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold">{s.name}</span>
                          <span className="block text-xs text-ink-2">{s.tagline}</span>
                        </span>
                      </Link>
                    ))}
                    <Link to="/how-it-works" className="flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-dz-yellow-strong bg-dz-yellow-soft p-3 text-sm font-bold">
                      {t('login.seeHow')} →
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => navCls(isActive)}>
                {t(l.label)}
              </NavLink>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Language */}
            <div ref={langRef} className="relative hidden sm:block">
              <button type="button" onClick={() => setLangOpen((o) => !o)} className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-bold text-black hover:bg-black/5" aria-label={t('nav.language')}>
                <IconGlobe size={18} /> {language}
              </button>
              {langOpen && (
                <ul className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-line bg-white p-1 text-ink shadow-xl">
                  {LANGUAGES.map((l) => (
                    <li key={l.code}>
                      <button
                        type="button"
                        onClick={() => {
                          void setLanguage(l.code);
                          setLangOpen(false);
                        }}
                        lang={l.locale}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-dz-yellow-soft ${language === l.code ? 'font-bold text-dz-red' : ''}`}
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reference .hbtn (outline) and .hbtn.blk (black) */}
            <Link to={token ? '/accounts' : '/login'} className="hidden items-center rounded-lg border-[1.5px] border-black px-3.5 py-1.5 text-sm font-bold text-black hover:bg-black/5 sm:inline-flex">
              {token ? t('nav.dashboard') : t('nav.login')}
            </Link>
            <Link to={registerHref} className="inline-flex items-center rounded-lg border-[1.5px] border-black bg-black px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-neutral-800">
              {t('nav.register')}
            </Link>
            <button type="button" className="rounded-lg p-2 text-black lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu — outside <header> so the sticky header can't clip this fixed panel */}
      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[67px] z-50 overflow-y-auto bg-white px-4 pb-10 pt-2 lg:hidden">
          <p className="px-2 pb-2 pt-3 text-xs font-bold uppercase tracking-wide text-ink-3">{t('nav.services')}</p>
          {SERVICES.map((s) => (
            <Link key={s.slug} to={`/services/${s.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-dz-yellow-soft">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-line ${s.accent}`}>
                <s.icon size={20} />
              </span>
              <span className="font-bold">{s.name}</span>
            </Link>
          ))}
          <div className="my-3 border-t border-line" />
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `block rounded-xl px-2 py-3 font-bold ${isActive ? 'text-dz-red' : ''}`}>
              {t(l.label)}
            </NavLink>
          ))}
          <div className="my-3 border-t border-line" />
          <div className="flex flex-wrap gap-2 px-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => void setLanguage(l.code)}
                lang={l.locale}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold ${language === l.code ? 'border-dz-yellow-strong bg-dz-yellow-soft' : 'border-line'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            <Link to={token ? '/accounts' : '/login'} className="dz-btn-outline w-full">
              {token ? t('nav.goToDashboard') : t('nav.login')}
            </Link>
            <Link to={registerHref} className="dz-btn-red w-full">
              {t('nav.registerBusiness')}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
