import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, FlaskConical, Home, LifeBuoy, LogOut, MapPin, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Field, Select, TextInput, Toggle } from '../components/form';
import { Button, ErrorText } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { useI18n, type LanguageCode } from '../lib/i18n';
import { ADDRESS_LABEL } from '../lib/labels';
import { useDeliverTo } from '../lib/location';
import { useAddresses, useDeleteAddress, useMe } from '../lib/queries';
import type { Me } from '../lib/types';
import { messageOf, safeNext } from './Login';
import { PushCard } from '../components/PushCard';
import { disablePush } from '../lib/push';

const ICON = { HOME: Home, WORK: Briefcase, OTHER: MapPin };

// Profile, language and saved addresses.
export default function Account() {
  const { t, lang, languages, setLanguage } = useI18n();
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const deliverTo = useDeliverTo();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fill the form once when the profile arrives — never over what the customer has started typing.
  const filled = useRef(false);
  useEffect(() => {
    if (!me.data || filled.current) return;
    filled.current = true;
    setName((typed) => typed || me.data.fullName || '');
    setEmail((typed) => typed || me.data.email || '');
    // New customers start with WhatsApp order updates on; they can switch it off here.
    setWhatsapp(welcome ? true : me.data.whatsappOptIn);
  }, [me.data, welcome]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const updated = await api<Me>('/local/me', { method: 'PATCH', body: { fullName: name.trim(), email: email.trim() || null, whatsappOptIn: whatsapp } });
      qc.setQueryData(['me'], updated);
      const s = useAuth.getState();
      if (s.user) s.setSession({ accessToken: s.accessToken!, refreshToken: s.refreshToken!, user: { ...s.user, fullName: updated.fullName } });
      if (welcome) return navigate(next, { replace: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const { refreshToken, clear } = useAuth.getState();
    // Leave this signed-in page first, or it would bounce to the login page once the session is gone.
    navigate('/', { replace: true });
    await disablePush();
    await api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    clear();
    qc.clear();
    // A saved address belongs to the account; keep only a plain pin for browsing.
    if (deliverTo.at?.addressId) deliverTo.set({ ...deliverTo.at, addressId: undefined });
  }

  return (
    <div className="min-h-screen bg-soft pb-16">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        {!welcome && (
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="text-2xl">{welcome ? t('lc.acc.welcome') : t('lc.acc.title')}</h1>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line">
          {welcome && <p className="text-ink-2">{t('lc.acc.welcomeBody')}</p>}
          <p className="text-sm text-ink-2">
            {t('lc.acc.phone')} <b className="text-ink">{me.data?.phone}</b>
          </p>
          <Field label={t('lc.acc.name')}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" autoFocus={welcome} />
          </Field>
          <Field label={t('lc.acc.email')} hint={t('lc.acc.emailHint')}>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Toggle checked={whatsapp} onChange={setWhatsapp} label={t('lc.acc.whatsapp')} hint={t('lc.acc.whatsappHint')} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>
            {welcome ? t('lc.acc.continue') : saved ? t('lc.saved') : t('lc.save')}
          </Button>
        </form>

        {!welcome && <PushCard />}

        {!welcome && (
          <>
            <nav className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {(
                [
                  ['/orders', Receipt, t('lc.ord.all')],
                  ['/orders?tab=labs', FlaskConical, t('lc.lb.mine')],
                  ['/help', LifeBuoy, t('lc.help.title')],
                ] as const
              ).map(([to, Icon, label]) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-4 font-bold hover:bg-soft">
                  <Icon className="h-5 w-5 text-ink-2" aria-hidden />
                  <span className="flex-1">{label}</span>
                  <span aria-hidden>→</span>
                </Link>
              ))}
            </nav>
            <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl">{t('lc.acc.addresses')}</h2>
                <Link to="/addresses/new?next=/account" className="inline-flex items-center gap-1 text-sm font-bold text-dz-red">
                  <Plus className="h-4 w-4" aria-hidden /> {t('lc.acc.add')}
                </Link>
              </div>
              {addresses.data?.length === 0 && <p className="py-3 text-sm text-ink-2">{t('lc.acc.noAddresses')}</p>}
              <ul className="divide-y divide-line">
                {addresses.data?.map((a) => {
                  const Icon = ICON[a.label];
                  return (
                    <li key={a.id} className="flex items-start gap-3 py-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <b>{t(ADDRESS_LABEL[a.label])}</b>
                        {a.isDefault && <span className="ml-2 rounded bg-dz-yellow-soft px-1.5 text-xs font-bold">{t('lc.acc.default')}</span>}
                        <p className="text-sm text-ink-2">{[a.line1, a.line2, a.landmark, `${a.cityName} ${a.pincode}`].filter(Boolean).join(', ')}</p>
                      </div>
                      <Link to={`/addresses/${a.id}/edit?next=/account`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full text-dz-red hover:bg-dz-red-soft"
                        aria-label={t('lc.delete')}
                        onClick={() => {
                          if (!confirm(t('lc.acc.deleteConfirm'))) return;
                          remove.mutate(a.id);
                          if (deliverTo.at?.addressId === a.id) deliverTo.set({ ...deliverTo.at, addressId: undefined });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <Field label={t('lc.acc.language')}>
                <Select value={lang} onChange={(e) => void setLanguage(e.target.value as LanguageCode)}>
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} · {l.english}
                    </option>
                  ))}
                </Select>
              </Field>
            </section>

            <Button variant="ghost" className="w-full" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" aria-hidden /> {t('lc.acc.logout')}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
