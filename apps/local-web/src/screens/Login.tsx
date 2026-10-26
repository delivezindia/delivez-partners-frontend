import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth, type SessionUser } from '../lib/auth-store';
import { Brand, Button, ErrorText } from '../components/ui';
import { syncLanguageAfterLogin, useI18n } from '../lib/i18n';

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

// Customer login: phone + OTP (same accounts as every Delivez app).
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const setSession = useAuth((s) => s.setSession);
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<OtpRequestResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  const digits = phone.replace(/\D/g, '');

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
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
      navigate(res.user.isNew || !res.user.fullName ? `/account?welcome=1&next=${encodeURIComponent(next)}` : next, { replace: true });
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-dz-yellow to-dz-yellow-soft">
      <div className="mx-auto flex max-w-md flex-col px-4 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <Link to={next} className="grid h-10 w-10 place-items-center rounded-full bg-white/70" aria-label={t('lc.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Brand />
          <span className="w-10" />
        </div>

        <div className="mt-8 rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)]">
          {!otp ? (
            <form onSubmit={requestOtp} className="space-y-5">
              <div>
                <h1 className="text-[34px]">{t('lc.login.title')}</h1>
                <p className="mt-1 text-sm text-ink-2">{t('lc.login.sub')}</p>
              </div>
              <label className="block">
                <span className="text-sm font-bold">{t('login.mobileLabel')}</span>
                <div className={`mt-1.5 flex h-14 items-center overflow-hidden rounded-xl border-[1.5px] bg-white focus-within:border-black ${error ? 'border-dz-red' : 'border-line'}`}>
                  <span className="flex h-full items-center border-r border-line bg-soft px-4 font-bold text-ink-2">+91</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={14}
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="98450 12345"
                    aria-label={t('login.mobileLabel')}
                    className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-lg font-semibold tracking-wide outline-none placeholder:font-normal placeholder:text-neutral-400"
                  />
                </div>
              </label>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" className="w-full min-h-14 text-base" disabled={busy || digits.length < 10}>
                {busy ? t('login.sending') : t('login.getOtp')}
                {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
              </Button>
              <p className="text-xs leading-relaxed text-ink-3">{t('lc.login.terms')}</p>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5">
              <div>
                <h1 className="text-[34px]">{t('login.codeTitle')}</h1>
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
                {busy ? t('login.verifying') : t('login.verify')}
              </Button>
              <button type="button" disabled={resendIn > 0 || busy} onClick={() => requestOtp()} className="w-full text-sm font-bold text-ink-2 hover:text-dz-red disabled:font-semibold disabled:text-ink-3">
                {resendIn > 0 ? t('login.resendIn', { time: `0:${String(resendIn).padStart(2, '0')}` }) : t('login.resend')}
              </button>
            </form>
          )}
        </div>
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
