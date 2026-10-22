import { Navigate, useNavigate } from 'react-router-dom';
import { useMe } from '../lib/queries';
import { Brand, Button } from '../components/ui';
import { OPEN_STATE_DOT, StoreStatusChip } from '../components/StatusChip';
import { useLogout } from '../lib/use-logout';

// P03 Account chooser — every outlet the user can work in, grouped by partner account.
export default function Accounts() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data, isLoading, error, refetch } = useMe();

  const stores = data?.memberships.flatMap((m) => m.stores) ?? [];
  const isOwner = data?.memberships.some((m) => m.role === 'OWNER') ?? false;
  const open = (s: { id: string; status: string }) => navigate(s.status === 'DRAFT' ? `/onboarding/${s.id}` : `/stores/${s.id}`);
  if (!isLoading && stores.length === 1) {
    const only = stores[0];
    return <Navigate to={only.status === 'DRAFT' ? `/onboarding/${only.id}` : `/stores/${only.id}`} replace />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between dz-header px-4 py-2.5 sm:px-8">
        <Brand size="sm" />
        <Button variant="ghost" className="min-h-10 text-sm" onClick={logout}>
          Log out
        </Button>
      </header>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Choose an outlet</h1>
        <p className="mt-1 text-sm text-neutral-500">{data?.user.phone}</p>

        {isLoading && <p className="mt-8 text-neutral-500">Loading…</p>}
        {error && (
          <div className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-state-delayed">
            Could not load your accounts.{' '}
            <button className="font-semibold underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}

        {data?.memberships.map((m) => (
          <div key={m.partnerAccountId} className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {m.displayName} · {m.role.replace('_', ' ').toLowerCase()}
            </p>
            <div className="space-y-2">
              {m.stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => open(s)}
                  className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-neutral-200 transition hover:ring-dz-black"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-neutral-500">
                      {[s.zone?.name, s.city?.name].filter(Boolean).join(', ') || 'Location not set'} · {s.storeType.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StoreStatusChip status={s.status} />
                    <span className={`h-3 w-3 rounded-full ${OPEN_STATE_DOT[s.openState]}`} title={s.openState} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {data && stores.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
            <p className="text-lg font-semibold">Welcome to Delivez Partners</p>
            <p className="mt-1 text-sm text-neutral-500">
              Register your restaurant, store or pharmacy. It takes about 15 minutes — documents can come later.
            </p>
            <Button className="mt-6" onClick={() => navigate('/onboarding/new')}>
              Register your business
            </Button>
          </div>
        )}

        {data && stores.length > 0 && isOwner && (
          <Button variant="ghost" className="mt-6" onClick={() => navigate('/onboarding/new')}>
            + Add another outlet
          </Button>
        )}
      </section>
    </main>
  );
}
