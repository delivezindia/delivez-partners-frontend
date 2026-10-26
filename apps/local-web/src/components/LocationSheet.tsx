import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Home, LocateFixed, MapPin, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { useI18n } from '../lib/i18n';
import { ADDRESS_LABEL } from '../lib/labels';
import { fromAddress, useDeliverTo } from '../lib/location';
import { useAddresses } from '../lib/queries';
import type { GeocodeResult } from './MapPicker';

const ICON = { HOME: Home, WORK: Briefcase, OTHER: MapPin };

/** "Deliver to…" chooser: saved addresses, the phone's location, or a new pin on the map. */
export function LocationSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const token = useAuth((s) => s.accessToken);
  const { at, set } = useDeliverTo();
  const addresses = useAddresses();
  const [message, setMessage] = useState('');

  function useGps() {
    if (!navigator.geolocation) return setMessage(t('lc.loc.noGps'));
    setMessage(t('lc.loc.finding'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        // The area name is a nicety; signed-out customers just see "Current location".
        const r = token ? await api<GeocodeResult | null>(`/geo/reverse?lat=${lat}&lng=${lng}`).catch(() => null) : null;
        set({ lat, lng, title: r?.area?.split(',').pop()?.trim() || t('lc.loc.current'), line: r?.line1 ?? '' });
        onClose();
      },
      () => setMessage(t('lc.loc.gpsFailed')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <Modal title={t('lc.loc.title')} onClose={onClose}>
      <div className="space-y-3">
        <button type="button" onClick={useGps} className="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-line px-4 py-3 text-left font-bold text-dz-red hover:border-dz-red">
          <LocateFixed className="h-5 w-5" aria-hidden /> {t('lc.loc.useGps')}
        </button>
        <button
          type="button"
          onClick={() => (onClose(), navigate('/addresses/new'))}
          className="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-line px-4 py-3 text-left font-bold hover:border-black"
        >
          <Plus className="h-5 w-5" aria-hidden /> {t('lc.loc.addNew')}
        </button>
        {message && <p className="text-sm text-ink-2">{message}</p>}

        {token && (addresses.data?.length ?? 0) > 0 && (
          <div>
            <h3 className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.loc.saved')}</h3>
            <ul className="divide-y divide-line">
              {addresses.data!.map((a) => {
                const Icon = ICON[a.label];
                const on = at?.addressId === a.id;
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => (set(fromAddress(a, t(ADDRESS_LABEL[a.label]))), onClose())} className={`flex w-full items-start gap-3 py-3 text-left ${on ? 'text-dz-red' : ''}`} aria-current={on}>
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <b className="block">{t(ADDRESS_LABEL[a.label])}</b>
                        <span className="block truncate text-sm text-ink-2">{[a.line1, a.landmark, a.cityName].filter(Boolean).join(', ')}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!token && <p className="pt-2 text-sm text-ink-3">{t('lc.loc.loginToSee')}</p>}
      </div>
    </Modal>
  );
}
