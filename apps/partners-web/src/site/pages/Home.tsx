import { Link } from 'react-router-dom';
import { COMMERCIALS, GENERAL_FAQS, ONBOARDING_FLOW, ORDER_FLOW, PLATFORM_FEATURES, SERVICES } from '../content';
import { CtaBand, FaqList, OrderCardMock, RegisterButton, Section, SecondaryLink } from '../components';
import { IconArrow, IconCheck } from '../icons';

const HIGHLIGHTS = [
  { value: '0%', label: 'commission at launch' },
  { value: 'Weekly', label: 'payouts to your bank or UPI' },
  { value: '15 min', label: 'to register' },
  { value: '100', label: 'penalty-free first orders' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-dz-yellow-soft via-dz-yellow-soft/50 to-white px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="dz-badge">Delivez Go Local · Now in Bengaluru</p>
            <h1 className="mt-5 text-[clamp(42px,6.5vw,76px)]">
              Grow your local business with <span className="text-dz-red">Delivez</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Restaurants, grocery stores, pharmacies and neighbourhood shops — take orders online, let Delivez riders deliver in minutes, and get paid every week.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <RegisterButton />
              <SecondaryLink to="/how-it-works">How it works</SecondaryLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              {['Free to register', 'Phone + OTP, no passwords', 'Documents can come later'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheck size={18} className="text-dz-red" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-dz-yellow/40" aria-hidden />
            <div className="relative w-full max-w-sm space-y-4">
              <OrderCardMock />
              <div className="ml-auto w-64 rounded-2xl bg-dz-black p-4 text-white shadow-xl">
                <p className="text-xs text-neutral-400">Example weekly payout</p>
                <p className="text-2xl font-extrabold text-dz-yellow">₹1,71,290</p>
                <p className="text-xs text-neutral-400">0% commission · paid Monday</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-b border-neutral-200 px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div key={h.label}>
              <p className="text-3xl font-extrabold text-dz-red">{h.value}</p>
              <p className="text-sm text-neutral-600">{h.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <Section id="services" eyebrow="Who it's for" title="One platform for every kind of local business" intro="Pick your business type and the setup adapts — the right documents, the right tools, the right rules.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} to={`/services/${s.slug}`} className="group flex flex-col rounded-2xl bg-white p-6 ring-1 ring-neutral-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-neutral-300">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.accent}`}>
                <s.icon size={26} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">{s.tagline}</p>
              <p className="mt-3 text-xs text-neutral-500">{s.storeTypes.slice(0, 4).join(' · ')}{s.storeTypes.length > 4 ? ' · …' : ''}</p>
              <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-bold text-dz-red">
                Learn more <IconArrow size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
          <div className="flex flex-col justify-between rounded-2xl bg-dz-black p-6 text-white">
            <div>
              <h3 className="text-lg font-bold">Not sure which fits?</h3>
              <p className="mt-1 text-sm text-neutral-300">Start registering and choose “Something else” — we'll set you up as a local store.</p>
            </div>
            <RegisterButton className="mt-5 w-full">Start now</RegisterButton>
          </div>
        </div>
      </Section>

      {/* Platform */}
      <Section className="bg-neutral-50" eyebrow="What you get" title="Everything you need to sell and deliver" center>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-dz-yellow">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Order flow */}
      <Section eyebrow="Built for busy counters" title="An order screen your whole team can use" intro="Big buttons, loud alerts and colours you can read across the kitchen. Every order follows the same five steps.">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <ol className="relative space-y-5 border-l-2 border-neutral-200 pl-6">
            {ORDER_FLOW.map((s) => (
              <li key={s.state} className="relative">
                <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ${s.colour}`} />
                <p className="font-bold">{s.state}</p>
                <p className="text-sm text-neutral-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="flex justify-center rounded-3xl bg-neutral-100 p-8">
            <OrderCardMock />
          </div>
        </div>
      </Section>

      {/* Onboarding */}
      <Section className="bg-dz-black text-white" eyebrow="Get started" title="Live in five simple steps">
        <ol className="grid gap-4 md:grid-cols-5">
          {ONBOARDING_FLOW.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dz-yellow font-extrabold text-dz-black">{i + 1}</span>
              <p className="mt-4 font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-neutral-400">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <RegisterButton />
        </div>
      </Section>

      {/* Commercials */}
      <Section eyebrow="Simple pricing" title="Keep more of every order">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COMMERCIALS.map((c) => (
            <div key={c.label} className="rounded-2xl p-5 ring-1 ring-neutral-200">
              <p className="text-sm text-neutral-500">{c.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{c.value}</p>
              <p className="mt-2 text-xs text-neutral-500">{c.note}</p>
            </div>
          ))}
        </div>
        <Link to="/pricing" className="mt-6 inline-flex items-center gap-1 font-bold text-dz-red">
          Full pricing and penalty rules <IconArrow size={16} />
        </Link>
      </Section>

      {/* FAQ */}
      <Section className="bg-neutral-50" eyebrow="Questions" title="Frequently asked">
        <div className="max-w-3xl">
          <FaqList items={GENERAL_FAQS.slice(0, 5)} />
          <Link to="/faq" className="mt-6 inline-flex items-center gap-1 font-bold text-dz-red">
            All questions <IconArrow size={16} />
          </Link>
        </div>
      </Section>

      <div className="pt-20">
        <CtaBand />
      </div>
    </>
  );
}
