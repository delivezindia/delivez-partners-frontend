import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { ago } from '../../lib/notifications';
import { errorMessageOf } from '../../lib/onboarding';
import { Chips, TextArea } from '../../components/form';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

type Filter = 'ALL' | 'UNREPLIED' | 'LOW';
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  orderId: string;
  orderNumber: string;
  customer: string;
}
interface Page {
  summary: { avg: number | null; count: number; stars: Record<string, number>; last30: { avg: number | null; count: number }; unreplied: number };
  items: Review[];
  nextBefore: string | null;
}

const TAG: Record<string, MsgKey> = {
  ON_TIME: 'lc.rate.t.ON_TIME',
  LATE: 'lc.rate.t.LATE',
  GOOD_PACKING: 'lc.rate.t.GOOD_PACKING',
  POOR_PACKING: 'lc.rate.t.POOR_PACKING',
  FRESH: 'lc.rate.t.FRESH',
  WRONG_ITEM: 'lc.rate.t.WRONG_ITEM',
  FRIENDLY: 'lc.rate.t.FRIENDLY',
  COLD_FOOD: 'lc.rate.t.COLD_FOOD',
};

// Ratings: what customers said, the spread of stars, and the shop's public reply.
export default function Reviews() {
  const { storeId, role } = useStoreContext();
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('ALL');
  const list = useInfiniteQuery({
    queryKey: ['reviews', storeId, filter],
    queryFn: ({ pageParam }) => api<Page>(`/partners/stores/${storeId}/reviews?filter=${filter}${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
  const summary = list.data?.pages[0]?.summary;
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const canReply = role === 'OWNER' || role === 'MANAGER';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[clamp(28px,3.5vw,40px)]">{t('tab.reviews')}</h1>
        <p className="text-ink-2">{t('rv.subtitle')}</p>
      </div>

      {summary && (
        <section className="dz-card grid gap-5 p-5 sm:grid-cols-[auto_1fr]" data-review-summary>
          <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1">
            <span className="flex items-center gap-1.5 text-5xl font-extrabold tabular-nums" data-avg>
              {summary.avg != null ? summary.avg.toFixed(1) : '–'} <Star className="h-8 w-8 fill-dz-yellow text-[#d4a106]" aria-hidden />
            </span>
            <span className="text-sm text-ink-2">{summary.count ? t('rv.ratings', { n: summary.count }) : t('rv.none')}</span>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = summary.stars[n] ?? 0;
              const pct = summary.count ? Math.round((c / summary.count) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-6 tabular-nums">{n}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-soft" aria-hidden>
                    <span className={`block h-full rounded-full ${n >= 4 ? 'bg-dz-green' : n === 3 ? 'bg-dz-yellow' : 'bg-dz-red'}`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-10 text-right tabular-nums text-ink-2">{c}</span>
                </div>
              );
            })}
            <p className="pt-1 text-sm text-ink-2">
              {summary.last30.count ? t('rv.last30', { avg: summary.last30.avg?.toFixed(1) ?? '–', n: summary.last30.count }) : t('rv.last30None')}
              {summary.unreplied > 0 && <b className="ml-2 text-ink">· {t('rv.toReply', { n: summary.unreplied })}</b>}
            </p>
          </div>
        </section>
      )}

      <Chips<Filter> options={(['ALL', 'UNREPLIED', 'LOW'] as const).map((f) => ({ value: f, label: t(`rv.f.${f}`) }))} value={[filter]} onChange={([f]) => setFilter(f)} />

      {list.isLoading && <SkeletonList rows={4} />}
      {list.data && items.length === 0 && <EmptyState icon={Star} title={t('rv.empty')} body={t('rv.emptyBody')} />}
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r) => (
            <ReviewCard key={r.id} r={r} storeId={storeId} canReply={canReply} />
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="ghost" className="w-full" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? t('ord.loading') : t('rv.more')}
        </Button>
      )}
    </div>
  );
}

function ReviewCard({ r, storeId, canReply }: { r: Review; storeId: string; canReply: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.reply ?? '');
  const send = useMutation({
    mutationFn: () => api(`/partners/stores/${storeId}/reviews/${r.id}/reply`, { method: 'POST', body: { reply: text.trim() } }),
    onSuccess: () => {
      setEditing(false);
      toast.success(t('rv.sent'));
      void qc.invalidateQueries({ queryKey: ['reviews', storeId] });
    },
  });
  const low = r.rating <= 2;
  return (
    <li className={`dz-card p-5 ${low ? 'ring-1 ring-dz-red/30' : ''}`} data-review={r.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm font-extrabold text-white ${low ? 'bg-dz-red' : r.rating === 3 ? 'bg-[#b8860b]' : 'bg-dz-green'}`}>
          {r.rating} <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
        </span>
        <b>{r.customer}</b>
        <Link to={`/stores/${storeId}/orders/${r.orderNumber}`} className="text-sm text-ink-2 underline">
          {r.orderNumber}
        </Link>
        <span className="ml-auto text-xs text-ink-3">{ago(r.createdAt, t)}</span>
      </div>
      {r.comment ? <p className="mt-2">“{r.comment}”</p> : <p className="mt-2 text-sm text-ink-3">{t('rv.noComment')}</p>}
      {r.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.tags.map((x) => (
            <span key={x} className="rounded-full bg-soft px-2.5 py-1 text-xs font-bold">
              {TAG[x] ? t(TAG[x]) : x}
            </span>
          ))}
        </div>
      )}

      {r.reply && !editing && (
        <div className="mt-3 rounded-xl bg-soft p-3 text-sm" data-reply>
          <b className="block text-xs text-ink-2">{t('rv.yourReply')}</b>
          {r.reply}
        </div>
      )}
      {canReply && editing && (
        <div className="mt-3 space-y-2">
          <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t('rv.replyPh')} className="min-h-20" autoFocus data-reply-input />
          {send.error && <ErrorText>{errorMessageOf(send.error) ?? t('rv.failed')}</ErrorText>}
          <div className="flex gap-2">
            <Button className="min-h-10" disabled={send.isPending || text.trim().length < 2} onClick={() => send.mutate()} data-reply-send>
              {t('rv.send')}
            </Button>
            <Button variant="ghost" className="min-h-10" onClick={() => (setEditing(false), setText(r.reply ?? ''))}>
              {t('rv.cancel')}
            </Button>
          </div>
        </div>
      )}
      {canReply && !editing && (
        <Button variant="ghost" className="mt-3 min-h-10 text-sm" onClick={() => setEditing(true)} data-reply-open>
          <MessageSquareReply className="h-4 w-4" aria-hidden /> {r.reply ? t('rv.edit') : t('rv.reply')}
        </Button>
      )}
    </li>
  );
}
