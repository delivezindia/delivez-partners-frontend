import { Link } from 'react-router-dom';
import { CONTACT, SERVICES } from './content';

export function Footer() {
  return (
    <footer className="bg-dz-black text-neutral-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <p className="flex items-center gap-2.5">
            <b className="text-[30px] font-black italic leading-none tracking-tight text-dz-yellow" style={{ fontStretch: '72%' }}>
              DELIVEZ
            </b>
            <span className="rounded-md border-[1.5px] border-white px-2 py-0.5 text-xs font-bold text-white">Partners</span>
          </p>
          <p className="mt-3 text-sm text-neutral-400">Helping neighbourhood restaurants, stores and pharmacies sell online and deliver in minutes.</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Services</p>
          <ul className="space-y-2 text-sm">
            {SERVICES.map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`} className="hover:text-dz-yellow">
                  {s.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Partners</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/how-it-works" className="hover:text-dz-yellow">How it works</Link></li>
            <li><Link to="/pricing" className="hover:text-dz-yellow">Pricing & payouts</Link></li>
            <li><Link to="/faq" className="hover:text-dz-yellow">FAQ</Link></li>
            <li><Link to="/login" className="hover:text-dz-yellow">Partner login</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Contact</p>
          <ul className="space-y-2 text-sm">
            <li><a href={`mailto:${CONTACT.email}`} className="hover:text-dz-yellow">{CONTACT.email}</a></li>
            {CONTACT.phone && <li>{CONTACT.phone}</li>}
            <li>{CONTACT.hours}</li>
            <li><Link to="/contact" className="hover:text-dz-yellow">All contact options</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-neutral-500 sm:px-6">
          <span>© {new Date().getFullYear()} Delivez. All rights reserved.</span>
          <span>Delivez One · Delivez Customer App · Delivez Partners</span>
        </div>
      </div>
    </footer>
  );
}
