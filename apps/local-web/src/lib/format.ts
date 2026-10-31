/** ₹ from paise: 12900 → "₹129", 12950 → "₹129.50". */
export const rupees = (paise: number) => {
  const r = paise / 100;
  return `₹${Number.isInteger(r) ? r.toLocaleString('en-IN') : r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const km = (n: number) => (n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`);

export interface Opening {
  /** 'today' | 'tomorrow' | short weekday in English ('Mon'…) */
  day: string;
  /** 'HH:MM', shop's local time */
  time: string;
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 'HH:MM' → "9:00 am" in the customer's language. */
export function clockLabel(hhmm: string, locale: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2024, 0, 7, h, m)).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

/** { day: 'tomorrow', time: '09:00' } → "tomorrow 9:00 am" in the customer's language. */
export function opensAtLabel(o: Opening, locale: string, today: string, tomorrow: string) {
  const time = clockLabel(o.time, locale);
  if (o.day === 'today') return `${today} ${time}`;
  if (o.day === 'tomorrow') return `${tomorrow} ${time}`;
  // 7 Jan 2024 was a Sunday.
  const wd = WEEKDAY_INDEX[o.day];
  const day = wd == null ? o.day : new Date(Date.UTC(2024, 0, 7 + wd)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
  return `${day} ${time}`;
}
