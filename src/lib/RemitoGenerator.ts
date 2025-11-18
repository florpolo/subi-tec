// src/lib/RemitoGenerator.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from './supabase';

// Supabase Storage bucket y path del template
const STORAGE_BUCKET = 'remitos';
const TEMPLATE_KEY = 'REMITO TEMPLATE pdf.pdf';

const ANCHORS_PT = {
  // Caja donde centramos la imagen de la firma del cliente (FIRMA CONFORME)
  FIRMA_BOX: { x: 376.3, y: 109.65, w: 187.0, h: 82.0 },

  // Caja donde centramos la imagen de la firma del técnico (FIRMA TÉCNICO)
  FIRMA_TECNICO_BOX: { x: 30.0, y: 109.65, w: 187.0, h: 82.0 },

  // Texto domicilio (línea única con autoscale)
  DOMICILIO: { x: 150, y: 659.0, maxW: 430 },

  // Párrafo "Certifico que…"
DESC_START: { x: 190.0, y: 560.9, maxW: 436.15, lineH: 16.5, maxLines: 10 },

  // N°
  NUMERO: { x: 379.0, y: 765.5, maxW: 112.5 },

  // FECHA
  FECHA: { x: 404.9, y: 730.0, maxW: 165.0 },

  // Aclaración del cliente (texto en línea)
  ACLARACION: { x: 376.3, y: 75.0, maxW: 187.0 },
} as const;

const baselineFix = (size = 12) => size * 0.35;

const ddmmyyyy = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

function drawText(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  maxW?: number,
  size = 12
) {
  const t = text ?? '';
  let s = size;
  if (maxW) {
    while (s > 8 && font.widthOfTextAtSize(t, s) > maxW) s -= 0.5;
  }
  page.drawText(t, {
    x,
    y: y - baselineFix(s),
    size: s,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawWrapped(opts: {
  page: any;
  font: any;
  text: string;
  x: number;
  y: number;
  maxW: number;
  lineH?: number;
  size?: number;
  maxLines?: number;
}) {
  const {
    page,
    font,
    text,
    x,
    y,
    maxW,
    lineH = 16.5,
    size = 12,
    maxLines = 10,
  } = opts;

  const words = (text || '').split(/\s+/);
  let line = '';
  let lines = 0;
  let yCur = y - baselineFix(size);

  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) <= maxW) {
      line = t;
    } else {
      if (line) {
        page.drawText(line, { x, y: yCur, size, font, color: rgb(0, 0, 0) });
        lines += 1;
        if (lines >= maxLines) return;
        yCur -= lineH;
      }
      line = w;
    }
  }
  if (line) {
    page.drawText(line, { x, y: yCur, size, font, color: rgb(0, 0, 0) });
  }
}

async function drawSignature(
  page: any,
  pdf: PDFDocument,
  dataUrlOrHttpUrl: string,
  box: { x: number; y: number; w: number; h: number }
) {
  if (!dataUrlOrHttpUrl) return;

  let imgBytes: Uint8Array | null = null;
  let isPng = true;

  if (dataUrlOrHttpUrl.startsWith('data:')) {
    // data URL
    const metaEnd = dataUrlOrHttpUrl.indexOf(',');
    const meta = dataUrlOrHttpUrl.slice(0, metaEnd);
    const b64 = dataUrlOrHttpUrl.slice(metaEnd + 1);
    isPng = meta.includes('png');
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    imgBytes = arr;
  } else {
    // URL (firma subida a Supabase u otra CDN)
    const resp = await fetch(dataUrlOrHttpUrl, { mode: 'cors', cache: 'no-store' });
    if (!resp.ok) throw new Error(`Signature fetch failed: ${resp.status}`);
    const ab = await resp.arrayBuffer();
    imgBytes = new Uint8Array(ab);
    const lower = dataUrlOrHttpUrl.toLowerCase();
    isPng = !(lower.endsWith('.jpg') || lower.endsWith('.jpeg'));
  }

  const img = isPng ? await pdf.embedPng(imgBytes!) : await pdf.embedJpg(imgBytes!);
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
}

