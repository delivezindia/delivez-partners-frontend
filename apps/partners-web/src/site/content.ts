import {
  IconBasket,
  IconBell,
  IconBike,
  IconBox,
  IconCart,
  IconChart,
  IconChat,
  IconClock,
  IconDoc,
  IconGlobe,
  IconMap,
  IconPill,
  IconQr,
  IconRupee,
  IconShield,
  IconSpark,
  IconStore,
  IconFlask,
  IconUsers,
  IconUtensils,
} from './icons';

// Public-site copy. Facts mirror the implementation plan (commercials, rules, onboarding flows);
// "soon" marks features that are planned but not yet live.

/** Contact details shown on the site — replace with the real Delivez partner-support channels. */
export const CONTACT = {
  email: 'partners@delivez.com',
  whatsapp: '', // e.g. '+91 98xxxxxxx' — hidden until set
  phone: '', // hidden until set
  city: 'Bengaluru',
  hours: 'Mon–Sat, 9 am – 9 pm',
};

export type ServiceSlug = 'restaurants' | 'grocery' | 'pharmacy' | 'diagnostics' | 'local-stores' | 'vendors';

export interface Service {
  slug: ServiceSlug;
  name: string;
  short: string;
  tagline: string;
  intro: string;
  icon: typeof IconUtensils;
  accent: string; // tailwind bg class for the icon tile
  storeTypes: string[];
  minutes: string;
  steps: string[];
  requirements: { label: string; required: boolean; note?: string }[];
  features: { title: string; body: string; icon: typeof IconUtensils; soon?: boolean }[];
  faqs: { q: string; a: string }[];
}

