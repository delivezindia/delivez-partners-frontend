import { api } from './api';
import { printHtml } from './orders';

export interface Invoice {
  kind: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  number: string;
  date: string;
  store: { name: string; legalName: string; address: string; state: string | null; phone: string | null; gstin: string | null; fssai: string | null; drugLicences: string[] };
  customer: string;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  payment: string;
  status: string;
  bill: {
    registered: boolean;
    rows: { name: string; hsn: string | null; qty: number; ratePct: number; total: number; taxable: number; cgst: number; sgst: number }[];
    byRate: { ratePct: number; taxable: number; cgst: number; sgst: number; total: number }[];
    taxable: number;
    cgst: number;
    sgst: number;
    total: number;
  };
  delivery: number;
  discount: number;
  grandTotal: number;
}

export const fetchInvoice = (storeId: string, orderId: string) => api<Invoice>(`/partners/stores/${storeId}/reports/invoice/${orderId}`);

const rs = (p: number) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Customer bill on an 80 mm receipt printer (also fine on A4). Bills stay in English, like GST invoices. */
export function printBill(inv: Invoice) {
  const tax = inv.kind === 'TAX_INVOICE';
  const when = new Date(inv.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const rows = inv.bill.rows
    .map((r) => `<tr><td>${esc(r.name)}${r.hsn ? `<div class="m">HSN ${esc(r.hsn)}${tax ? ` · GST ${r.ratePct}%` : ''}</div>` : tax ? `<div class="m">GST ${r.ratePct}%</div>` : ''}</td><td class="n">${r.qty}</td><td class="n">${rs(r.total)}</td></tr>`)
    .join('');
  const taxRows = tax
    ? `<table class="t"><tr><th>GST %</th><th class="n">Taxable</th><th class="n">CGST</th><th class="n">SGST</th></tr>${inv.bill.byRate
        .map((r) => `<tr><td>${r.ratePct}%</td><td class="n">${rs(r.taxable)}</td><td class="n">${rs(r.cgst)}</td><td class="n">${rs(r.sgst)}</td></tr>`)
        .join('')}</table>`
    : '';
  const ids = [inv.store.gstin && `GSTIN: ${esc(inv.store.gstin)}`, inv.store.fssai && `FSSAI: ${esc(inv.store.fssai)}`, ...inv.store.drugLicences.map((d) => `DL: ${esc(d)}`)].filter(Boolean).join('<br>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tax ? 'Tax invoice' : 'Bill'} ${esc(inv.number)}</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 74mm; margin: 0; font: 12px/1.4 Arial, sans-serif; color: #000; }
    h1 { font-size: 15px; margin: 0; text-align: center; } h2 { font-size: 13px; margin: 2px 0; text-align: center; }
    .c { text-align: center; } .m { font-size: 10px; color: #333; } hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; } td, th { vertical-align: top; padding: 1px 0; text-align: left; } .n { text-align: right; white-space: nowrap; }
    .t th { font-size: 10px; border-bottom: 1px solid #000; } .t td { font-size: 11px; } .tot td { font-weight: bold; font-size: 13px; }
  </style></head><body>
    <h1>${esc(inv.store.name)}</h1>
    <div class="c">${esc(inv.store.legalName)}<br>${esc(inv.store.address)}${inv.store.phone ? `<br>Ph: ${esc(inv.store.phone)}` : ''}${ids ? `<br>${ids}` : ''}</div><hr>
    <h2>${tax ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</h2>
    <div>Bill no: <b>${esc(inv.number)}</b><br>Date: ${esc(when)}<br>Customer: ${esc(inv.customer)} · ${inv.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</div><hr>
    <table><tr><th>Item</th><th class="n">Qty</th><th class="n">Amount</th></tr>${rows}</table><hr>
    ${taxRows}${tax ? '<hr>' : ''}
    <table>
      ${tax ? `<tr><td>Taxable value</td><td class="n">${rs(inv.bill.taxable)}</td></tr><tr><td>CGST</td><td class="n">${rs(inv.bill.cgst)}</td></tr><tr><td>SGST</td><td class="n">${rs(inv.bill.sgst)}</td></tr>` : ''}
      ${inv.delivery ? `<tr><td>Delivery (by Delivez)</td><td class="n">${rs(inv.delivery)}</td></tr>` : ''}
      ${inv.discount ? `<tr><td>Discount</td><td class="n">-${rs(inv.discount)}</td></tr>` : ''}
      <tr class="tot"><td>Total (₹)</td><td class="n">${rs(inv.grandTotal)}</td></tr>
    </table>
    <div class="m">${tax ? 'Prices include GST.' : 'Not registered under GST — no tax charged.'} Payment: ${esc(inv.payment)}</div><hr>
    <div class="c">Thank you! · Ordered on Delivez</div>
  </body></html>`;
  return printHtml(html, 'bill', inv.number);
}
