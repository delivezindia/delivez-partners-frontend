import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth, type SessionUser } from '../../lib/auth-store';
import { errorMessageOf } from '../../lib/onboarding';
import { Button, ErrorText } from '../../components/ui';
import { useStoreContext } from './StoreLayout';

const ROLE_LABEL: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', KITCHEN_LEAD: 'Kitchen lead', COUNTER_STAFF: 'Counter', PHARMACIST: 'Pharmacist', ACCOUNTANT: 'Accountant' };

// Shared-tablet quick switch (plan §4.3): pick a person, enter their 4-digit PIN.
export default function SwitchUser() {
  const { storeId } = useStoreContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setSession = useAuth((s) => s.setSession);
  const people = useQuery({ queryKey: ['switchable', storeId], queryFn: () => api<{ memberId: string; name: string; role: string }[]>(`/partners/stores/${storeId}/pin-switch`) });
  const [picked, setPicked] = useState<{ memberId: string; name: string } | null>(null);
  const [pin, setPin] = useState('');

  const switchTo = useMutation({
    mutationFn: () => api<{ accessToken: string; refreshToken: string; user: SessionUser }>(`/partners/stores/${storeId}/pin-switch`, { method: 'POST', body: { memberId: picked!.memberId, pin } }),
    onSuccess: (res) => {
      setSession(res);
      qc.clear();
      navigate(`/stores/${storeId}`, { replace: true });
    },
    onError: () => setPin(''),
  });

  const press = (d: string) => {
    if (switchTo.isPending) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) setTimeout(() => switchTo.mutate(), 0);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[clamp(28px,3.5vw,40px)]">Who's using this device?</h1>
        <p className="text-ink-2">Tap your name and enter your PIN. The current person is signed out on this device.</p>
      </div>

      {!picked ? (
        <>
          {people.isLoading && <p className="text-ink-3">Loading…</p>}
          {people.data?.length === 0 && <p className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-ink-3">No one has set a PIN for this outlet yet. Set yours below.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {people.data?.map((p) => (
              <button key={p.memberId} onClick={() => (switchTo.reset(), setPin(''), setPicked(p))} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white p-4 transition hover:border-black">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-dz-yellow text-lg font-black">{p.name.slice(0, 1).toUpperCase()}</span>
                <b>{p.name}</b>
                <span className="text-xs text-ink-3">{ROLE_LABEL[p.role] ?? p.role}</span>
              </button>
            ))}
          </div>
          <div className="rounded-[14px] border border-line bg-white p-5">
            <h2 className="mb-3 text-xl">Set or change my PIN</h2>
            <PinForm />
          </div>
        </>
      ) : (
        <div className="mx-auto max-w-xs space-y-5 text-center">
          <p className="text-lg">
            Hi <b>{picked.name}</b>, enter your PIN
          </p>
          <div className="flex justify-center gap-3" aria-live="polite">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-4 w-4 rounded-full border-2 border-black ${i < pin.length ? 'bg-black' : ''}`} />
            ))}
          </div>
          {switchTo.error && <ErrorText>{errorMessageOf(switchTo.error)}</ErrorText>}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} onClick={() => press(d)} className="h-16 rounded-2xl border-[1.5px] border-line bg-white text-2xl font-extrabold hover:border-black active:bg-dz-yellow-soft">
                {d}
              </button>
            ))}
            <button onClick={() => setPicked(null)} className="h-16 rounded-2xl text-sm font-bold text-ink-2">
              Back
            </button>
            <button onClick={() => press('0')} className="h-16 rounded-2xl border-[1.5px] border-line bg-white text-2xl font-extrabold hover:border-black active:bg-dz-yellow-soft">
              0
            </button>
            <button onClick={() => setPin((p) => p.slice(0, -1))} className="h-16 rounded-2xl text-sm font-bold text-ink-2" aria-label="Delete">
              ⌫
            </button>
          </div>
          {switchTo.isPending && <p className="text-sm text-ink-3">Switching…</p>}
        </div>
      )}
    </div>
  );
}

/** Set my own 4-digit PIN for this outlet's account. */
export function PinForm() {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const save = useMutation({
    mutationFn: () => api(`/partners/stores/${storeId}/staff/me/pin`, { method: 'PUT', body: { pin } }),
    onSuccess: () => {
      setPin('');
      setConfirm('');
      void qc.invalidateQueries({ queryKey: ['switchable', storeId] });
    },
  });
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="text-sm font-bold">
        New PIN
        <input type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="mt-1 block h-12 w-28 rounded-[9px] border-[1.5px] border-line text-center text-xl tracking-[0.4em]" />
      </label>
      <label className="text-sm font-bold">
        Repeat
        <input type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className="mt-1 block h-12 w-28 rounded-[9px] border-[1.5px] border-line text-center text-xl tracking-[0.4em]" />
      </label>
      <Button type="submit" variant="dark" disabled={pin.length !== 4 || pin !== confirm || save.isPending}>
        Save PIN
      </Button>
      {pin.length === 4 && confirm.length === 4 && pin !== confirm && <ErrorText>PINs don't match</ErrorText>}
      {save.isSuccess && <span className="text-sm font-bold text-dz-green">✓ PIN saved</span>}
      {save.error && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
    </form>
  );
}
