// Reads the useful fields out of a document's text (from a digital PDF or OCR): the document number and the
// issue / expiry dates. Pure — no browser APIs — so it can be tested on its own. Indian formats (dd/mm/yyyy).

export interface DocFields {
  documentNumber: string | null;
  issuedAt: string | null; // YYYY-MM-DD
  expiresAt: string | null; // YYYY-MM-DD
  /** HIGH: the number passed a format/checksum check. LOW: found, but please check. */
  confidence: 'HIGH' | 'LOW' | 'NONE';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// ---------------------------------------------------------------- dates

interface FoundDate {
  iso: string;
  index: number;
  end: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
function toIso(y: number, m: number, d: number) {
  if (y < 100) y += y > 50 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1950 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null; // 31/02 etc.
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function findDates(text: string): FoundDate[] {
  const out: FoundDate[] = [];
  const push = (iso: string | null, m: RegExpExecArray) => iso && out.push({ iso, index: m.index, end: m.index + m[0].length });
  let m: RegExpExecArray | null;
  const numeric = /\b(\d{1,2})\s?[./-]\s?(\d{1,2})\s?[./-]\s?(\d{4}|\d{2})\b/g; // dd/mm/yyyy (India)
  while ((m = numeric.exec(text))) push(toIso(+m[3], +m[2], +m[1]), m);
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text))) push(toIso(+m[1], +m[2], +m[3]), m);
  const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?[\s.,-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s.,-]*(\d{4})\b/gi;
  while ((m = dayMonth.exec(text))) push(toIso(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]), m);
  const monthDay = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi;
  while ((m = monthDay.exec(text))) push(toIso(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]), m);
  return out.sort((a, b) => a.index - b.index);
}

// "Validity from …" is a start date (GST registrations, for example, never expire).
const EXPIRY_WORDS = /valid\s*(?:up\s*to|upto|till|until|thru|through)|validity(?!\s*(?:from|period\s*from))|date\s*of\s*expiry|expiry\s*date|expires?\s*on|expiry|renewal\s*(?:due|date)|valid\s*up/gi;
const ISSUE_WORDS = /validity\s*from|date\s*of\s*issue|issue\s*date|issued\s*on|date\s*of\s*registration|registered\s*on|date\s*of\s*grant|valid\s*from|w\.?e\.?f\.?/gi;

/** The first date that follows one of the keywords closely (same line or the next one). */
function dateAfter(text: string, words: RegExp, dates: FoundDate[]) {
  words.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = words.exec(text))) {
    const from = m.index + m[0].length;
    const hit = dates.find((d) => d.index >= from && d.index - from <= 60);
    if (hit) return hit.iso;
  }
  return null;
}

export function findValidity(text: string, today = new Date().toISOString().slice(0, 10)) {
  const dates = findDates(text);
  // "Valid from 01/04/2024 to 31/03/2029" / "Period: 01.04.2024 - 31.03.2029"
  for (let i = 0; i < dates.length - 1; i++) {
    const between = text.slice(dates[i].end, dates[i + 1].index);
    if (/^\s*(?:to|till|until|upto|up to|-|–|—)\s*$/i.test(between) && dates[i].iso < dates[i + 1].iso) {
      return { issuedAt: dates[i].iso, expiresAt: dates[i + 1].iso };
    }
  }
  let expiresAt = dateAfter(text, EXPIRY_WORDS, dates);
  let issuedAt = dateAfter(text, ISSUE_WORDS, dates);
  if (issuedAt && expiresAt && issuedAt > expiresAt) [issuedAt, expiresAt] = [expiresAt, issuedAt];
  // No wording at all: a licence with two or more dates usually ends with the latest future one.
  if (!expiresAt && dates.length >= 2) {
    const future = dates.filter((d) => d.iso > today).sort((a, b) => b.iso.localeCompare(a.iso));
    if (future[0] && future[0].iso !== issuedAt) expiresAt = future[0].iso;
  }
  return { issuedAt, expiresAt };
}

// ---------------------------------------------------------------- numbers

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** GSTIN check digit (mod-36 Luhn variant used by GSTN). */
export function gstinValid(g: string) {
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GST_CHARS.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36] === g[14];
}

// OCR confuses look-alike characters; fix them by position (digit slot vs letter slot).
const toDigit: Record<string, string> = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6', T: '7' };
const toLetter: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '7': 'T' };
function fixByShape(raw: string, shape: string) {
  return [...raw]
    .map((c, i) => (shape[i] === 'D' ? toDigit[c] ?? c : shape[i] === 'L' ? toLetter[c] ?? c : c))
    .join('');
}

