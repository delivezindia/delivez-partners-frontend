import { extractDocFields, type DocFields } from './docFields';

export interface DocReading extends DocFields {
  /** pdf-text: exact text from a digital PDF; ocr: read from a photo/scan. */
  method: 'pdf-text' | 'ocr';
  /** Tesseract's own confidence (0–100) for OCR. */
  engineConfidence: number | null;
}

/** Digital PDFs (most e-licences, the GST certificate) carry their text: read it exactly. Scans fall back to OCR. */
async function pdfText(file: File): Promise<{ text: string; firstPage: HTMLCanvasElement | null }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = '';
  for (let n = 1; n <= Math.min(doc.numPages, 3); n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Keep line breaks so "Label: value" pairs stay together.
    text += content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join('') + '\n';
  }
  if (text.replace(/\s/g, '').length > 40) return { text, firstPage: null };
  // A scanned PDF: draw page 1 big enough for OCR.
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
  return { text: '', firstPage: canvas };
}

async function ocr(image: File | HTMLCanvasElement, onProgress?: (pct: number) => void) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => m.status === 'recognizing text' && onProgress?.(Math.round(m.progress * 100)),
  });
  try {
    const { data } = await worker.recognize(image);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}

/** The text of a PDF or photo: exact for digital PDFs, OCR otherwise. Everything happens in this browser. */
export async function readText(file: File, onProgress?: (pct: number) => void): Promise<{ text: string; method: DocReading['method']; engineConfidence: number | null }> {
  if (file.type === 'application/pdf') {
    const { text, firstPage } = await pdfText(file);
    if (text) return { text, method: 'pdf-text', engineConfidence: null };
    const r = await ocr(firstPage!, onProgress);
    return { text: r.text, method: 'ocr', engineConfidence: Math.round(r.confidence) };
  }
  const r = await ocr(file, onProgress);
  return { text: r.text, method: 'ocr', engineConfidence: Math.round(r.confidence) };
}

/** Reads a licence/certificate and pulls out its number and dates. */
export async function readDocument(file: File, type: string, onProgress?: (pct: number) => void): Promise<DocReading> {
  const { text, method, engineConfidence } = await readText(file, onProgress);
  return { ...extractDocFields(type, text), method, engineConfidence };
}