async function getTemplateBytes(): Promise<Uint8Array> {
  const { data, error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .download(TEMPLATE_KEY);

  if (error) throw new Error(`[Remito] template download failed: ${error.message}`);
  const ab = await data.arrayBuffer();
  // debug: first bytes should start with "%PDF-"
  const bytes = new Uint8Array(ab);
  console.log('[Remito] template bytes first 5', bytes.slice(0, 5));
  return bytes;
}

async function getWorkOrderAndBuilding(workOrderId: string) {
  const { data: wo, error: e1 } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', workOrderId)
    .maybeSingle();
  if (e1) throw e1;
  if (!wo) throw new Error('Work order not found');
  if (wo.status !== 'Completed') throw new Error('Work order must be Completed');
  if (!wo.finish_time) throw new Error('Missing finish_time');

  const { data: building, error: e2 } = await supabase
    .from('buildings')
    .select('address')
    .eq('id', wo.building_id)
    .maybeSingle();
  if (e2) throw e2;
  if (!building?.address) throw new Error('Missing building address');

  return { wo, building };
}

async function getNextRemitoNumberOrFallback(companyId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_next_remito_no', { p_company_id: companyId });
    if (error) throw error;
    const n = typeof data === 'number' ? data : parseInt(String(data), 10);
    return String(n).padStart(8, '0');
  } catch (e) {
    console.warn('[Remito] RPC get_next_remito_no failed, using fallback:', e);
    // Fallback local si el RPC no existe o falla (evita que "no pase nada" en Bolt)
    const ts = Date.now() % 10_000_000; // 7 dígitos máx.
    return String(ts).padStart(8, '0');
  }
}

export async function downloadRemito(workOrderId: string) {
  try {
    console.log('[Remito] start', { workOrderId });

    // 1) Cargar template desde Supabase Storage
    const templateBytes = await getTemplateBytes();
    console.log('[Remito] template bytes', templateBytes.byteLength);

    // 2) Traer orden + edificio (derivamos companyId de la orden)
    const { wo, building } = await getWorkOrderAndBuilding(workOrderId);
    const companyId = wo.company_id;
    console.log('[Remito] wo/building OK', { companyId, finish_time: wo.finish_time });

    // 3) Numerador (o fallback)
    const remitoNumber = await getNextRemitoNumberOrFallback(companyId);
    console.log('[Remito] number', remitoNumber);

    // 4) Render
    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPages()[0];
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    // N°
    drawText(page, font, remitoNumber, ANCHORS_PT.NUMERO.x, ANCHORS_PT.NUMERO.y, ANCHORS_PT.NUMERO.maxW);

    // FECHA (DD/MM/YYYY)
    drawText(
      page,
      font,
      ddmmyyyy(wo.finish_time),
      ANCHORS_PT.FECHA.x,
      ANCHORS_PT.FECHA.y,
      ANCHORS_PT.FECHA.maxW
    );

    // DOMICILIO (address del building)
    drawText(
      page,
      font,
      building.address || '',
      ANCHORS_PT.DOMICILIO.x,
      ANCHORS_PT.DOMICILIO.y,
      ANCHORS_PT.DOMICILIO.maxW
    );

    // Descripción / comentarios (certifico…)
    drawWrapped({
      page,
      font,
      text: wo.comments || '',
      x: ANCHORS_PT.DESC_START.x,
      y: ANCHORS_PT.DESC_START.y,
      maxW: ANCHORS_PT.DESC_START.maxW,
      lineH: ANCHORS_PT.DESC_START.lineH,
      size: 12,
      maxLines: ANCHORS_PT.DESC_START.maxLines,
    });

    // Firma del cliente (en FIRMA CONFORME)
    if (wo.signature_data_url) {
      await drawSignature(page, pdf, wo.signature_data_url, ANCHORS_PT.FIRMA_BOX);
    } else {
      console.warn('[Remito] Missing signature_data_url');
    }

    // Firma del técnico (en FIRMA TÉCNICO)
    if (wo.technician_signature_data_url) {
      await drawSignature(page, pdf, wo.technician_signature_data_url, ANCHORS_PT.FIRMA_TECNICO_BOX);
    } else {
      console.warn('[Remito] Missing technician_signature_data_url');
    }

    // Aclaración del cliente (texto)
    if (wo.client_aclaracion) {
      drawText(
        page,
        font,
        wo.client_aclaracion,
        ANCHORS_PT.ACLARACION.x,
        ANCHORS_PT.ACLARACION.y,
        ANCHORS_PT.ACLARACION.maxW,
        10
      );
    }

    const bytes = await pdf.save();
    console.log('[Remito] bytes', bytes.byteLength);

    // 4.5) Log a DB (no bloquea descarga si falla)
    try {
      await supabase.from('remitos').insert({
        company_id: companyId,
        work_order_id: workOrderId,
        remito_number: remitoNumber,
        file_url: null,
      });
      console.log('[Remito] DB log OK');
    } catch (e) {
      console.warn('[Remito] insert log failed:', e);
    }

    // 5) Descarga
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remito_${remitoNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log('[Remito] done');
  } catch (err: any) {
    console.error('[Remito] ERROR', err);
    alert(`Remito error: ${err?.message || String(err)}`);
    throw err;
  }
}
