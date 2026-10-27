import { Link } from 'react-router-dom';
import { Activity, AlertOctagon, ClipboardList, ShoppingBag, Store } from 'lucide-react';
import { useAmQuery, type AmHome as Home } from '../../lib/am';
import { AmHeader, Page, Synced } from './AmShell';
import { Empty, StoreRow } from './parts';

/** Home: who I am, today's risk summary, swipeable KPI cards, and the stores that need me first. */
export default function AmHome() {
  const q = useAmQuery<Home>('home', '/admin/am/home');
  const h = q.data?.data;
  const k = h?.kpis;
  const sla = k?.avgSla;
  const slaTone = sla == null ? 'text-ink' : sla >= 90 ? 'text-dz-green' : sla >= 80 ? 'text-[#8a5a00]' : 'text-dz-red';
  const summary = !k
    ? ''
    : k.highRisk
      ? `${k.highRisk} restaurant${k.highRisk > 1 ? 's need' : ' needs'} action today${k.watch ? ` · ${k.watch} on watch` : ''}.`
      : k.watch || k.openIssues
        ? `No high-risk restaurants.${k.watch ? ` ${k.watch} on watch.` : ''}${k.openIssues ? ` ${k.openIssues} open issue${k.openIssues > 1 ? 's' : ''} to handle.` : ''}`
        : 'All your restaurants look healthy today.';

  const kpis = k
    ? [
        { label: 'Active restaurants (7D)', value: `${k.active7d}/${k.assigned}`, icon: Store, tone: 'text-ink' },
        { label: 'Avg SLA (7D)', value: sla == null ? '—' : `${sla}%`, icon: Activity, tone: slaTone },
        { label: 'High-risk restaurants', value: String(k.highRisk), icon: AlertOctagon, tone: k.highRisk ? 'text-dz-red' : 'text-dz-green' },
        { label: 'Orders today', value: String(k.ordersToday), icon: ShoppingBag, tone: 'text-ink' },
      ]
    : [];

  return (
    <>
      <AmHeader title={h ? h.am.name : 'Account manager'} sub={h ? `${h.am.zone} · Account manager` : ' '} />
      <Synced at={h?.syncedAt} cachedAt={q.data?.cachedAt ?? null} />
      <Page>
        {q.isError && !h && <Empty>Couldn’t load your dashboard. Pull down or check your connection.</Empty>}
        {k && (
          <>
            <section className={`rounded-2xl p-4 ${k.highRisk ? 'bg-dz-red text-white' : k.watch || k.openIssues ? 'bg-dz-yellow-soft' : 'bg-dz-green-soft'}`} data-risk-summary>
              <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">Today’s risk summary</p>
              <p className="mt-1 text-lg font-extrabold leading-snug">{summary}</p>
              <p className="mt-1 text-sm font-semibold opacity-90">
                {k.openIssues} open issue{k.openIssues === 1 ? '' : 's'} · {k.tasksDue} task{k.tasksDue === 1 ? '' : 's'} due today
              </p>
            </section>

            <div
              className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0"
              aria-label="Key numbers"
              data-kpis
            >
              {kpis.map((c) => (
                <div key={c.label} className="w-[46%] min-w-[150px] shrink-0 snap-start rounded-2xl bg-white p-4 ring-1 ring-line md:w-auto md:min-w-0">
                  <c.icon className="h-5 w-5 text-ink-3" aria-hidden />
                  <p className={`mt-2 font-display text-3xl leading-none ${c.tone}`}>{c.value}</p>
                  <p className="mt-1 text-xs font-bold text-ink-2">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl">Needs attention</h2>
              <Link to="/am/stores" className="text-sm font-bold text-dz-red">
                All restaurants
              </Link>
            </div>
            {h.atRisk.length ? (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {h.atRisk.map((s) => (
                  <StoreRow key={s.id} s={s} />
                ))}
              </ul>
            ) : (
              <Empty>Nothing on watch. Use the quiet time for a visit or a test order.</Empty>
            )}
            <Link to="/am/tasks" className="flex items-center justify-center gap-2 rounded-2xl bg-black py-3 font-extrabold text-dz-yellow md:max-w-sm">
              <ClipboardList className="h-5 w-5" aria-hidden /> Today’s tasks ({k.tasksDue})
            </Link>
          </>
        )}
        {!k && q.isLoading && <div className="h-40 animate-pulse rounded-2xl bg-white" />}
        {k && k.assigned === 0 && <Empty>No restaurants are assigned to you yet. Ask your city lead to assign your book.</Empty>}
      </Page>
    </>
  );
}
