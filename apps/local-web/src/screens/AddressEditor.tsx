import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MapPicker, type GeocodeResult } from '../components/MapPicker';
import { Field, TextInput, Toggle } from '../components/form';
import { Button, ErrorText } from '../components/ui';
import { useAddressAutofill } from '../lib/addressAutofill';
import { useAuth } from '../lib/auth-store';
import { useI18n } from '../lib/i18n';
import { ADDRESS_LABEL } from '../lib/labels';
import { DEFAULT_CENTER, fromAddress, useDeliverTo } from '../lib/location';
import { useAddresses, useSaveAddress } from '../lib/queries';
import type { AddressLabel } from '../lib/types';
import { messageOf, safeNext } from './Login';

type Text = { line1: string; line2: string; landmark: string; pincode: string; cityName: string; state: string; contactName: string; contactPhone: string };
const EMPTY: Text = { line1: '', line2: '', landmark: '', pincode: '', cityName: '', state: '', contactName: '', contactPhone: '' };

// Pick the pin, then the flat / house number. Signed out: just "deliver here" for browsing.
export default function AddressEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const deliverTo = useDeliverTo();
  const addresses = useAddresses();
  const editing = id ? addresses.data?.find((a) => a.id === id) : undefined;
  const save = useSaveAddress();

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(editing ? { lat: editing.lat, lng: editing.lng } : deliverTo.at ? { lat: deliverTo.at.lat, lng: deliverTo.at.lng } : null);
  const [placeId, setPlaceId] = useState<string | undefined>(editing?.placeId ?? undefined);
  const [area, setArea] = useState('');
  const [text, setText] = useState<Text>(() => (editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(editing).filter(([k, v]) => k in EMPTY && v != null)) } : EMPTY) as Text);
  const [label, setLabel] = useState<AddressLabel>(editing?.label ?? 'HOME');
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [someoneElse, setSomeoneElse] = useState(!!editing?.contactPhone);
  const [error, setError] = useState('');
  const merge = useAddressAutofill<'line2' | 'landmark' | 'pincode' | 'cityName' | 'state'>(editing ? { line2: editing.line2 ?? '', landmark: editing.landmark ?? '', pincode: editing.pincode, cityName: editing.cityName, state: editing.state } : {});

  if (id && addresses.isLoading) return null;
  if (id && !editing) return <p className="p-10 text-center">{t('lc.addr.notFound')}</p>;

  function onAddress(r: GeocodeResult) {
    setPlaceId(r.placeId);
    setArea(r.area?.split(',').pop()?.trim() || r.city || '');
    setText((cur) => merge(cur, { line2: r.line1, landmark: r.landmark, pincode: r.pincode, cityName: r.city, state: r.state }));
  }
  const set = (k: keyof Text) => (e: React.ChangeEvent<HTMLInputElement>) => setText((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pin) return setError(t('lc.addr.pinFirst'));
    setError('');
    const trim = (s: string) => s.trim() || undefined;
    try {
      const a = await save.mutateAsync({
        id: editing?.id,
        body: {
          label,
          line1: text.line1.trim(),
          line2: trim(text.line2),
          landmark: trim(text.landmark),
          pincode: text.pincode.trim(),
          cityName: text.cityName.trim(),
          state: text.state.trim(),
          contactName: someoneElse ? trim(text.contactName) : undefined,
          contactPhone: someoneElse ? trim(text.contactPhone.replace(/\s/g, '')) : undefined,
          lat: pin.lat,
          lng: pin.lng,
          placeId,
          isDefault: isDefault || undefined,
        },
      });
      // A newly added address is where the customer wants things now.
      if (!editing || deliverTo.at?.addressId === a.id) deliverTo.set(fromAddress(a, t(ADDRESS_LABEL[a.label])));
      navigate(next, { replace: true });
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    }
  }

  return (
    <div className="min-h-screen bg-soft pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to={next} className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl">{editing ? t('lc.addr.editTitle') : t('lc.addr.newTitle')}</h1>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <MapPicker
          lat={pin?.lat ?? null}
          lng={pin?.lng ?? null}
          fallbackCenter={DEFAULT_CENTER}
          onChange={(lat, lng) => setPin({ lat, lng })}
          onAddress={onAddress}
          height="h-64"
          hint={t('lc.addr.pinHint')}
          placeholder={t('lc.addr.searchPlaceholder')}
        />

        {!token ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
            {text.line2 && <p className="font-semibold">{text.line2}</p>}
            <Button
              className="w-full"
              disabled={!pin}
              onClick={() => {
                deliverTo.set({ lat: pin!.lat, lng: pin!.lng, title: area || text.cityName || t('lc.loc.pinned'), line: text.line2 });
                navigate(next, { replace: true });
              }}
            >
              {t('lc.addr.deliverHere')}
            </Button>
            <p className="text-center text-sm text-ink-2">
              <Link to={`/login?next=${encodeURIComponent('/addresses/new')}`} className="font-bold text-dz-red underline">
                {t('lc.login')}
              </Link>{' '}
              {t('lc.addr.loginToSave')}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line">
            <Field label={t('lc.addr.house')}>
              <TextInput value={text.line1} onChange={set('line1')} placeholder={t('lc.addr.housePh')} required minLength={3} autoComplete="address-line1" />
            </Field>
            <Field label={t('lc.addr.street')}>
              <TextInput value={text.line2} onChange={set('line2')} autoComplete="address-line2" />
            </Field>
            <Field label={t('lc.addr.landmark')}>
              <TextInput value={text.landmark} onChange={set('landmark')} placeholder={t('lc.addr.landmarkPh')} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label={t('lc.addr.pin')}>
                <TextInput value={text.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} pattern="\d{6}" required autoComplete="postal-code" />
              </Field>
              <Field label={t('lc.addr.city')}>
                <TextInput value={text.cityName} onChange={set('cityName')} required autoComplete="address-level2" />
              </Field>
              <Field label={t('lc.addr.state')}>
                <TextInput value={text.state} onChange={set('state')} required autoComplete="address-level1" />
              </Field>
            </div>
            <div>
              <span className="text-sm font-medium text-neutral-700">{t('lc.addr.saveAs')}</span>
              <div className="mt-1 flex gap-2">
                {(['HOME', 'WORK', 'OTHER'] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={label === l} onClick={() => setLabel(l)} className={`min-h-10 rounded-full border-[1.5px] px-4 text-sm font-bold ${label === l ? 'border-black bg-black text-dz-yellow' : 'border-line'}`}>
                    {t(ADDRESS_LABEL[l])}
                  </button>
                ))}
              </div>
            </div>
            <Toggle checked={someoneElse} onChange={setSomeoneElse} label={t('lc.addr.someoneElse')} hint={t('lc.addr.someoneElseHint')} />
            {someoneElse && (
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('lc.addr.contactName')}>
                  <TextInput value={text.contactName} onChange={set('contactName')} />
                </Field>
                <Field label={t('lc.addr.contactPhone')}>
                  <TextInput value={text.contactPhone} onChange={set('contactPhone')} inputMode="tel" placeholder="98450 12345" />
                </Field>
              </div>
            )}
            {!editing?.isDefault && <Toggle checked={isDefault} onChange={setIsDefault} label={t('lc.addr.makeDefault')} />}
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={save.isPending || !pin}>
              {save.isPending ? t('lc.saving') : t('lc.addr.save')}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
