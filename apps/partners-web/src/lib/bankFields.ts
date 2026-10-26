// Reads payout details off a cancelled cheque or a passbook's first page (text from a PDF or OCR).
// Pure — tested on its own. The cheque's MICR line (cheque no. · MICR code · short a/c · txn code) is not
// the account number, so we look for the labelled account number first.

export interface BankFields {
  accountNumber: string | null;
  ifsc: string | null;
  holderName: string | null;
  /** From the IFSC's first four letters, until the IFSC lookup gives the exact bank. */
  bankName: string | null;
  /** HIGH: labelled account number and a well-formed IFSC; LOW: something found, please check. */
  confidence: 'HIGH' | 'LOW' | 'NONE';
}

const BANKS: Record<string, string> = {
  SBIN: 'State Bank of India', HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank', CNRB: 'Canara Bank', BARB: 'Bank of Baroda', UBIN: 'Union Bank of India', IDIB: 'Indian Bank',
  IOBA: 'Indian Overseas Bank', BKID: 'Bank of India', MAHB: 'Bank of Maharashtra', UCBA: 'UCO Bank', CBIN: 'Central Bank of India',
  PSIB: 'Punjab & Sind Bank', YESB: 'Yes Bank', INDB: 'IndusInd Bank', FDRL: 'Federal Bank', KARB: 'Karnataka Bank',
  KVBL: 'Karur Vysya Bank', CIUB: 'City Union Bank', SIBL: 'South Indian Bank', TMBL: 'Tamilnad Mercantile Bank', IDFB: 'IDFC First Bank',
  AUBL: 'AU Small Finance Bank', RATN: 'RBL Bank', DBSS: 'DBS Bank India', BDBL: 'Bandhan Bank', ESFB: 'Equitas Small Finance Bank',
  UJVN: 'Ujjivan Small Finance Bank', DLXB: 'Dhanlaxmi Bank', JAKA: 'Jammu & Kashmir Bank', KVGB: 'Karnataka Vikas Grameena Bank',
  PYTM: 'Paytm Payments Bank', AIRP: 'Airtel Payments Bank', FINO: 'Fino Payments Bank', IPOS: 'India Post Payments Bank',
};

const toLetter: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A' };

function findIfsc(up: string) {
  const found: { code: string; near: boolean }[] = [];
  for (const m of up.matchAll(/\b([A-Z0-9]{4})[\s-]?([0O])[\s-]?([A-Z0-9]{6})\b/g)) {
    const code = [...m[1]].map((c) => toLetter[c] ?? c).join('') + '0' + m[3];
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) continue;
    const before = up.slice(Math.max(0, (m.index ?? 0) - 25), m.index ?? 0);
    found.push({ code, near: /IFS|RTGS|NEFT|BRANCH CODE/.test(before) });
  }
  // A known bank prefix beats a random 11-character word.
  return found.find((f) => f.near) ?? found.find((f) => BANKS[f.code.slice(0, 4)]) ?? found[0] ?? null;
}

function findAccount(up: string) {
  const joined = up.replace(/(\d)[ ](?=\d)/g, '$1');
  // OCR often reads the slash in "A/c" as l, I, 1 or | (the text is upper-cased here, so l → L).
  const labelled = /(?:A\s?[/LI1|]\s?C|ACCOUNT|ACCT|ACC|SB|CA|SAVINGS|CURRENT)\s*(?:NO|NUMBER|NUM|#)?\.?\s*[:\-.]?\s*(\d{9,18})\b/.exec(joined);
  if (labelled) return { value: labelled[1], sure: true };
  // No label: a 11–18 digit run that isn't on the MICR line (it has ⑈ ⑆ or "MICR") or a phone number.
  const lines = joined.split('\n').filter((l) => !/[⑈⑆⑇⑉"]|MICR|PH|MOB|TEL|CIN/.test(l));
  const runs = [...new Set(lines.flatMap((l) => l.match(/\b\d{11,18}\b/g) ?? []))];
  return runs.length === 1 ? { value: runs[0], sure: false } : null;
}

function cleanName(s: string) {
  const n = s
    .replace(/\s+/g, ' ')
    .replace(/\b(AUTHORI[SZ]ED|SIGNATOR(Y|IES)|PLEASE|SIGN|ABOVE|PROP(RIETOR)?\.?|PARTNER|DIRECTOR)\b.*$/i, '')
    .trim()
    .replace(/[.,:;\-/]+$/, '');
  return n.length >= 3 && /[A-Za-z]{3}/.test(n) ? n : null;
}

function findHolder(text: string) {
  const labelled = /(?:A\s?\/\s?C\s*HOLDER(?:'?S)?\s*NAME|ACCOUNT\s*HOLDER(?:'?S)?\s*(?:NAME)?|ACCOUNT\s*NAME|CUSTOMER\s*NAME|NAME\s*OF\s*(?:THE\s*)?(?:ACCOUNT\s*HOLDER|CUSTOMER)|^\s*NAME)\s*[:\-]\s*([A-Z][A-Za-z .&'/-]{2,60})/im.exec(text);
  if (labelled) return cleanName(labelled[1]);
  // Business cheques: "For MEGHANA FOODS PVT LTD" above the signature.
  const forLine = /^\s*FOR\s+([A-Z][A-Z0-9 .&'-]{2,60})\s*$/im.exec(text);
  if (forLine) return cleanName(forLine[1]);
  // Personal cheques print the name on the line just above "Please sign above" / "Authorised signatory".
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sig = lines.findIndex((l) => /PLEASE SIGN ABOVE|AUTHORI[SZ]ED SIGNATOR/i.test(l));
  if (sig > 0 && /^[A-Z][A-Z .&'-]{2,60}$/.test(lines[sig - 1])) return cleanName(lines[sig - 1]);
  return null;
}

export function extractBankFields(text: string): BankFields {
  const clean = text.replace(/\r/g, '').replace(/[|]/g, ' ');
  const up = clean.toUpperCase();
  const ifsc = findIfsc(up);
  const acc = findAccount(up);
  const holderName = findHolder(clean);
  const found = !!(ifsc || acc || holderName);
  return {
    accountNumber: acc?.value ?? null,
    ifsc: ifsc?.code ?? null,
    holderName,
    bankName: ifsc ? BANKS[ifsc.code.slice(0, 4)] ?? null : null,
    confidence: !found ? 'NONE' : acc?.sure && ifsc ? 'HIGH' : 'LOW',
  };
}
