import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

const TITLES: Record<string, string> = {
  '/': 'Delivez Partners — sell on Delivez Go Local',
  '/how-it-works': 'How it works · Delivez Partners',
  '/pricing': 'Pricing & payouts · Delivez Partners',
  '/faq': 'FAQ · Delivez Partners',
  '/contact': 'Contact · Delivez Partners',
  '/login': 'Log in · Delivez Partners',
};

// Shared shell for every public page: navbar, page, footer.
export function PublicLayout({ footer = true }: { footer?: boolean }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  useEffect(() => {
    if (TITLES[pathname]) document.title = TITLES[pathname];
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {footer && <Footer />}
    </div>
  );
}
