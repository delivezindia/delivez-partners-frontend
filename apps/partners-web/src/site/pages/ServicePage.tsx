import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SERVICES, serviceBySlug } from '../content';
import { CheckList, CtaBand, FaqList, OrderCardMock, PageHero, RegisterButton, Section, SecondaryLink, SoonBadge } from '../components';
import { IconArrow } from '../icons';

const CTA_NOUN: Record<string, string> = {
  restaurants: 'kitchen',
  grocery: 'store',
  pharmacy: 'pharmacy',
  'local-stores': 'shop',
  vendors: 'stall',
};

// /services/:slug — one page per partner category.
export default function ServicePage() {
  const { slug } = useParams();
  const service = serviceBySlug(slug);

  useEffect(() => {
    if (service) document.title = `${service.name} · Delivez Partners`;
  }, [service]);

  if (!service) return <Navigate to="/" replace />;
  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      <PageHero eyebrow={`For ${service.short.toLowerCase()}`} title={service.tagline} intro={service.intro}>
        <div className="mt-8 flex flex-wrap gap-3">
          <RegisterButton>Register your {service.short === 'Vendors' ? 'stall' : 'business'}</RegisterButton>
          <SecondaryLink to="#requirements">What you'll need</SecondaryLink>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {service.storeTypes.map((t) => (
            <span key={t} className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium">
              {t}
            </span>
          ))}
        </div>
      </PageHero>

      <Section eyebrow="Features" title={`Built for ${service.short.toLowerCase()}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {service.features.map((f) => (
            <div key={f.title} className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${service.accent}`}>
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-bold">
                {f.title}
                {f.soon && <SoonBadge />}
              </h3>
              <p className="mt-1 text-sm text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="requirements" className="bg-neutral-50" eyebrow="Before you start" title="What you'll need">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
            <ul className="divide-y divide-neutral-100">
              {service.requirements.map((r) => (
                <li key={r.label} className="flex items-start justify-between gap-4 py-3">
                  <span>
                    <span className="font-semibold">{r.label}</span>
                    {r.note && <span className="block text-sm text-neutral-500">{r.note}</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${r.required ? 'bg-dz-red/10 text-dz-red' : 'bg-neutral-100 text-neutral-600'}`}>
                    {r.required ? 'Required' : 'Optional'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold">Registration takes about {service.minutes}</p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {service.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-neutral-200">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dz-black text-xs font-bold text-dz-yellow">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-neutral-500">Stop any time and continue later — your progress is saved after every step.</p>
          </div>
        </div>
      </Section>

      {service.slug !== 'vendors' && (
        <Section eyebrow="Day to day" title="Simple to run, even at peak">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <CheckList
              items={[
                'Accept orders within 3 minutes and set an honest prep time.',
                'Switch between Open, Busy and Closed from the dashboard.',
                'Tap Ready Soon so riders arrive just in time.',
                'Hand over with an OTP or QR — no wrong parcels.',
                'See your weekly payout, statements and any penalties with full explanations.',
              ]}
            />
            <div className="flex justify-center rounded-3xl bg-neutral-100 p-8">
              <OrderCardMock compact={service.slug !== 'restaurants'} />
            </div>
          </div>
        </Section>
      )}

      <Section className="bg-neutral-50" eyebrow="Questions" title={`${service.short}: common questions`}>
        <div className="max-w-3xl">
          <FaqList items={service.faqs} />
        </div>
      </Section>

      <Section eyebrow="Other partners" title="Also on Delivez">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((s) => (
            <Link key={s.slug} to={`/services/${s.slug}`} className="group flex items-center gap-3 rounded-2xl p-4 ring-1 ring-neutral-200 transition hover:shadow-md">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.accent}`}>
                <s.icon size={20} />
              </span>
              <span className="flex-1 font-semibold">{s.short}</span>
              <IconArrow size={16} className="text-neutral-400 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand title={`Bring your ${CTA_NOUN[service.slug]} online`} body={`Free to register · about ${service.minutes} · documents can come later.`} />
    </>
  );
}