export const SERVICES: Service[] = [
  {
    slug: 'restaurants',
    name: 'Restaurants & cloud kitchens',
    short: 'Restaurants',
    tagline: 'Your kitchen, delivered across the neighbourhood.',
    intro:
      'Take delivery and pickup orders on a screen built for busy kitchens: big buttons, loud alerts and a Ready Soon signal that brings the rider to your counter just in time.',
    icon: IconUtensils,
    accent: 'bg-red-50 text-dz-red',
    storeTypes: ['Restaurant', 'Cloud kitchen', 'Takeaway counter'],
    minutes: '15 minutes',
    steps: ['Restaurant details', 'Location & hours', 'Documents', 'Menu', 'Prep time', 'Bank account', 'Commercials', 'Agreements', 'Review & submit'],
    requirements: [
      { label: 'FSSAI licence', required: true, note: 'You can upload it after you start — we never block your setup on paperwork' },
      { label: 'Bank account or cancelled cheque', required: false, note: 'Needed before your first payout' },
      { label: 'GST certificate', required: false },
      { label: 'At least 5 menu items', required: false, note: 'Needed to go fully live' },
    ],
    features: [
      { icon: IconBell, title: 'Orders you can’t miss', body: 'New orders ring and vibrate until someone taps Accept. Set prep time with one tap.' },
      { icon: IconClock, title: 'Ready Soon signal', body: 'Tell the rider to start coming 3–15 minutes before food is ready — no waiting charges while it’s on.' },
      { icon: IconQr, title: 'Verified handover', body: 'Riders collect with an OTP or QR code, so “wrong parcel” disputes are settled by proof.' },
      { icon: IconSpark, title: 'Busy mode & delays', body: 'Switch to Busy at peak or add 5–10 minutes to an order with a reason — customers see an honest ETA.' },
      { icon: IconShield, title: 'Fair from day one', body: 'Penalties are waived for your first 100 orders and only ever apply to repeated hard delays.' },
      { icon: IconChart, title: 'AI prep-time suggestions', body: 'Suggestions based on your items and kitchen load. You always choose.', soon: true },
    ],
    faqs: [
      { q: 'Do I need an FSSAI licence to start?', a: 'You need one to go live, but you can start registration and upload it later. Our compliance team verifies documents in parallel.' },
      { q: 'Who delivers my orders?', a: 'Delivez-managed riders. You can also offer customer pickup from your counter.' },
      { q: 'Can I add packaging charges?', a: 'Yes. You set a packaging charge per order; it is added to the customer bill and paid to you.' },
    ],
  },
  {
    slug: 'grocery',
    name: 'Grocery, kirana & supermarkets',
    short: 'Grocery',
    tagline: 'Your shelves, online in an afternoon.',
    intro:
      'List your products with stock levels, and let Delivez handle discovery, payments and delivery. Low-stock alerts and substitutions keep orders moving.',
    icon: IconBasket,
    accent: 'bg-green-50 text-green-700',
    storeTypes: ['Kirana store', 'Supermarket', 'Grocery & fresh'],
    minutes: '20 minutes',
    steps: ['Eligibility', 'Store details', 'Location & hours', 'Documents', 'Products', 'Operations', 'Bank & payouts', 'Commercials', 'Agreements', 'Quick training', 'Review & submit'],
    requirements: [
      { label: 'FSSAI licence', required: true },
      { label: 'Open at least 6 hours a day', required: true },
      { label: 'GST certificate', required: false, note: 'If applicable' },
      { label: 'Products with stock', required: false, note: '50+ products to go fully live; fewer is a soft launch' },
    ],
    features: [
      { icon: IconBox, title: 'Stock that stays honest', body: 'Stock is held when an order is placed and released if it’s cancelled, so customers only see what you have.' },
      { icon: IconDoc, title: 'Bulk upload', body: 'Paste rows from Excel or Google Sheets — name, price, category and stock — and fix errors before saving.' },
      { icon: IconBell, title: 'Low-stock alerts', body: 'Get a nudge before a best-seller runs out.' },
      { icon: IconUsers, title: 'Substitutions', body: 'Out of an item? Offer a substitute — the customer approves it in the app.' },
      { icon: IconClock, title: 'Capacity control', body: 'Set a maximum orders per hour; we switch you to Busy and pause new orders when you’re overloaded.' },
      { icon: IconSpark, title: 'Barcode scanning', body: 'Update stock by scanning products with your phone camera.', soon: true },
    ],
    faqs: [
      { q: 'Do I have to list every product?', a: 'No. Start with your best-sellers. Stores with 50+ products in stock go fully live; smaller catalogues start in soft launch.' },
      { q: 'What if a customer orders something I’ve run out of?', a: 'Mark it unavailable and, if you allow substitutions, offer an alternative for the customer to approve.' },
      { q: 'Can customers pick up instead?', a: 'Yes — turn on pickup and customers collect with a pickup OTP.' },
    ],
  },
  {
    slug: 'pharmacy',
    name: 'Licensed pharmacies',
    short: 'Pharmacy',
    tagline: 'Medicine delivery, the compliant way.',
    intro:
      'Every prescription order is reviewed by your registered pharmacist before anything leaves the counter. Delivez keeps the audit trail — prescription, pharmacist, timestamp and consent — for every order.',
    icon: IconPill,
    accent: 'bg-blue-50 text-blue-700',
    storeTypes: ['Retail pharmacy', 'Pharmacy chain', 'Hospital pharmacy'],
    minutes: '30–60 minutes',
    steps: ['Requirements', 'Pharmacy details', 'Location & hours', 'Licences & documents', 'Registered pharmacist', 'Medicines', 'Prescription rules', 'Bank & settlement', 'Commercials', 'Agreements', 'Training & quiz', 'Go-live checklist'],
    requirements: [
      { label: 'Drug licence — Form 20', required: true },
      { label: 'Drug licence — Form 21', required: true },
      { label: 'Registered pharmacist + registration certificate', required: true },
      { label: 'Address proof', required: true },
      { label: 'GST certificate', required: false },
    ],
    features: [
      { icon: IconDoc, title: 'Pharmacist-in-the-loop', body: 'Prescriptions arrive in a review queue. Your pharmacist maps each medicine, sets quantities and approves, asks for clarification, or rejects.', soon: true },
      { icon: IconShield, title: 'Schedule rules built in', body: 'Schedule H and H1 always need a prescription. Schedule X can never be listed or sold.' },
      { icon: IconMap, title: 'State drug rules', body: 'Rules such as cash-on-delivery for prescription orders follow the state of the delivery address.' },
      { icon: IconClock, title: 'On-duty hours', body: 'Prescription orders are only routed to you while a registered pharmacist is on duty.' },
      { icon: IconRupee, title: 'Faster settlement', body: 'Weekly settlement by default, with T+1 available for pharmacies.' },
      { icon: IconUsers, title: 'Short training & quiz', body: 'A quick compliance quiz and a practice order before you go live.' },
    ],
    faqs: [
      { q: 'Can I go live before my licences are verified?', a: 'No. Pharmacies go live only after drug licences are verified and an active registered pharmacist is on file.' },
      { q: 'Who checks the prescription?', a: 'Your registered pharmacist. No prescription order is created without their approval.' },
      { q: 'Are prescription medicines returnable?', a: 'No. Prescription orders are non-returnable after delivery; refunds are limited to non-delivery.' },
    ],
  },
  {
    slug: 'diagnostics',
    name: 'Diagnostic labs',
    short: 'Diagnostics',
    tagline: 'Lab tests booked online — from certified labs only.',
    intro:
      'NABL-accredited pathology labs list their tests and health packages with prices, fasting and report times. Offer home sample collection, walk-in, or both. Tests that need a doctor’s prescription can only be booked with one.',
    icon: IconFlask,
    accent: 'bg-teal-50 text-teal-700',
    storeTypes: ['Diagnostic lab', 'Lab chain', 'Hospital lab'],
    minutes: 'about 20 minutes',
    steps: ['Requirements', 'Lab details', 'Location & hours', 'Licences & accreditation', 'Pathologist', 'Tests & packages', 'Sample collection', 'Bank & settlement', 'Commercials', 'Agreements', 'Go-live checklist'],
    requirements: [
      { label: 'NABL accreditation certificate', required: true },
      { label: 'Clinical establishment registration (KPME in Karnataka)', required: true },
      { label: 'Pathologist and their medical council registration', required: true },
      { label: 'Address proof', required: true },
      { label: 'GST certificate', required: false },
    ],
    features: [
      { icon: IconShield, title: 'Certified labs only', body: 'Labs go live only after NABL accreditation, state registration and the pathologist’s registration are verified by our team.' },
      { icon: IconDoc, title: 'Prescription-only tests', body: 'Mark any test as “doctor’s prescription required”. Customers upload the prescription when booking and your lab checks it before collecting the sample.' },
      { icon: IconMap, title: 'Home collection or walk-in', body: 'Choose per test. Set your collection radius and home collection fee.' },
      { icon: IconClock, title: 'Fasting & report times', body: 'Each test shows its sample type, fasting needed and when the report will be ready.' },
      { icon: IconBox, title: 'Bulk upload your test menu', body: 'Import tests and packages from a spreadsheet in one go.' },
      { icon: IconUsers, title: 'Bookings & secure reports', body: 'Booking slots, sample tracking and pathologist-signed reports shared securely with the customer.', soon: true },
    ],
    faqs: [
      { q: 'Can a lab without NABL accreditation join?', a: 'No. Only NABL-accredited labs with a registered pathologist who signs reports can list tests on Delivez.' },
      { q: 'Who decides which tests need a prescription?', a: 'Your lab marks each test. Customers can’t book those tests without uploading a doctor’s prescription.' },
      { q: 'Do I have to offer home collection?', a: 'No. Offer home collection, walk-in or both — per test.' },
    ],
  },
  {
    slug: 'local-stores',
    name: 'Local stores',
    short: 'Local stores',
    tagline: 'From flowers to phone chargers — sell to your neighbourhood.',
    intro:
      'Bakeries, meat & fish, flowers, electronics, clothing, beauty, home, baby, pet and printing shops. Offer delivery, or keep it pickup-only — your choice.',
    icon: IconStore,
    accent: 'bg-amber-50 text-amber-700',
    storeTypes: ['Bakery', 'Meat & fish', 'Flowers', 'Electronics', 'Clothing', 'Beauty & wellness', 'Home & lifestyle', 'Baby care', 'Pet care', 'Printing'],
    minutes: '20 minutes',
    steps: ['Eligibility', 'Store details', 'Location & hours', 'Documents', 'Products', 'Operations', 'Bank & payouts', 'Commercials', 'Agreements', 'Quick training', 'Review & submit'],
    requirements: [
      { label: 'FSSAI licence', required: false, note: 'Only for food categories such as bakery, meat & fish' },
      { label: 'Open at least 6 hours a day', required: true },
      { label: 'GST certificate', required: false, note: 'If applicable' },
      { label: 'At least 10 products', required: false, note: 'Needed to go fully live' },
    ],
    features: [
      { icon: IconBike, title: 'Delivery or pickup-only', body: 'Use Delivez riders, or let customers collect from your shop with a pickup OTP.' },
      { icon: IconSpark, title: 'Soft launch', body: 'Readiness 60–79? Go live in a 2 km radius with a “New on Delivez” badge while you finish setup.' },
      { icon: IconDoc, title: 'Catalogue in minutes', body: 'Add products one by one or paste a list from Excel.' },
      { icon: IconChart, title: 'Simple analytics', body: 'Orders, top items and on-time performance at a glance.', soon: true },
    ],
    faqs: [
      { q: 'I don’t sell food. Do I need FSSAI?', a: 'No. FSSAI is only needed for food categories such as bakery, meat and fish.' },
      { q: 'Can I sell without delivery?', a: 'Yes — pickup-only stores are allowed.' },
    ],
  },
  {
    slug: 'vendors',
    name: 'Street & society vendors',
    short: 'Vendors',
    tagline: 'No shop? No problem.',
    intro:
      'Vegetable carts, home chefs and society vendors can sign up in six short steps with just a phone number and a UPI ID.',
    icon: IconCart,
    accent: 'bg-purple-50 text-purple-700',
    storeTypes: ['Street vendor', 'Society vendor'],
    minutes: '10 minutes',
    steps: ['Your details', 'Location & hours', 'What you sell', 'UPI for payouts', 'Agreement', 'Submit'],
    requirements: [
      { label: 'Mobile number', required: true },
      { label: 'UPI ID for payouts', required: false, note: 'Needed before your first payout' },
      { label: 'Trade licence / FSSAI', required: false, note: 'If applicable' },
    ],
    features: [
      { icon: IconRupee, title: 'UPI payouts', body: 'Get paid straight to your UPI ID — no current account needed.' },
      { icon: IconUsers, title: 'Deliver inside your society', body: 'Self-delivery within your society is allowed; switch to Delivez riders any time.' },
      { icon: IconChat, title: 'WhatsApp ordering', body: 'Customers order from your WhatsApp catalogue; you manage everything from the same Orders screen.', soon: true },
    ],
    faqs: [
      { q: 'Do I need GST or a company?', a: 'No. Vendors register as individuals; GST is not required.' },
      { q: 'Can I sign up on WhatsApp?', a: 'WhatsApp sign-up is coming soon. For now, register on the web — it takes about 10 minutes.' },
    ],
  },
];

