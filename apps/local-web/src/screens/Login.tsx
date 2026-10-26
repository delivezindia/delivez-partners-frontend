import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Banknote, Check, ShieldCheck, Smartphone, Store as StoreIcon, Truck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, newIdempotencyKey } from '../lib/api';
import { useAuth, type SessionUser } from '../lib/auth-store';
import { Brand, Button, ErrorText } from '../components/ui';
import { syncLanguageAfterLogin, useI18n, type MsgKey } from '../lib/i18n';
import type { Me } from '../lib/types';

/** Only same-app paths are allowed as a post-login destination. */
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

interface OtpRequestResponse {
  requestId: string;
  expiresIn: number;
  retryAfter: number;
  devCode?: string;
}

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
};

const PERKS: { icon: typeof Truck; text: MsgKey }[] = [
  { icon: StoreIcon, text: 'lc.auth.perk1' },
  { icon: Truck, text: 'lc.auth.perk2' },
  { icon: Banknote, text: 'lc.auth.perk3' },
];

// Customer log in (/login) and sign up (/signup): phone + OTP. Sign up also takes the name first.
export default function Login() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const qs = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';
  const signup = pathname === '/signup';
  const setSession = useAuth((s) => s.setSession);
  const qc = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<OtpRequestResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  const digits = phone.replace(/\D/g, '');
  const ready = digits.length === 10 && (!signup || (name.trim().length >= 2 && agree));

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Switching between the two tabs starts over.
  useEffect(() => {
    setOtp(null);
    setError('');
  }, [signup]);

  async function requestOtp(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    if (signup && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('lc.auth.badEmail'));
    setBusy(true);
    try {
      const res = await api<OtpRequestResponse>('/auth/otp/request', { method: 'POST', body: { phone } });
      setOtp(res);
      setCode('');
      setResendIn(res.retryAfter);
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
      const retry = err instanceof ApiError ? (err.details as { retryAfter?: number } | undefined)?.retryAfter : undefined;
      if (typeof retry === 'number') setResendIn(retry);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!otp) return;
    setError('');
    setBusy(true);
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: SessionUser }>('/auth/otp/verify', {
        method: 'POST',
        body: { requestId: otp.requestId, code, app: 'LOCAL', device: { platform: 'WEB', userAgent: navigator.userAgent } },
      });
      setSession(res);
      await syncLanguageAfterLogin(res.user.language);
      let fullName = res.user.fullName;
      if (signup) {
        // An existing account keeps its name; a new one gets what was typed here.
        const save = (withEmail: boolean) =>
          api<Me>('/local/me', {
            method: 'PATCH',
            body: { fullName: fullName || name.trim(), ...(withEmail && email.trim() ? { email: email.trim() } : {}), whatsappOptIn: true },
            idempotencyKey: newIdempotencyKey(),
          });
        // The account exists now either way; an email used elsewhere can be fixed later in the account page.
        const me = await save(true).catch((err) => (err instanceof ApiError && err.code === 'EMAIL_TAKEN' ? save(false) : Promise.reject(err)));
        qc.setQueryData(['me'], me);
        fullName = me.fullName;
        setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: { ...res.user, fullName } });
      }
      navigate(fullName ? next : `/account?welcome=1&next=${encodeURIComponent(next)}`, { replace: true });
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  const input = 'h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 outline-none focus:border-black';

  return (
    <div className="min-h-screen bg-gradient-to-b from-dz-yellow to-dz-yellow-soft md:bg-soft md:from-soft md:to-soft">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 pb-10 pt-5 md:grid-cols-[1fr_440px] md:items-center md:py-12">
        {/* Brand panel (wide screens) */}
        <aside className="relative hidden h-full min-h-[520px] overflow-hidden rounded-[20px] bg-dz-yellow p-10 md:flex md:flex-col">
          <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[16px] border-dz-red" aria-hidden />
          <Brand size="lg" />
          <h2 className="relative mt-auto max-w-sm text-5xl leading-[0.98]">{signup ? t('lc.auth.signupPitch') : t('lc.auth.loginPitch')}</h2>
          <ul className="relative mt-6 space-y-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-black text-dz-yellow">
                  <p.icon className="h-4 w-4" aria-hidden />
                </span>
                {t(p.text)}
              </li>
            ))}
          </ul>
          <p className="relative mt-8 text-4xl" aria-hidden>
            🍛 🛒 💊 🧪 🏪
          </p>
        </aside>

        <section>
          <div className="flex items-center justify-between md:hidden">
            <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/70" aria-label={t('lc.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Brand />
            <span className="w-10" />
          </div>
          <Link to="/" className="mb-4 hidden items-center gap-1 text-sm font-bold text-ink-2 hover:text-black md:inline-flex">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t('lc.backHome')}
          </Link>

          <div className="mt-6 rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] md:mt-0 sm:p-8">
            {!otp ? (
              <>
                <div className="grid grid-cols-2 rounded-xl bg-soft p-1" role="tablist">
                  {(
                    [
                      ['/login', 'lc.login', !signup],
                      ['/signup', 'lc.auth.signup', signup],
                    ] as const
                  ).map(([to, label, on]) => (
                    <Link key={to} to={to + qs} replace role="tab" aria-selected={on} className={`rounded-lg py-2.5 text-center font-extrabold transition ${on ? 'bg-white shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
                      {t(label)}
                    </Link>
                  ))}
                </div>
                <form onSubmit={requestOtp} noValidate className="mt-6 space-y-4">
                  <div>
                    <h1 className="text-[32px]">{signup ? t('lc.auth.signupTitle') : t('lc.auth.loginTitle')}</h1>
                    <p className="mt-1 text-sm text-ink-2">{signup ? t('lc.auth.signupSub') : t('lc.auth.loginSub')}</p>
                  </div>
                  {signup && (
                    <label className="block">
                      <span className="text-sm font-bold">{t('lc.acc.name')}</span>
                      <input value={name} onChange={(e) => (setName(e.target.value), setError(""))} autoComplete="name" maxLength={80} placeholder={t('lc.auth.namePh')} className={`mt-1.5 ${input}`} autoFocus />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-sm font-bold">{t('login.mobileLabel')}</span>
                    <div className={`mt-1.5 flex h-12 items-center overflow-hidden rounded-xl border-[1.5px] bg-white focus-within:border-black ${error ? 'border-dz-red' : 'border-line'}`}>
                      <span className="flex h-full items-center border-r border-line bg-soft px-3.5 font-bold text-ink-2">+91</span>
                      <input
                        autoFocus={!signup}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={14}
                        value={phone}
                        onChange={(e) => (setPhone(formatPhone(e.target.value)), setError(""))}
                        placeholder="98450 12345"
                        aria-label={t('login.mobileLabel')}
                        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-lg font-semibold tracking-wide outline-none placeholder:font-normal placeholder:text-neutral-400"
                      />
                      {digits.length === 10 && <Check className="mr-3 h-5 w-5 text-dz-green" aria-hidden />}
                    </div>
                  </label>
                  {signup && (
                    <>
                      <label className="block">
                        <span className="text-sm font-bold">{t('lc.acc.email')}</span>
                        <input type="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(""))} autoComplete="email" maxLength={120} className={`mt-1.5 ${input}`} />
                      </label>
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-dz-red" />
                        <span>{t('lc.auth.agree')}</span>
                      </label>
                    </>
                  )}
                  <ErrorText>{error}</ErrorText>
                  <Button type="submit" className="w-full min-h-14 text-base" disabled={busy || !ready}>
                    {busy ? t('login.sending') : t('login.getOtp')}
                    {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </Button>
                  {!signup && <p className="text-xs leading-relaxed text-ink-3">{t('lc.login.terms')}</p>}
                  <p className="text-center text-sm text-ink-2">
                    {signup ? t('lc.land.haveAccount') : t('lc.auth.newHere')}{' '}
                    <Link to={(signup ? '/login' : '/signup') + qs} replace className="font-extrabold text-dz-red underline-offset-2 hover:underline">
                      {signup ? t('lc.login') : t('lc.auth.signup')}
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <form onSubmit={verify} className="space-y-5">
                <div>
                  <h1 className="text-[32px]">{t('login.codeTitle')}</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
                    <Smartphone className="h-4 w-4" aria-hidden /> {t('login.sentTo')} <b className="text-ink">+91 {formatPhone(phone)}</b>
                    <button type="button" className="inline-flex items-center gap-1 font-bold text-dz-red" onClick={() => (setOtp(null), setError(''))}>
                      {t('login.change')}
                    </button>
                  </p>
                </div>
                <input
                  ref={codeInput}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  aria-label="6-digit code"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="h-16 w-full rounded-xl border-[1.5px] border-line text-center text-3xl font-black tracking-[0.5em] outline-none focus:border-black"
                />
                {otp.devCode && (
                  <p className="flex items-center gap-2 rounded-lg bg-ai-bg px-3 py-2 text-xs text-ai-accent">
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {t(import.meta.env.DEV ? 'login.devCode' : 'login.testCode')} <b data-dev-code>{otp.devCode}</b>
                    </span>
                  </p>
                )}
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="w-full min-h-14 text-base" disabled={busy || code.length !== 6}>
                  {busy ? t('login.verifying') : signup ? t('lc.auth.create') : t('login.verify')}
                </Button>
                <button type="button" disabled={resendIn > 0 || busy} onClick={() => requestOtp()} className="w-full text-sm font-bold text-ink-2 hover:text-dz-red disabled:font-semibold disabled:text-ink-3">
                  {resendIn > 0 ? t('login.resendIn', { time: `0:${String(resendIn).padStart(2, '0')}` }) : t('login.resend')}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function messageOf(err: unknown, network: string) {
  if (err instanceof ApiError) {
    const fieldErrors = (err.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
    return (fieldErrors && Object.values(fieldErrors).flat()[0]) ?? err.message;
  }
  return network;
}
