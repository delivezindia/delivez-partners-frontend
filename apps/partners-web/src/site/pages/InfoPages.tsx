import { Link } from 'react-router-dom';
import { COMMERCIALS, CONTACT, GENERAL_FAQS, ONBOARDING_FLOW, ORDER_FLOW, PENALTY_RULES, SERVICES } from '../content';
import { CheckList, CtaBand, FaqList, OrderCardMock, PageHero, RegisterButton, Section } from '../components';
import { IconArrow, IconChat, IconClock, IconMail, IconPhone, IconRupee } from '../icons';

export function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="How it works" title="From sign-up to your first payout" intro="Register in minutes, take orders on any phone or tablet, and get paid every week." />

      <Section eyebrow="1 · Join" title="Register and get verified">
        <ol className="grid gap-4 md:grid-cols-5">
          {ONBOARDING_FLOW.map((s, i) => (
            <li key={s.title} className="rounded-2xl p-5 ring-1 ring-neutral-200">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dz-yellow font-extrabold">{i + 1}</span>
              <p className="mt-4 font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { score: '80+', title: 'Live', body: 'Visible to every customer in your delivery radius.' },
            { score: '60–79', title: 'Soft launch', body: '“New on Delivez” badge and a 2 km radius while you finish setup.' },
            { score: 'Below 60', title: 'Finish setup', body: 'We show exactly what is missing, with one-tap links to fix it.' },
          ].map((g) => (
            <div key={g.title} className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-sm text-neutral-500">Readiness {g.score}</p>
              <p className="text-xl font-extrabold">{g.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{g.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-neutral-50" eyebrow="2 · Sell" title="Take orders on one simple screen">
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
          <div className="space-y-4">
            <div className="flex justify-center rounded-3xl bg-white p-8 ring-1 ring-neutral-200">
              <OrderCardMock />
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
              <p className="font-bold">Rider waiting time is fair</p>
              <p className="mt-1 text-sm text-neutral-600">
                The waiting timer only starts if a rider arrives after your Ready Soon window. The first 10 minutes are free; after that ₹2 a minute, capped at ₹30 an order.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="3 · Get paid" title="Weekly payouts, clear statements">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: IconRupee, title: 'Every Monday', body: 'Your sales for the week, minus any refunds or applied penalties, straight to your verified account.' },
            { icon: IconClock, title: 'T+1 for pharmacies', body: 'Pharmacies can choose next-day settlement.' },
            { icon: IconChat, title: 'Statement for every payout', body: 'Order-by-order breakdown and a bank reference (UTR) for each payment.' },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <c.icon size={26} className="text-dz-red" />
              <p className="mt-3 font-bold">{c.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

export function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing & payouts" title="Simple, transparent commercials" intro="No sign-up fee, 0% commission during our launch offer, and weekly payouts.">
        <div className="mt-8">
          <RegisterButton />
        </div>
      </PageHero>

      <Section title="What you pay">
        <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-200">
          {COMMERCIALS.map((c, i) => (
            <div key={c.label} className={`flex flex-wrap items-center justify-between gap-3 px-6 py-5 ${i % 2 ? 'bg-neutral-50' : 'bg-white'}`}>
              <span className="font-semibold">{c.label}</span>
              <span className="text-right">
                <span className="block text-xl font-extrabold">{c.value}</span>
                <span className="block text-sm text-neutral-500">{c.note}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-500">GST applies as per law and is shown separately on every invoice. Commercials may change after the launch offer; you'll always review and accept updated terms before they apply.</p>
      </Section>

      <Section className="bg-neutral-50" eyebrow="Penalties" title="Fair and explainable — never a surprise" intro="Penalties exist only to protect customers from repeated long delays. Here are the exact rules.">
        <div className="grid gap-10 lg:grid-cols-2">
          <CheckList items={PENALTY_RULES} />
          <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
            <p className="font-bold">Example</p>
            <p className="mt-2 text-sm text-neutral-600">
              You accepted an order with 25 minutes prep. It was ready after 34 minutes — 9 minutes late, which is a hard breach. It's your third hard breach today, so the proposal is ₹100.
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              You get a notification with the order timeline and the maths. If the delay wasn't your fault — say the rider arrived late — tap <b>Dispute</b> within 48 hours.
            </p>
            <p className="mt-3 text-sm text-neutral-600">Not charged: soft delays, rain or other force majeure, delays caused by Delivez, and anything in your first 100 orders.</p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

export function Faq() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions partners ask us" />
      <Section title="General">
        <div className="max-w-3xl">
          <FaqList items={GENERAL_FAQS} />
        </div>
      </Section>
      {SERVICES.map((s, i) => (
        <Section key={s.slug} className={i % 2 === 0 ? 'bg-neutral-50' : ''} title={s.name}>
          <div className="max-w-3xl">
            <FaqList items={s.faqs} />
            <Link to={`/services/${s.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-dz-red">
              More about {s.short.toLowerCase()} <IconArrow size={16} />
            </Link>
          </div>
        </Section>
      ))}
      <CtaBand title="Still have a question?" body="Our partner team is happy to help you get set up." />
    </>
  );
}

export function Contact() {
  const channels = [
    { icon: IconMail, title: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    ...(CONTACT.whatsapp ? [{ icon: IconChat, title: 'WhatsApp', value: CONTACT.whatsapp, href: `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}` }] : []),
    ...(CONTACT.phone ? [{ icon: IconPhone, title: 'Phone', value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` }] : []),
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to the Delivez partner team" intro={`We're here ${CONTACT.hours}. Already a partner? Raise a ticket from your dashboard for the fastest help.`} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {channels.map((c) => (
            <a key={c.title} href={c.href} className="rounded-2xl p-6 ring-1 ring-neutral-200 transition hover:shadow-md">
              <c.icon size={28} className="text-dz-red" />
              <p className="mt-3 text-sm text-neutral-500">{c.title}</p>
              <p className="text-lg font-bold">{c.value}</p>
            </a>
          ))}
          <div className="rounded-2xl bg-dz-black p-6 text-white">
            <p className="text-lg font-bold">Ready to start?</p>
            <p className="mt-1 text-sm text-neutral-300">Most partners finish registration in about 15 minutes.</p>
            <RegisterButton className="mt-5 w-full" />
          </div>
        </div>
        <div className="mt-10 rounded-2xl bg-neutral-50 p-6">
          <p className="font-bold">Where we operate</p>
          <p className="mt-1 text-neutral-600">
            {CONTACT.city}: Indiranagar, HSR Layout and Koramangala, expanding zone by zone. Outside these areas? Register anyway — you'll go live as soon as we launch near you.
          </p>
        </div>
      </Section>
    </>
  );
}
