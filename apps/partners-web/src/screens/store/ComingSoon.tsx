import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, type LucideIcon } from 'lucide-react';

/** Placeholder for store sections that haven't shipped yet. Partner-facing — no internal plan wording. */
export default function ComingSoon({ title, body, icon: Icon = Sparkles, points = [] }: { title: string; body: string; icon?: LucideIcon; points?: string[] }) {
  return (
    <div className="mx-auto max-w-xl rounded-[16px] border-[1.5px] border-dashed border-dz-yellow-strong bg-dz-yellow-soft px-6 py-10 text-center sm:px-10">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-dz-yellow text-black">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <span className="dz-badge mt-5">Coming soon</span>
      <h1 className="mt-3 text-4xl">{title}</h1>
      <p className="mt-2 text-ink-2">{body}</p>
      {points.length > 0 && (
        <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dz-red" />
              {p}
            </li>
          ))}
        </ul>
      )}
      <Link to=".." relative="path" className="dz-btn-outline mt-7">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
      </Link>
    </div>
  );
}
