import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { apiUrl } from '../../lib/config';
import { useAuth } from '../../lib/auth-store';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { Card, TextArea, Toggle } from '../../components/form';
import { ArrowLeft, CheckCircle2, Download, FileUp } from 'lucide-react';
import { Button, ErrorText } from '../../components/ui';
import { toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

interface Preview {
  rows: { row: number; action: 'CREATE' | 'UPDATE' | 'ERROR'; name: string; price: number | null; category: string | null; stock: number | null; errors: string[] }[];
  valid: number;
  errors: number;
  creates?: number;
  updates?: number;
  problems: string[];
}

// Bulk import (plan §5.4.1): CSV or pasted spreadsheet rows → validation preview → import valid rows.
export default function Import() {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  const token = useAuth((s) => s.accessToken);
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);

  const preview = useMutation({ mutationFn: () => api<Preview>(`/partners/stores/${storeId}/products/import/preview`, { method: 'POST', body: { csv, updateExisting } }) });
  const run = useMutation({
    mutationFn: () => api<{ created: number; updated: number; skipped: number; failed: { row: number; error: string }[] }>(`/partners/stores/${storeId}/products/import`, { method: 'POST', body: { csv, updateExisting } }),
    onSuccess: (r) => {
      toast.success(`Imported — ${r.created} added, ${r.updated} updated`);
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      void qc.invalidateQueries({ queryKey: ['categories', storeId] });
      void qc.invalidateQueries({ queryKey: ['inventory', storeId] });
    },
  });

  async function downloadTemplate() {
    const res = await fetch(apiUrl(`/v1/partners/stores/${storeId}/products/import/template.csv`), { headers: { authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: 'delivez-catalog-template.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) return alert('Please keep files under 1 MB (about 2,000 items)');
    setFileName(file.name);
    setCsv(await file.text());
    preview.reset();
    run.reset();
  }

  const p = preview.data;

  return (
    <div className="space-y-5">
      <Link to=".." relative="path" className="inline-flex items-center gap-1 text-sm font-bold text-ink-2 hover:text-dz-red">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to menu
      </Link>
      <h1 className="text-[clamp(28px,3.5vw,40px)]">Import items</h1>

      {run.data ? (
        <Card title="Import finished">
          <CheckCircle2 className="mb-2 h-10 w-10 text-dz-green" aria-hidden />
          <p className="text-lg">
            <b className="text-dz-green">{run.data.created} added</b> · <b>{run.data.updated} updated</b> · <span className="text-ink-3">{run.data.skipped} skipped</span>
          </p>
          {run.data.failed.length > 0 && (
            <ul className="mt-3 text-sm text-dz-red">
              {run.data.failed.map((f) => (
                <li key={f.row}>
                  Row {f.row}: {f.error}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex gap-2">
            <Link to=".." relative="path" className="dz-btn-red">
              View menu
            </Link>
            <Button variant="ghost" onClick={() => (setCsv(''), setFileName(''), preview.reset(), run.reset())}>
              Import another file
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card title="1. Get the template">
            <p className="text-sm text-ink-2">Columns: name and price are required. Add mrp, category, unit, stock, sku, barcode, description — and veg (food) or schedule/salt/rx (medicines). Prices are in rupees. In Excel, use File → Save As → CSV.</p>
            <Button variant="dark" className="mt-3" onClick={() => void downloadTemplate()}>
              <Download className="h-4 w-4" aria-hidden /> Download CSV template
            </Button>
          </Card>

          <Card title="2. Add your file">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" aria-hidden /> Choose CSV file
              </Button>
              <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
              {fileName && <span className="text-sm font-semibold">{fileName}</span>}
            </div>
            <p className="my-3 text-sm text-ink-3">…or paste rows copied from Excel / Google Sheets (with the header row):</p>
            <TextArea rows={7} value={csv} onChange={(e) => (setCsv(e.target.value), setFileName(''), preview.reset())} placeholder={'name,price,category,stock\nToor Dal 1 kg,165,Pulses,40'} className="font-mono text-sm" />
            <div className="mt-3">
              <Toggle checked={updateExisting} onChange={(v) => (setUpdateExisting(v), preview.reset())} label="Update items that already exist" hint="Matched by SKU, or by name when there is no SKU" />
            </div>
            <Button className="mt-4" disabled={!csv.trim() || preview.isPending} onClick={() => preview.mutate()}>
              {preview.isPending ? 'Checking…' : 'Check file'}
            </Button>
            {preview.error && <ErrorText>{errorMessageOf(preview.error)}</ErrorText>}
          </Card>

          {p && (
            <Card title="3. Review and import">
              {p.problems.map((x) => (
                <p key={x} className="mb-2 rounded-lg bg-dz-red-soft px-3 py-2 text-sm font-semibold text-dz-red">
                  {x}
                </p>
              ))}
              {p.rows.length > 0 && (
                <>
                  <p className="mb-3 text-sm">
                    <b className="text-dz-green">{p.creates ?? 0} new</b> · <b>{p.updates ?? 0} updates</b> · <b className={p.errors ? 'text-dz-red' : ''}>{p.errors} with errors</b> (skipped)
                  </p>
                  <div className="max-h-96 overflow-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-soft text-left text-xs uppercase text-ink-3">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2">Price</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Stock</th>
                          <th className="px-3 py-2">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {p.rows.map((r) => (
                          <tr key={r.row} className={r.action === 'ERROR' ? 'bg-dz-red-soft/50' : ''}>
                            <td className="px-3 py-2 text-ink-3">{r.row}</td>
                            <td className="px-3 py-2 font-semibold">{r.name}</td>
                            <td className="px-3 py-2">{r.price != null ? inr(r.price) : '—'}</td>
                            <td className="px-3 py-2">{r.category ?? '—'}</td>
                            <td className="px-3 py-2">{r.stock ?? '—'}</td>
                            <td className="px-3 py-2">
                              {r.action === 'ERROR' ? <span className="text-xs font-semibold text-dz-red">{r.errors.join('; ')}</span> : <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.action === 'CREATE' ? 'bg-dz-green-soft text-dz-green' : 'bg-dz-blue-soft text-dz-blue'}`}>{r.action === 'CREATE' ? 'New' : 'Update'}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <Button className="mt-4" disabled={!p.valid || run.isPending} onClick={() => run.mutate()}>
                {run.isPending ? 'Importing…' : `Import ${p.valid} valid rows`}
              </Button>
              {run.error && <ErrorText>{errorMessageOf(run.error)}</ErrorText>}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
