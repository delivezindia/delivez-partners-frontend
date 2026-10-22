import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgePercent, Check, FileClock, LifeBuoy, ShieldCheck, Smartphone, Store, Wallet, type LucideIcon } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth, type SessionUser } from '../lib/auth-store';
import { Button, ErrorText } from '../components/ui';
import { syncLanguageAfterLogin, useI18n, type MsgKey } from '../lib/i18n';

/** Only same-app paths are allowed as a post-login destination. */
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/accounts';
}

interface OtpRequestResponse {
  requestId: string;
  expiresIn: number;
  retryAfter: number;
  devCode?: string;
}

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const PERKS: { icon: LucideIcon; title: MsgKey; body: MsgKey }[] = [
  { icon: Store, title: 'login.perk1Title', body: 'login.perk1Body' },
  { icon: BadgePercent, title: 'login.perk2Title', body: 'login.perk2Body' },
  { icon: Wallet, title: 'login.perk3Title', body: 'login.perk3Body' },
  { icon: FileClock, title: 'login.perk4Title', body: 'login.perk4Body' },
];

/** "98450 12345" style grouping while typing. */
const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
};

// P02 Login (OTP)
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const registering = next.startsWith('/onboarding');
  const setSession = useAuth((s) => s.setSession);
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<OtpRequestResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [codeFocused, setCodeFocused] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const digits = phone.replace(/\D/g, '');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function requestOtp(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<OtpRequestResponse>('/auth/otp/request', { method: 'POST', body: { phone } });
      setOtp(res);
      setCode('');
      setResendIn(res.retryAfter);
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError(messageOf(err));
      if (err instanceof ApiError && typeof (err.details as { retryAfter?: number })?.retryAfter === 'number') {
        setResendIn((err.details as { retryAfter: number }).retryAfter);
      }
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
      const res = await api<VerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: { requestId: otp.requestId, code, app: 'PARTNERS', device: { platform: 'WEB', userAgent: navigator.userAgent } },
      });
      setSession(res);
      await syncLanguageAfterLogin(res.user.language);
      navigate(next, { replace: true });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-dz-yellow-soft via-soft to-soft">
      <div className="mx-auto grid max-w-6xl items-stretch gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10 lg:py-16">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden rounded-[20px] bg-black p-10 text-white lg:flex lg:flex-col">
          <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-dz-yellow/90" aria-hidden />
          <span className="pointer-events-none absolute -right-10 top-28 h-24 w-24 rounded-full border-[10px] border-dz-red" aria-hidden />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.16em] text-dz-yellow">{t('login.eyebrow')}</p>
          <h2 className="relative mt-3 max-w-md text-[clamp(40px,4.4vw,56px)] leading-tight [html:lang(en)_&]:leading-[0.95]">{registering ? t('login.registerTitle') : t('login.welcomeTitle')}</h2>
          <p className="relative mt-3 max-w-sm text-white/70">{registering ? t('login.registerSub') : t('login.welcomeSub')}</p>
          <ul className="relative mt-8 grid gap-4 sm:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-dz-yellow text-black">
                  <p.icon className="h-5 w-5" aria-hidden />
                </span>
                <b className="mt-3 block">{t(p.title)}</b>
                <span className="text-sm text-white/65">{t(p.body)}</span>
              </li>
            ))}
          </ul>
          <Link to="/how-it-works" className="relative mt-auto inline-flex items-center gap-2 pt-8 font-bold text-dz-yellow underline-offset-4 hover:underline">
            {t('login.seeHow')} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </aside>

        {/* Form card */}
        <section className="flex flex-col justify-center">
          <div className="rounded-[20px] border border-line bg-white p-6 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] sm:p-8">
            <Steps step={otp ? 2 : 1} labels={[t('login.stepMobile'), t('login.stepVerify')]} />

            {!otp ? (
              <form onSubmit={requestOtp} className="mt-6 space-y-5">
                <div>
                  <h1 className="text-[34px]">{registering ? t('login.registerHeading') : t('login.title')}</h1>
                  <p className="mt-1 text-sm text-ink-2">{t('login.smsHint')}</p>
                </div>
                <label className="block">
                  <span className="text-sm font-bold">{t('login.mobileLabel')}</span>
                  <div className={`mt-1.5 flex h-14 items-center overflow-hidden rounded-xl border-[1.5px] bg-white transition focus-within:border-black focus-within:shadow-[0_0_0_4px_var(--color-dz-yellow-soft)] ${error ? 'border-dz-red' : 'border-line'}`}>
                    <span className="flex h-full items-center border-r border-line bg-soft px-4 font-bold text-ink-2">+91</span>
                    <input
                      autoFocus
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={14}
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="98450 12345"
                      aria-invalid={!!error}
                      className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-lg font-semibold tracking-wide outline-none placeholder:font-normal placeholder:text-neutral-400"
                    />
                    {digits.length === 10 && <Check className="mr-3.5 h-5 w-5 text-dz-green" aria-label="Looks good" />}
                  </div>
                </label>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="w-full min-h-14 text-base" disabled={busy || digits.length < 10}>
                  {busy ? t('login.sending') : t('login.getOtp')}
                  {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
                </Button>
                <p className="text-xs leading-relaxed text-ink-3">
                  {t('login.terms')}
                </p>
              </form>
            ) : (
              <form onSubmit={verify} className="mt-6 space-y-5">
                <div>
                  <h1 className="text-[34px]">{t('login.codeTitle')}</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
                    <Smartphone className="h-4 w-4" aria-hidden /> {t('login.sentTo')} <b className="text-ink">+91 {formatPhone(phone)}</b>
                    <button type="button" className="inline-flex items-center gap-1 font-bold text-dz-red underline-offset-2 hover:underline" onClick={() => (setOtp(null), setError(''))}>
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t('login.change')}
                    </button>
                  </p>
                </div>

                {/* Six boxes drawn over one real input, so paste, autofill and screen readers just work. */}
                <div className="relative" onClick={() => codeInput.current?.focus()}>
                  <input
                    ref={codeInput}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    aria-label="6-digit code"
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                  />
                  <div className="grid grid-cols-6 gap-2" aria-hidden>
                    {Array.from({ length: 6 }, (_, i) => {
                      const active = codeFocused && i === Math.min(code.length, 5);
                      return (
                        <span
                          key={i}
                          className={`grid h-16 place-items-center rounded-xl border-[1.5px] text-3xl font-black tabular-nums transition ${error ? 'border-dz-red' : active ? 'border-black shadow-[0_0_0_4px_var(--color-dz-yellow-soft)]' : code[i] ? 'border-neutral-400' : 'border-line'} bg-white`}
                        >
                          {code[i] ?? (active ? <span className="h-7 w-0.5 animate-pulse bg-black" /> : '')}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {otp.devCode && (
                  <p className="flex items-center gap-2 rounded-lg bg-ai-bg px-3 py-2 text-xs text-ai-accent">
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {t('login.devCode')} <b data-dev-code>{otp.devCode}</b> (also printed in the API log)
                    </span>
                  </p>
                )}
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="w-full min-h-14 text-base" disabled={busy || code.length !== 6}>
                  {busy ? t('login.verifying') : t('login.verify')}
                </Button>
                <button
                  type="button"
                  disabled={resendIn > 0 || busy}
                  onClick={() => requestOtp()}
                  className="w-full text-sm font-bold text-ink-2 hover:text-dz-red disabled:font-semibold disabled:text-ink-3"
                >
                  {resendIn > 0 ? t('login.resendIn', { time: `0:${String(resendIn).padStart(2, '0')}` }) : t('login.resend')}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-2">
            <LifeBuoy className="h-4 w-4" aria-hidden /> {t('login.trouble')}{' '}
            <Link to="/contact" className="font-bold underline underline-offset-2">
              {t('login.support')}
            </Link>
          </p>

          {/* Phone: the perks as a compact strip under the form */}
          <ul className="mt-6 grid grid-cols-2 gap-2 lg:hidden">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs">
                <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-dz-red" aria-hidden />
                <b className="font-bold">{t(p.title)}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Steps({ step, labels }: { step: 1 | 2; labels: [string, string] }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-bold" aria-label={`Step ${step} of 2`}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const on = n === step;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className={`h-px w-8 ${done || on ? 'bg-black' : 'bg-line'}`} aria-hidden />}
            <span className={`grid h-6 w-6 place-items-center rounded-full ${done ? 'bg-dz-green text-white' : on ? 'bg-black text-dz-yellow' : 'bg-soft text-ink-3'}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
            <span className={on || done ? 'text-ink' : 'text-ink-3'}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function messageOf(err: unknown) {
  if (err instanceof ApiError) {
    const fieldErrors = (err.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
    const first = fieldErrors && Object.values(fieldErrors).flat()[0];
    return first ?? err.message;
  }
  return 'Network error. Check your connection and try again.';
}