function findGstin(text: string) {
  const up = text.toUpperCase();
  const candidates: string[] = [...(up.match(/\b[0-9A-Z]{15}\b/g) ?? [])];
  // Also catch numbers broken by spaces: "29 ABCDE 1234 F1Z5".
  for (const m of up.matchAll(/\b(\d{2}\s?[A-Z0-9]{5}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4})\b/g)) candidates.push(m[1].replace(/\s/g, ''));
  let loose: string | null = null;
  for (const c of candidates) {
    // Digits/letters fixed by position; the 14th character is always "Z"; the check character stays as read.
    const fixed = fixByShape(c, 'DDLLLLLDDDDL???');
    const g = fixed.slice(0, 13) + 'Z' + fixed[14];
    if (gstinValid(g)) return { value: g, sure: true };
    if (/^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z][Z2][0-9A-Z]$/.test(fixed)) loose ??= fixed.slice(0, 13) + 'Z' + fixed[14];
  }
  return loose ? { value: loose, sure: false } : null;
}

function findPan(text: string) {
  const up = text.toUpperCase();
  for (const c of up.match(/\b[0-9A-Z]{10}\b/g) ?? []) {
    const p = fixByShape(c, 'LLLLLDDDDL');
    if (/^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/.test(p)) return { value: p, sure: true };
  }
  return null;
}

function findFssai(text: string) {
  // Digits are often printed or read with spaces: "1 0 0 1 2 …".
  const joined = text.replace(/(\d)[ \t](?=\d)/g, '$1');
  const near = /(licen[cs]e|registration|reg\.?|fssai)\s*(?:no|number|nos)?\.?\s*[:\-]?\s*([12]\d{13})\b/i.exec(joined);
  if (near) return { value: near[2], sure: true };
  const any = /\b[12]\d{13}\b/.exec(joined);
  return any ? { value: any[0], sure: true } : null;
}

function findNabl(text: string) {
  const m = /\b(MC|MT|TC|CC|PT|RM)\s?-?\s?(\d{3,5})\b/.exec(text.toUpperCase());
  return m ? { value: `${m[1]}-${m[2]}`, sure: true } : null;
}

/** A number written after a label like "Licence No.", "Reg. No:", "Certificate Number". */
function labelled(text: string, labels: string, prefer?: RegExp) {
  const re = new RegExp(`(?:${labels})\\s*(?:no|number|nos|num)?\\.?\\s*[:\\-.]?\\s*((?=[A-Z/\\-.]*\\d)[A-Z0-9][A-Z0-9/\\-.]{2,30}(?:[ ][A-Z0-9/\\-]{2,12})?)`, 'gi');
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = m[1].trim().replace(/[.\-/]+$/, '').toUpperCase();
    // Must contain a digit and not be a date.
    if (/\d/.test(v) && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(v) && v.length >= 3) found.push(v);
  }
  return (prefer && found.find((v) => prefer.test(v))) ?? found[0] ?? null;
}

export function findNumber(type: string, text: string): { value: string; sure: boolean } | null {
  switch (type) {
    case 'GSTIN':
      return findGstin(text);
    case 'PAN':
      return findPan(text);
    case 'FSSAI':
      return findFssai(text);
    case 'NABL_CERTIFICATE':
      return findNabl(text) ?? wrap(labelled(text, 'certificate|accreditation'));
    case 'DRUG_LICENSE_DL20':
      return wrap(labelled(text, 'licen[cs]e|lic\\.?|d\\.?\\s?l\\.?|form[\\s-]?20[a-z]?', /(^|\D)20[A-Z]?(\D|$)/));
    case 'DRUG_LICENSE_DL21':
      return wrap(labelled(text, 'licen[cs]e|lic\\.?|d\\.?\\s?l\\.?|form[\\s-]?21[a-z]?', /(^|\D)21[A-Z]?(\D|$)/));
    case 'PHARMACIST_REGISTRATION':
    case 'PATHOLOGIST_REGISTRATION':
      return wrap(labelled(text, 'registration|regn\\.?|reg\\.?'));
    default:
      return wrap(labelled(text, 'licen[cs]e|registration|certificate|regn\\.?|reg\\.?|lic\\.?'));
  }
}
const wrap = (v: string | null) => (v ? { value: v, sure: false } : null);

export function extractDocFields(type: string, text: string, today?: string): DocFields {
  const clean = text.replace(/\r/g, '').replace(/[|]/g, ' ');
  const num = findNumber(type, clean);
  const { issuedAt, expiresAt } = findValidity(clean, today);
  return {
    documentNumber: num?.value ?? null,
    issuedAt,
    expiresAt,
    confidence: num ? (num.sure ? 'HIGH' : 'LOW') : issuedAt || expiresAt ? 'LOW' : 'NONE',
  };
}
