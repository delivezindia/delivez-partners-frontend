/** ₹ from paise: 12900 → "₹129", 12950 → "₹129.50". */
export const rupees = (paise: number) => {
  const r = paise / 100;
  return `₹${Number.isInteger(r) ? r.toLocaleString('en-IN') : r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const km = (n: number) => (n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`);

/** "10:30 am" in India time, prefixed with the day when it isn't today. */
export function opensAtLabel(iso: string, locale: string, today: string, tomorrow: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const now = new Date();
  if (day(d) === day(now)) return `${today} ${time}`;
  if (day(d) === day(new Date(now.getTime() + 86_400_000))) return `${tomorrow} ${time}`;
  return `${d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'Asia/Kolkata' })} ${time}`;
}