export const serviceBySlug = (slug: string | undefined) => SERVICES.find((s) => s.slug === slug);

export const PLATFORM_FEATURES = [
  { icon: IconBike, title: 'Delivez riders', body: 'A managed, accountable rider fleet picks up and delivers. Live tracking for you and your customer.' },
  { icon: IconRupee, title: 'Weekly payouts', body: 'Settlements every week straight to your verified bank account or UPI, with a clear statement.' },
  { icon: IconShield, title: 'Fair, explainable penalties', body: 'Only repeated hard delays count. Every penalty shows the evidence and can be disputed within 48 hours.' },
  { icon: IconGlobe, title: '8 Indian languages', body: 'English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi and Bengali.' },
  { icon: IconUsers, title: 'Staff roles', body: 'Owner, manager, kitchen lead, counter staff, pharmacist and accountant — each sees only what they need.' },
  { icon: IconChat, title: 'WhatsApp first', body: 'Order alerts and updates on WhatsApp. Sign-up and ordering on WhatsApp coming soon.' },
];

export const ORDER_FLOW = [
  { state: 'New order', colour: 'bg-white ring-2 ring-dz-black', body: 'Your tablet rings. Accept within 3 minutes and confirm the prep time.' },
  { state: 'Preparing', colour: 'bg-state-preparing', body: 'Cook or pack. Need more time? Tap Delay with a reason.' },
  { state: 'Ready soon', colour: 'bg-state-almost', body: 'Signal the rider to start coming. No waiting charges while the window is on.' },
  { state: 'Order ready', colour: 'bg-state-ready', body: 'Packed and sealed at the counter. The rider shows an OTP or QR to collect.' },
  { state: 'Delivered', colour: 'bg-state-picked', body: 'The customer confirms with a delivery OTP. The sale lands in your weekly payout.' },
];

