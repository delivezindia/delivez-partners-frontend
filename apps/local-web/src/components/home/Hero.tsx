import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Handshake, LayoutGrid, LocateFixed, MapPin, Search, ShieldCheck, ShoppingBag, ShoppingCart, Store, Zap, type LucideIcon } from 'lucide-react';
import { ZeroPanel } from '../categoryPage';
import { useAuth } from '../../lib/auth-store';
import { cartCount, cartTotal, useCart } from '../../lib/cart';
import { rupees } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { ADDRESS_LABEL } from '../../lib/labels';
import { fromAddress, useDeliverTo } from '../../lib/location';
import { useAddresses } from '../../lib/queries';
import { KIND_LOOK } from '../VerticalIcon';
import { useAround, type Kind } from './kit';

const BENEFITS: { icon: LucideIcon; label: string }[] = [
  { icon: Store, label: 'Nearby stores' },
  { icon: Zap, label: 'Fast local delivery' },
  { icon: MapPin, label: 'Live order tracking' },
  { icon: ShieldCheck, label: 'Secure online payments' },
  { icon: LayoutGrid, label: 'Multiple categories' },
  { icon: Handshake, label: 'Local merchant support' },
];
const QUICK: [string, string][] = [
  ['categories', 'Shop Local'],
  ['stores', 'Find Stores Near Me'],
  ['merchants', 'Become a Merchant'],
  ['track', 'Track Order'],
];

/**
 * Hero: the headline, the ₹0 panel (only fees that really are zero; the flat delivery fee is spelled out), where to
 * deliver (saved addresses, current location or the map) and the street of shops.
 */
