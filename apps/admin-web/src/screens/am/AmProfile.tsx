import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, LogOut, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { api, useAuth } from '../../lib/api';
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push';
import { flushOutbox, useAmQuery, useOnline, useOutbox, type AmHome } from '../../lib/am';
import { useMe } from '../Layout';
import { AmHeader, Page } from './AmShell';
import { Card } from './parts';

const PUSH_TEXT: Record<PushState, string> = {
  on: 'On for this phone',
  off: 'Off',
  blocked: 'Blocked in the browser settings',
  unsupported: 'Not supported on this browser',
  'not-configured': 'Not set up on the server yet',
};

/** Me, alerts on/off, offline sync, and what this role can and can’t do. */
export default function AmProfile() {
  const { data: me } = useMe();
  const home = useAmQuery<AmHome>('home', '/admin/am/home');
  const online = useOnline();
  const pending = useOutbox();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [push, setPush] = useState<PushState | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  useEffect(() => void pushState().then(setPush), []);

  async function sync() {
    const n = await flushOutbox();
    await qc.invalidateQueries({ queryKey: ['am'] });
    setSyncMsg(online ? `Synced${n ? ` · ${n} note(s) sent` : ''}` : 'Still offline — will sync when you’re back online');
  }
  async function logout() {
    await disablePush();
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    useAuth.getState().clear();
    qc.clear();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <AmHeader title="Profile" sub="Account manager" />
      <Page>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-xl font-extrabold">{me?.user.fullName ?? me?.user.phone}</p>
            <p className="text-sm text-ink-2">{me?.user.phone}</p>
            <p className="mt-1 text-sm text-ink-2">{me ? (me.allCities ? 'All cities' : me.cities.map((c) => c.name).join(', ')) : ''}</p>
            {home.data && <p className="mt-2 text-sm font-bold">{home.data.data.kpis.assigned} restaurants in your book</p>}
          </Card>

          <Card>
            <p className="flex items-center gap-2 font-extrabold">
              <BellRing className="h-5 w-5" aria-hidden /> Push alerts
            </p>
            <p className="mt-1 text-sm text-ink-2">Churn risk over 70, SLA breaches and sudden order drops at your restaurants. Tap an alert to open the restaurant.</p>
            <p className="mt-2 text-sm font-bold" data-push-state>
              {push ? PUSH_TEXT[push] : '…'}
            </p>
            {push === 'off' && (
              <button type="button" onClick={() => void enablePush().then(setPush)} className="mt-2 h-12 w-full rounded-xl bg-black font-extrabold text-dz-yellow">
                Turn on alerts
              </button>
            )}
          </Card>

          <Card>
            <p className="flex items-center gap-2 font-extrabold">
              <RefreshCw className="h-5 w-5" aria-hidden /> Offline & sync
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {online ? 'Online.' : 'Offline.'} Your last synced restaurant data stays on this phone, and notes you write offline are sent when you’re back online.
            </p>
            <p className="mt-2 text-sm font-bold">{pending.length ? `${pending.length} note(s) waiting to sync` : 'Nothing waiting to sync'}</p>
            <button type="button" onClick={() => void sync()} className="mt-2 h-12 w-full rounded-xl bg-soft font-extrabold" data-sync>
              Sync now
            </button>
            {syncMsg && <p className="mt-2 text-xs font-semibold text-ink-2">{syncMsg}</p>}
          </Card>

          <Card>
            <p className="flex items-center gap-2 font-extrabold">
              <ShieldCheck className="h-5 w-5" aria-hidden /> What you can do
            </p>
            <ul className="mt-2 space-y-1.5 text-sm" data-guardrails>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-dz-green" /> See and act on your assigned restaurants only
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-dz-green" /> Change a restaurant’s prep time by up to 10 min at a time (5–90 min) — the shop is told
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-dz-green" /> Call, log notes, raise tasks, escalate issues to city ops
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-dz-red" /> Change prices or menus
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-dz-red" /> Pause, suspend or disable a restaurant
              </li>
            </ul>
          </Card>
        </div>

        <button type="button" onClick={() => void logout()} className="flex h-12 w-full md:max-w-xs items-center justify-center gap-2 rounded-xl border-[1.5px] border-black font-extrabold">
          <LogOut className="h-5 w-5" aria-hidden /> Log out
        </button>
      </Page>
    </>
  );
}