export const ONBOARDING_FLOW = [
  { title: 'Log in with your phone', body: 'One OTP — no passwords.' },
  { title: 'Tell us about your business', body: 'Pick your business type; the steps adapt to it.' },
  { title: 'Pin your shop & add items', body: 'Drop a pin on the map, set your hours, add your menu or products.' },
  { title: 'Upload documents', body: 'Take photos of your licences. Pending documents never block your setup.' },
  { title: 'Get verified & go live', body: 'Our team reviews within 24 hours. Readiness 80+ goes live; 60–79 soft-launches.' },
];

export const COMMERCIALS = [
  { label: 'Commission', value: '0%', note: 'Launch offer — no commission on your sales' },
  { label: 'Payouts', value: 'Weekly', note: 'Every Monday to your verified account. T+1 available for pharmacies.' },
  { label: 'Delivery fee', value: 'Paid by customer', note: 'You can choose to sponsor delivery later' },
  { label: 'Packaging', value: 'Your price', note: 'Restaurants set a packaging charge that is paid to them' },
  { label: 'Onboarding', value: 'Free', note: 'No sign-up or listing fees' },
];

export const PENALTY_RULES = [
  'Your first 100 delivered orders are penalty-free.',
  'Soft delays (up to 7 minutes) never cause a penalty.',
  'A penalty needs three things: a recorded incident you controlled, a hard breach (more than 7 minutes late), and no exemption such as rain, a platform delay or an admin override.',
  'Amounts: ₹50 for the first hard breach of the day, ₹100 for repeats the same day, ₹250 if there were 5+ in the last 7 days.',
  'Daily cap: the lower of 10% of that day’s payout or ₹2,000.',
  'Every penalty is first proposed with a plain-English explanation. You have 48 hours to dispute it before it applies.',
];