export function NowHero({ onGps, onGo, mapHref, message, askLocation }: { onGps: () => void; onGo: () => void; mapHref: string; message: string; askLocation: () => void }) {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const at = useDeliverTo((s) => s.at);
  const set = useDeliverTo((s) => s.set);
  const addresses = useAddresses();
  const { fee } = useAround();
  const saved = token ? (addresses.data ?? []) : [];
  const field = 'min-h-11 rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-3.5 text-sm font-bold text-white';
  return (
    <section className="relative overflow-hidden bg-black px-4 text-white sm:px-6" data-now-hero>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(800px 460px at 85% 100%, rgba(255,212,0,.2), transparent 62%), radial-gradient(500px 300px at 10% 0%, rgba(232,19,15,.18), transparent 60%)' }} aria-hidden />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-11 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[1.4px] text-dz-yellow">
            <Store className="h-4 w-4" aria-hidden /> Delivez Now · Everything around you, delivered.
          </p>
          <h1 className="mb-4 mt-3 text-[clamp(46px,6.4vw,92px)] leading-[0.9] tracking-[-0.5px]">
            Your City. Your Stores. <span className="text-dz-yellow">Delivered.</span>
          </h1>
          <p className="mb-6 max-w-[54ch] text-[18.5px] text-[#D2D2CE]">Shop from nearby restaurants, grocery stores, pharmacies and local retailers — all through one Delivez Now experience.</p>
          <ZeroPanel fee={fee} />

          <div className="flex flex-wrap gap-2" id="hero-location">
            {saved.length > 0 ? (
              <select
                aria-label="Deliver to"
                className={`${field} min-w-0 flex-1 sm:max-w-[300px]`}
                value=""
                onChange={(e) => {
                  const a = saved.find((x) => x.id === e.target.value);
                  if (!a) return;
                  set(fromAddress(a, t(ADDRESS_LABEL[a.label])));
                  onGo();
                }}
              >
                <option value="">{at ? `Deliver to ${at.title}` : 'Choose a saved address'}</option>
                {saved.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${t(ADDRESS_LABEL[a.label])} · ${[a.line1, a.cityName].filter(Boolean).join(', ')}`}
                  </option>
                ))}
              </select>
            ) : (
              <Link to={mapHref} className={`${field} inline-flex items-center gap-2 hover:border-dz-yellow`}>
                <Search className="h-4 w-4 text-dz-yellow" aria-hidden /> {at ? `Deliver to ${at.title}` : t('lc.land.searchMap')}
              </Link>
            )}
            <button type="button" onClick={onGps} className={`${field} inline-flex items-center gap-2 hover:border-dz-yellow`}>
              <LocateFixed className="h-4 w-4 text-dz-red" aria-hidden /> {t('lc.loc.useGps')}
            </button>
          </div>
          {message && (
            <p className="mt-2 max-w-xl rounded-lg bg-dz-yellow px-3 py-2 text-sm font-bold text-black" role="status">
              {message}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => (at ? onGo() : askLocation())} className="inline-flex min-h-12 items-center rounded-xl bg-dz-yellow px-[18px] font-black text-black transition hover:-translate-y-0.5">
              Start Shopping
            </button>
            <a href="#stores" className="inline-flex min-h-12 items-center rounded-xl border-[1.5px] border-white/40 px-[18px] font-black text-white transition hover:border-white">
              Find Nearby Stores
            </a>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {QUICK.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex items-center gap-1 text-[13.5px] font-extrabold text-dz-yellow hover:underline">
                {label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {BENEFITS.map((b) => (
              <li key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121212] px-3 py-1.5 text-[13px] font-bold text-neutral-200">
                <b.icon className="h-4 w-4 text-dz-yellow" aria-hidden /> {b.label}
              </li>
            ))}
          </ul>
        </div>
        <StreetScene />
      </div>
    </section>
  );
}

const SHOPS: [Kind, string][] = [
  ['EAT', 'FOOD'],
  ['GROCERY', 'GROCERY'],
  ['PHARMACY', 'PHARMACY'],
  ['DIAGNOSTICS', 'LAB TESTS'],
  ['LOCAL_STORES', 'LOCAL SHOPS'],
];
const APP_TILES: Kind[] = ['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES', 'RUSH'];

/** The neighbourhood: a row of shops (one per kind), the app, a live-order card and a rider on the road. Illustration only. */
function StreetScene() {
  return (
    <figure className="m-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0E14] p-3 shadow-[0_40px_80px_-40px_rgba(0,0,0,.8)]" aria-label="Shops in your neighbourhood and a live order on its way">
      <svg viewBox="0 0 560 420" className="block h-auto w-full" aria-hidden data-street-scene>
        <rect width="560" height="420" rx="16" fill="#0A0E14" />
        <rect y="305" width="560" height="115" fill="#11151D" />
        <line x1="0" y1="360" x2="560" y2="360" stroke="#FFD400" strokeWidth="3" strokeDasharray="16 12" />

        {/* The app */}
        <g transform="translate(22 22)">
          <rect width="150" height="122" rx="16" fill="#fff" stroke="#111" strokeWidth="3" />
          <rect x="6" y="6" width="138" height="26" rx="9" fill="#E8130F" />
          <text x="16" y="24" fontSize="12" fontWeight="900" fontStyle="italic" fill="#fff">
            DELIVEZ NOW
          </text>
          {APP_TILES.map((k, i) => {
            const L = KIND_LOOK[k];
            const x = 10 + (i % 3) * 46;
            const y = 40 + Math.floor(i / 3) * 40;
            return (
              <g key={k}>
                <rect x={x} y={y} width="38" height="34" rx="9" fill={L.tint} />
                <L.icon x={x + 9} y={y + 7} width={20} height={20} color={L.accent} strokeWidth={2.4} />
              </g>
            );
          })}
        </g>
        <g transform="translate(196 62)">
          <rect width="46" height="46" rx="14" fill="#FFD400" />
          <ShoppingBag x={11} y={11} width={24} height={24} color="#111" strokeWidth={2.4} />
        </g>

        {/* A live order, shop to door */}
        <g transform="translate(300 22)">
          <rect width="238" height="128" rx="16" fill="#0B1220" stroke="#2A3140" strokeWidth="1.5" />
          <circle cx="18" cy="20" r="4" fill="#2BD463" />
          <text x="28" y="24" fontSize="11" fontWeight="900" letterSpacing="1" fill="#FFD400">
            LIVE · YOUR ORDER
          </text>
          <path id="now-route" d="M26 104 C 80 104, 90 62, 136 70 S 196 44, 214 38" fill="none" stroke="#2A3140" strokeWidth="8" strokeLinecap="round" />
          <path className="now-dash" d="M26 104 C 80 104, 90 62, 136 70 S 196 44, 214 38" fill="none" stroke="#FFD400" strokeWidth="3" strokeDasharray="8 12" strokeLinecap="round" />
          <circle cx="26" cy="104" r="7" fill="#17803A" />
          <circle cx="214" cy="38" r="7" fill="#E8130F" />
          <g transform="translate(122 56)">
            <circle cx="14" cy="14" r="14" fill="#FFD400" />
            <Bike x={4} y={4} width={20} height={20} color="#111" strokeWidth={2.4} />
          </g>
          <text x="18" y="122" fontSize="10.5" fill="#A5A5A0">
            Shop to your door, tracked on the order page
          </text>
        </g>

        {/* The street */}
        {SHOPS.map(([k, label], i) => {
          const L = KIND_LOOK[k];
          const x = 12 + i * 108;
          return (
            <g key={k}>
              <rect x={x} y="190" width="100" height="115" fill="#1B2340" stroke="#0A0E14" strokeWidth="2" />
              <rect x={x - 3} y="168" width="106" height="24" rx="4" fill={L.accent} />
              {[0, 1, 2, 3, 4].map((n) => (
                <circle key={n} cx={x + 8 + n * 21} cy="192" r="10.5" fill={L.accent} />
              ))}
              <rect x={x + 30} y="208" width="40" height="40" rx="12" fill="#fff" />
              <L.icon x={x + 38} y={216} width={24} height={24} color={L.accent} strokeWidth={2.4} />
              <text x={x + 50} y="266" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">
                {label}
              </text>
              <rect x={x + 36} y="276" width="28" height="29" rx="2" fill="#0A0E14" />
            </g>
          );
        })}
        <g className="now-ride">
          <g transform="translate(0 330)">
            <rect x="-30" y="-12" width="30" height="22" rx="5" fill="#FFD400" stroke="#111" strokeWidth="2" />
            <circle cx="16" cy="0" r="15" fill="#E8130F" />
            <Bike x={5} y={-11} width={22} height={22} color="#fff" strokeWidth={2.4} />
          </g>
        </g>
      </svg>
    </figure>
  );
}

const BAR: [string, string][] = [
  ['food', 'Food & Restaurants'],
  ['shop', 'Grocery'],
  ['pharmacy', 'Pharmacy & Wellness'],
  ['localstores', 'Local Stores'],
  ['quick', 'Quick Commerce'],
  ['gifts', 'Gifts & Flowers'],
  ['specialty', 'Specialty Stores'],
  ['offers', 'Offers'],
  ['merchants', 'For Merchants'],
  ['how', 'How It Works'],
  ['track', 'Track Order'],
];

/** Red bar under the hero: jump to a section (the one on screen is marked), and the cart. */
export function NowBar() {
  const [on, setOn] = useState<string | null>(null);
  useEffect(() => {
    const els = BAR.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setOn(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <nav className="sticky top-16 z-40 border-b border-[#8A030B] bg-[#E8130F] px-4 sm:px-6" aria-label="On this page" data-now-bar>
      <div className="dz-scroll-x mx-auto flex max-w-[1280px] items-center gap-1 overflow-x-auto py-[7px]">
        <b className="mr-2 shrink-0 whitespace-nowrap text-[15px] font-black italic text-white" style={{ fontStretch: '74%' }}>
          DELIVEZ <span className="text-dz-yellow">NOW</span>
        </b>
        {BAR.map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-current={on === id ? 'location' : undefined} className={`shrink-0 whitespace-nowrap rounded-full px-[11px] py-[7px] text-[12.5px] font-extrabold text-white transition hover:bg-black/25 ${on === id ? 'bg-black/25' : ''}`}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** The design's floating cart: what is in the cart right now. */
export function CartButton() {
  const lines = useCart((s) => s.lines);
  return (
    <Link to="/cart" className="fixed bottom-[18px] right-[18px] z-40 inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-black bg-dz-yellow px-5 py-[13px] text-[15px] font-black text-black shadow-[0_12px_30px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5" aria-label={`Cart: ${cartCount(lines)} items`} data-cart-button>
      <ShoppingCart className="h-5 w-5" aria-hidden /> {cartCount(lines)} · {rupees(cartTotal(lines))}
    </Link>
  );
}
