import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorText, useAuth } from '../lib/api';
import { Brand, Button } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [phone, setPhone] = useState('');
  const [req, setReq] = useState<{ requestId: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setReq(await api('/auth/otp/request', { method: 'POST', body: { phone } }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { requestId: req!.requestId, code, app: 'ADMIN', device: { platform: 'WEB' } },
      });
      setSession(res);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-soft">
      <header className="dz-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5">
          <Brand />
        </div>
      </header>
      <section className="mx-auto mt-16 max-w-sm px-4">
        <div className="rounded-[16px] border border-line bg-white p-6">
          <h1 className="text-4xl">Ops console</h1>
          <p className="mt-1 text-sm text-ink-2">For Delivez staff only. Log in with your registered number.</p>
          {!req ? (
            <form onSubmit={send} className="mt-6 space-y-3">
              <label className="block text-sm font-bold">
                Mobile number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoFocus placeholder="99999 00001" className="mt-1 h-12 w-full rounded-[9px] border-[1.5px] border-line px-3 font-normal outline-none focus:border-black" />
              </label>
              {error && <p className="text-sm font-semibold text-dz-red">{error}</p>}
              <Button type="submit" className="min-h-12 w-full" disabled={busy || phone.replace(/\D/g, '').length < 10}>
                {busy ? 'Sending…' : 'Get OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-3">
              <label className="block text-sm font-bold">
                6-digit code
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} autoFocus autoComplete="one-time-code" inputMode="numeric" className="mt-1 h-14 w-full rounded-[9px] border-[1.5px] border-line text-center text-2xl tracking-[0.4em] outline-none focus:border-black" />
              </label>
              {req.devCode && <p className="rounded-lg bg-dz-yellow-soft px-3 py-2 text-xs">Dev mode — code <b>{req.devCode}</b></p>}
              {error && <p className="text-sm font-semibold text-dz-red">{error}</p>}
              <Button type="submit" className="min-h-12 w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'Log in'}
              </Button>
              <button type="button" className="w-full text-sm font-semibold" onClick={() => setReq(null)}>
                Change number
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