export const GENERAL_FAQS = [
  { q: 'How long does registration take?', a: 'About 15 minutes for most restaurants and stores, 30–60 minutes for pharmacies. You can stop and continue any time.' },
  { q: 'What does it cost?', a: 'Registration is free and commission is 0% during the launch offer. Delivery fees are paid by the customer.' },
  { q: 'When do I get paid?', a: 'Weekly, every Monday, straight to your verified bank account or UPI ID, with a downloadable statement.' },
  { q: 'Do I need a tablet?', a: 'Any Android phone, tablet or computer with a browser works. The Partners app for Android is on the way.' },
  { q: 'Which cities are live?', a: 'We are starting in Bengaluru (Indiranagar, HSR Layout and Koramangala) and expanding zone by zone. You can register from anywhere nearby and go live when your area launches.' },
  { q: 'What if my documents are still pending?', a: 'You can keep setting up. Stores with pending documents can soft-launch (LIMITED) while compliance verifies them — except pharmacies, which need verified licences first.' },
  { q: 'Can I manage several outlets?', a: 'Yes. One partner account can own many outlets, with an outlet switcher and staff access per outlet.' },
  { q: 'Who delivers the orders?', a: 'Delivez-managed riders. You can also offer customer pickup, and society vendors can self-deliver.' },
];
