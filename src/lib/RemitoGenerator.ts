import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib';

const REMITO_TEMPLATE_URL = "https://qoxmccvysxjvraqchlhy.supabase.co/storage/v1/object/public/remito%20template/REMITO%20TEMPLATE%20pdf.pdf";

const ANCHORS_PT = {
  FIRMA_BOX:  { x: 376.3,  y: 109.65, w: 187.0, h: 82.0 },
  DOMICILIO:  { x: -1.73,  y: 659.0,  maxW: 491.25 },
  DESC_START: { x: 134.9,  y: 560.9,  maxW: 491.25, lineH: 16.5, maxLines: 10 },
  NUMERO:     { x: 379.0,  y: 765.5,  maxW: 112.5 },
  FECHA:      { x: 404.9,  y: 730.0,  maxW: 165.0 }
} as const;

const BASE = {
  fontSize: 12,
  baselineFactor: 0.35,
};

type RemitoPayload = {
  number8d: string;
  fechaDDMMYYYY: string;
  domicilio: string;
  descripcion: string;
  firmaDataUrl?: string | null;
};

function baselineY(yAnchor: number, fontSize: number) {
  return yAnchor - fontSize * BASE.baselineFactor;
}

function fitFontSizeToWidth(text: string, font: PDFFont, targetWidth: number, maxSize: number, minSize = 8) {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > targetWidth) {
    size -= 0.5;
  }
  return size;
}

function drawValueSingleLine(page: PDFPage, text: string, x: number, y: number, font: PDFFont, opts: {
  fontSize?: number; color?: RGB; maxWidth?: number;
}) {
  const fontSize = opts.fontSize ?? BASE.fontSize;
  const yDraw = baselineY(y, fontSize);

  let size = fontSize;
  if (opts.maxWidth) {
    size = fitFontSizeToWidth(text, font, opts.maxWidth, fontSize);
  }

  page.drawText(text, { x, y: yDraw, size, font, color: opts.color ?? rgb(0, 0, 0) });
}

function drawMultilineWrapped(page: PDFPage, text: string, x: number, y: number, font: PDFFont, opts: {
  lineWidth: number; lineHeight: number; fontSize?: number; maxLines?: number;
}) {
  const size = opts.fontSize ?? BASE.fontSize;
  const words = (text || '').split(/\s+/);
  let line = '';
  let yDraw = baselineY(y, size);
  let lines = 0;

  const flush = () => {
    if (!line) return;
    page.drawText(line, { x, y: yDraw, size, font, color: rgb(0, 0, 0) });
    yDraw -= opts.lineHeight;
    lines++;
    line = '';
  };

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= opts.lineWidth) {
      line = test;
    } else {
      flush();
      line = w;
      if (opts.maxLines && lines >= opts.maxLines) break;
    }
  }
  if (!opts.maxLines || lines < opts.maxLines) {
    flush();
  }
}

async function drawSignatureImage(page: PDFPage, dataUrl: string, box: {x:number;y:number;w:number;h:number}, pdfDoc: PDFDocument) {
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const img = mime.includes('png')
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);

  const w = img.width;
  const h = img.height;
  const scale = Math.min(box.w / w, box.h / h);
  const dw = w * scale;
  const dh = h * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
}

export async function generateRemitoPdf(payload: RemitoPayload): Promise<Uint8Array> {
  const existingPdfBytes = await fetch(REMITO_TEMPLATE_URL).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  drawValueSingleLine(page, payload.number8d, ANCHORS_PT.NUMERO.x, ANCHORS_PT.NUMERO.y, font, { maxWidth: ANCHORS_PT.NUMERO.maxW });
  drawValueSingleLine(page, payload.fechaDDMMYYYY, ANCHORS_PT.FECHA.x, ANCHORS_PT.FECHA.y, font, { maxWidth: ANCHORS_PT.FECHA.maxW });
  drawValueSingleLine(page, payload.domicilio, ANCHORS_PT.DOMICILIO.x, ANCHORS_PT.DOMICILIO.y, font, { maxWidth: ANCHORS_PT.DOMICILIO.maxW });

  drawMultilineWrapped(page, payload.descripcion, ANCHORS_PT.DESC_START.x, ANCHORS_PT.DESC_START.y, font, {
    lineWidth: ANCHORS_PT.DESC_START.maxW,
    lineHeight: ANCHORS_PT.DESC_START.lineH,
    maxLines: ANCHORS_PT.DESC_START.maxLines,
  });

  if (payload.firmaDataUrl) {
    await drawSignatureImage(page, payload.firmaDataUrl, ANCHORS_PT.FIRMA_BOX, pdfDoc);
  }

  return pdfDoc.save();
}
