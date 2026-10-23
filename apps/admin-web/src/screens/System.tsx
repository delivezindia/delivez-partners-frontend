import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { Button, Card, ErrorBox, PageHead } from '../components/ui';

type Level = 'ok' | 'warn' | 'error';
interface Status {
  overall: Level;
  checks: { level: Level; area: string; message: string }[];
  build: { version: string; commit: string | null; commitDate: string | null; startedAt: string; node: string; environment: string; uptimeSeconds: number };
  database: { ok: boolean; latencyMs: number };
  redis: { mode: 'redis' | 'memory'; ok: boolean };
  push: { sender: { mode: 'firebase' | 'log'; projectId: string | null; problem: string | null }; webReady: boolean; missingWebSettings: string[]; activeDevices: number; last24h: { sent: number; failed: number } };
  sms: { provider: string; whatsapp: string; templates: { code: string; set: boolean }[]; last24h: Record<string, number> };
  login: { codesShownOnScreen: boolean };
  addresses: { publicApiUrl: string | null; corsOrigins: string[]; partnersWebUrl: string | null };
  uploads: { dir: string; writable: boolean };
}

const ICON = {
  ok: <CheckCircle2 className="h-5 w-5 shrink-0 text-dz-green" aria-label="OK" />,
  warn: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-label="Warning" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-dz-red" aria-label="Problem" />,
};
const OVERALL: Record<Level, { text: string; cls: string }> = {
  ok: { text: 'All systems working', cls: 'bg-dz-green-soft text-dz-green border-dz-green' },
  warn: { text: 'Working, with warnings', cls: 'bg-amber-50 text-amber-800 border-amber-400' },
  error: { text: 'Something needs fixing', cls: 'bg-dz-red-soft text-dz-red border-dz-red' },
};
const ago = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : s < 86_400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86_400)} days`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-ink-3">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}

/** Is this server set up correctly? Push, SMS, database, Redis, uploads, version — no secret values shown. */
export default function System() {
  const q = useQuery({ queryKey: ['system-status'], queryFn: () => api<Status>('/admin/system/status'), refetchInterval: 30_000 });
  const check = useMutation({ mutationFn: () => api<{ ok: boolean; error?: string; ms: number }>('/admin/system/push-check', { method: 'POST' }) });
  const s = q.data;

  return (
    <div className="space-y-5">
      <PageHead
        title="System"
        sub="Is this server set up correctly? Shows on/off states only — never passwords or keys."
        actions={
          <Button variant="outline" onClick={() => void q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {s && (
        <>
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-[1.5px] px-5 py-4 ${OVERALL[s.overall].cls}`} data-overall={s.overall}>
            <b className="flex items-center gap-2 text-lg">{ICON[s.overall]} {OVERALL[s.overall].text}</b>
            <span className="text-sm font-semibold">
              Version {s.build.version}
              {s.build.commit && ` · ${s.build.commit}`} · {s.build.environment} · up {ago(s.build.uptimeSeconds)}
            </span>
          </div>

          {s.login.codesShownOnScreen && s.build.environment === 'production' && (
            <p className="rounded-[14px] border-[1.5px] border-dz-red bg-dz-red-soft px-5 py-3 font-semibold text-dz-red" role="alert">
              Test mode is ON: login codes are shown on screen, so anyone can sign in as any number. Turn off OTP_SHOW_IN_RESPONSE (or connect MSG91) before real partners use the app.
            </p>
          )}

          <Card title="Checks">
            <ul className="divide-y divide-line">
              {s.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 py-2.5" data-level={c.level}>
                  {ICON[c.level]}
                  <span className="w-24 shrink-0 font-bold">{c.area}</span>
                  <span className="text-sm">{c.message}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card
              title="Push notifications"
              actions={
                <Button variant="dark" className="min-h-9 px-3 text-sm" disabled={check.isPending} onClick={() => check.mutate()}>
                  {check.isPending ? 'Checking…' : 'Check Firebase connection'}
                </Button>
              }
            >
              {check.data && (
                <p className={`mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${check.data.ok ? 'bg-dz-green-soft text-dz-green' : 'bg-dz-red-soft text-dz-red'}`} data-push-check={check.data.ok ? 'ok' : 'fail'}>
                  {check.data.ok ? ICON.ok : ICON.error}
                  {check.data.ok ? `Firebase accepted the key (${check.data.ms} ms). Server-side push is working.` : check.data.error}
                </p>
              )}
              {check.error && <ErrorBox error={errorText(check.error)} />}
              <Row label="Sending">{s.push.sender.mode === 'firebase' ? `Firebase · ${s.push.sender.projectId}` : 'Not sending (log only)'}</Row>
              <Row label="Browsers can turn on alerts">{s.push.webReady ? 'Yes' : `No — missing ${s.push.missingWebSettings.join(', ')}`}</Row>
              <Row label="Devices with alerts on">{s.push.activeDevices}</Row>
              <Row label="Last 24 h">{s.push.last24h.sent} sent · {s.push.last24h.failed} failed</Row>
              {s.push.activeDevices === 0 && <p className="mt-2 text-xs text-ink-3">No device has turned on alerts on this server yet. Open the Partners app → Notifications → Turn on alerts.</p>}
            </Card>

            <Card title="SMS & WhatsApp">
              <Row label="SMS">{s.sms.provider === 'DEV' ? 'Not connected (DEV)' : s.sms.provider}</Row>
              <Row label="WhatsApp">{s.sms.whatsapp === 'DEV' ? 'Not connected (DEV)' : s.sms.whatsapp}</Row>
              <Row label="Login codes on screen">{s.login.codesShownOnScreen ? 'Yes (test mode)' : 'No'}</Row>
              <Row label="MSG91 templates">
                {s.sms.templates.filter((t) => t.set).length}/{s.sms.templates.length} set
              </Row>
              <Row label="Last 24 h">{Object.entries(s.sms.last24h).map(([k, v]) => `${v} ${k.toLowerCase().replace(/_/g, ' ')}`).join(' · ') || 'none'}</Row>
            </Card>

            <Card title="Server">
              <Row label="Database">{s.database.ok ? `Connected · ${s.database.latencyMs} ms` : 'NOT reachable'}</Row>
              <Row label="Redis">{s.redis.mode === 'memory' ? 'Not configured (in-memory)' : s.redis.ok ? 'Connected' : 'NOT reachable'}</Row>
              <Row label="Uploads folder">{s.uploads.writable ? 'Writable' : 'NOT writable'}</Row>
              <Row label="Version">
                {s.build.version}
                {s.build.commit ? ` (${s.build.commit}, ${when(s.build.commitDate)})` : ''}
              </Row>
              <Row label="Started">{when(s.build.startedAt)}</Row>
              <Row label="Node.js">{s.build.node}</Row>
            </Card>

            <Card title="Addresses">
              <Row label="API (PUBLIC_API_URL)">{s.addresses.publicApiUrl ?? '— (same domain)'}</Row>
              <Row label="Partners app">{s.addresses.partnersWebUrl ?? '—'}</Row>
              <Row label="Allowed frontends">{s.addresses.corsOrigins.length ? s.addresses.corsOrigins.map((o) => <span key={o} className="block">{o}</span>) : '— (localhost only)'}</Row>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
