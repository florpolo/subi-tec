import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib';

type RemitoPayload = {
  number8d: string;              // "00000010"
  fechaDDMMYYYY: string;         // "02/11/2025"
  domicilio: string;             // buildings.address
  descripcion: string;           // work_orders.comments
  firmaDataUrl?: string | null;  // work_orders.signature_data_url
};

// ======= TUNE THESE to the template (pt; 72pt = 1") =======
const ANCHORS = {
  // N° (sin cambios)
  NUMERO: { x: 379.0, y: 765.5, maxW: 112.5 },

  // FECHA (como en el último ajuste)
  FECHA:  { x: 404.9, y: 730.0, maxW: 165.0 },

  // DOMICILIO — más a la izquierda (antes: x=155.0, y=659.0)
  DOMICILIO: { x: -1.73, y: 659.0, maxW: 465.0 },

  // DESCRIPCIÓN (sin cambios)
  DESC_START: { x: 134.9, y: 560.9, maxW: 491.25, lineH: 16.5, maxLines: 10 },

  // FIRMA CONFORME — más abajo (antes: y=142.0)
  FIRMA_BOX: { x: 376.3, y: 109.65, w: 187.0, h: 82.0 },
};

const BASE = {
  fontSize: 12,
  baselineFactor: 0.35, // 0.30–0.45 lowers text to align visually
  xPad: 10 // Adjusted to 10px
};

// ======= Helpers =======
function baselineY(yBaseline: number, fontSize: number, factor = BASE.baselineFactor) {
  return yBaseline - Math.round(fontSize * factor);
}

function fitFontSizeToWidth(text: string, font: PDFFont, targetWidth: number, maxSize: number, minSize = 8) {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > targetWidth) size -= 0.5;
  return size;
}

function drawValueSingleLine(page: PDFPage, text: string, xLabel: number, yBaseline: number, font: PDFFont, opts?: {
  fontSize?: number; color?: RGB; xPad?: number; maxWidth?: number; centerInWidth?: number;
}) {
  const fontSize = opts?.fontSize ?? BASE.fontSize;
  const xPad = opts?.xPad ?? BASE.xPad;
  const y = baselineY(yBaseline, fontSize);
  let x = xLabel + xPad;

  let size = fontSize;
  if (opts?.maxWidth) {
    size = fitFontSizeToWidth(text, font, opts.maxWidth, fontSize);
    if (opts.centerInWidth) {
      const w = font.widthOfTextAtSize(text, size);
      x = xLabel + Math.max(0, (opts.centerInWidth - w) / 2);
    }
  }

  page.drawText(text, { x, y, size, font, color: opts?.color ?? rgb(0,0,0) });
}

function drawMultilineWrapped(page: PDFPage, text: string, xStart: number, yBaseline: number, font: PDFFont, opts: {
  lineWidth: number; lineHeight?: number; fontSize?: number; maxLines?: number;
}) {
  const size = opts.fontSize ?? BASE.fontSize;
  const lh = opts.lineHeight ?? (size * 1.25);
  const words = (text || '').split(/\s+/);
  let line = '';
  let y = baselineY(yBaseline, size);
  let lines = 0;

  const flush = () => {
    if (!line) return;
    page.drawText(line, { x: xStart, y, size, font, color: rgb(0,0,0) });
    y -= lh; lines++; line = '';
  };

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= opts.lineWidth) line = test;
    else { flush(); line = w; if (opts.maxLines && lines >= opts.maxLines) break; }
  }
  if (!opts.maxLines || lines < opts.maxLines) flush();
}

async function drawSignatureImage(page: PDFPage, dataUrl: string, box: {x:number;y:number;w:number;h:number}, pdfDoc: PDFDocument) {
  // supports PNG/JPEG data URLs
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const img = mime.includes('png')
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);

  const w = img.width, h = img.height;
  const scale = Math.min(box.w / w, box.h / h);
  const dw = w * scale, dh = h * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
}

// ======= Main render =======
export async function renderRemitoPdf(payload: RemitoPayload) {
  const TEMPLATE_URL = 'https://qoxmccvysxjvraqchlhy.supabase.co/storage/v1/object/public/remito%20template/REMITO%20TEMPLATE%20pdf.pdf';
  let existingPdfBytes;
  try {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch template PDF: ${response.statusText}`);
    }
    existingPdfBytes = await response.arrayBuffer();
  } catch (error) {
    console.error('Error fetching template PDF:', error);
    throw new Error('Could not load Remito template. Please check the template URL and network connection.');
  }
  const pdf = await PDFDocument.load(existingPdfBytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // FECHA (DD/MM/YYYY) – align to FECHA baseline
  drawValueSingleLine(page, payload.fechaDDMMYYYY,
    ANCHORS.FECHA.x, ANCHORS.FECHA.y, font,
    { fontSize: BASE.fontSize, maxWidth: ANCHORS.FECHA.maxW });

  // N° – already correct; do not shift
  drawValueSingleLine(page, payload.number8d,
    ANCHORS.NUMERO.x, ANCHORS.NUMERO.y, font,
    { fontSize: BASE.fontSize, maxWidth: ANCHORS.NUMERO.maxW, xPad: 0 });

  // DOMICILIO – on the dotted line, centered vertically
  drawValueSingleLine(page, payload.domicilio,
    ANCHORS.DOMICILIO.x, ANCHORS.DOMICILIO.y, font,
    { fontSize: BASE.fontSize, maxWidth: ANCHORS.DOMICILIO.maxW, centerInWidth: ANCHORS.DOMICILIO.maxW });

  // DESCRIPCIÓN – starts on first dotted line under heading
  drawMultilineWrapped(page, payload.descripcion,
    ANCHORS.DESC_START.x, ANCHORS.DESC_START.y, font,
    { fontSize: BASE.fontSize, lineWidth: ANCHORS.DESC_START.maxW, lineHeight: ANCHORS.DESC_START.lineH, maxLines: ANCHORS.DESC_START.maxLines });

  // FIRMA CONFORME – image inside signature box (not technician)
  if (payload.firmaDataUrl) {
    await drawSignatureImage(page, payload.firmaDataUrl, ANCHORS.FIRMA_BOX, pdf);
  }

  return new Blob([await pdf.save()], { type: 'application/pdf' });
}