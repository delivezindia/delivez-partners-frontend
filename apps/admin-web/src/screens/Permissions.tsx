import { useQuery } from '@tanstack/react-query';
import { Check, Minus } from 'lucide-react';
import { api } from '../lib/api';
import { LEVEL_NAME, type PermissionTable } from '../lib/types';
import { Card, PageHead } from '../components/ui';
import { ROLE_HELP, roleName } from './Team';
import { useMe } from './Layout';

/** Who can do what, and where: every role, the level of the map it works on, its permissions and whom it may add. */
export default function Permissions() {
  const { data: me } = useMe();
  const { data } = useQuery({ queryKey: ['permissions'], queryFn: () => api<PermissionTable>('/admin/geo/permissions') });
  const area = data?.roles.filter((r) => r.isAreaRole || r.level === 'NATIONAL') ?? [];
  const other = data?.roles.filter((r) => !r.isAreaRole && r.level !== 'NATIONAL') ?? [];

  const table = (rows: PermissionTable['roles']) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm" data-permissions>
        <thead className="text-left text-xs text-ink-3">
          <tr>
            <th className="sticky left-0 min-w-[230px] bg-white pb-2 pr-3">Role · works on</th>
            {data?.permissions.map((p) => (
              <th key={p.key} className="w-20 px-1 pb-2 align-bottom font-semibold leading-tight">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.role} className={me?.role === r.role ? 'bg-dz-yellow-soft' : ''} data-role-row={r.role}>
              <td className="sticky left-0 min-w-[230px] bg-inherit py-2 pr-3">
                <b className="block capitalize">{roleName(r.role)}</b>
                <span className="text-xs text-ink-3">{r.level === 'ANY' ? 'any part of the map' : LEVEL_NAME[r.level]}</span>
                {r.canAdd.length > 0 && <span className="block text-xs text-ink-3">Adds: {r.canAdd.join(', ')}</span>}
              </td>
              {data?.permissions.map((p) => (
                <td key={p.key} className="px-1 text-center">
                  {r.permissions.includes(p.key) ? <Check className="mx-auto h-4 w-4 text-dz-green" aria-label="yes" /> : <Minus className="mx-auto h-4 w-4 text-ink-3/40" aria-label="no" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHead
        title="Roles & permissions"
        sub="Every admin has a role (what they can do) and an area of work (where). They only see and act on shops, orders, riders and people inside their area."
      />
      <Card title="How the map is divided">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {data?.levels.map((l, i) => (
            <li key={l} className="flex items-center gap-2">
              <span className="rounded-full border-[1.5px] border-black px-3 py-1">{LEVEL_NAME[l]}</span>
              {i < data.levels.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>A person covers everything inside their area: a state head sees every district, city, area and PIN code of that state.</li>
          <li>Area managers add people only below their own level and only inside their area (a district manager can add area managers and PIN-code executives in that district).</li>
          <li>They can also add a driver-assignment-only dispatcher, support person or account manager for their area.</li>
          <li>Places on the map (districts, cities, areas, PIN codes) can be added or switched off only by someone above that level.</li>
          <li>Coupons, legal documents, the audit log and system settings stay with the national team.</li>
        </ul>
      </Card>
      <Card title="Area managers (by level)">{table(area)}</Card>
      <Card title="Other roles (given any area of work)">
        {table(other)}
        <p className="mt-3 text-xs text-ink-3">{other.map((r) => `${roleName(r.role)}: ${ROLE_HELP[r.role]}`).join(' · ')}</p>
      </Card>
    </div>
  );
}
