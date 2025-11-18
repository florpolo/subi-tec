// src/lib/RemitoGenerator.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "./supabase";

// ==== CONFIG ====
const REMITO_TEMPLATE_URL =
  "https://qoxmccvysxjvraqchlhy.supabase.co/storage/v1/object/public/remitos/REMITO%20TEMPLATE%20pdf.pdf";

// Anclas en puntos (pt)
const ANCHORS_PT = {
  FIRMA_BOX:  { x: 376.3,  y: 109.65, w: 187.0, h: 82.0 },
  DOMICILIO:  { x: -1.73,  y: 659.0,  maxW: 491.25 },
  DESC_START: { x: 134.9,  y: 560.9,  maxW: 491.25, lineH: 16.5, maxLines: 10 },
  NUMERO:     { x: 379.0,  y: 765.5,  maxW: 112.5 },
  FECHA:      { x: 404.9,  y: 730.0,  maxW: 165.0 },
} as const;

// Ajuste de baseline (Helvetica)
const baselineFix = (size = 12) => size * 0.35;

const ddmmyyyy = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
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
  let s = size;
  if (maxW) {
    while (s > 8 && font.widthOfTextAtSize(text ?? "", s) > maxW) {
      s -= 0.5;
    }
  }
  page.drawText(text ?? "", {
    x,
    y: y - baselineFix(s),
    size: s,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawWrapped(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 16.5,
  size = 12,
  maxLines = 10
) {
  const words = (text || "").split(/\s+/);
  let line = "";
  let lines = 0;
  let yCur = y - baselineFix(size);

  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) <= maxW) {
      line = t;
    } else {
      page.drawText(line, { x, y: yCur, size, font, color: rgb(0, 0, 0) });
      if (++lines >= maxLines) return;
      yCur -= lineH;
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
  dataUrlOrUrl: string,
  box: { x: number; y: number; w: number; h: number }
) {
  let bytes: Uint8Array;
  let isPng = true;

  if (dataUrlOrUrl.startsWith("data:")) {
    const mime = dataUrlOrUrl.slice(5, dataUrlOrUrl.indexOf(";"));
    const b64 = dataUrlOrUrl.slice(dataUrlOrUrl.indexOf(",") + 1);
    bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    isPng = mime.includes("png");
  } else {
    const resp = await fetch(dataUrlOrUrl);
    if (!resp.ok) throw new Error(`Signature fetch failed: ${resp.status}`);
    const arr = new Uint8Array(await resp.arrayBuffer());
    bytes = arr;
    // Heurística simple por extensión
    const lower = dataUrlOrUrl.toLowerCase();
    isPng = lower.endsWith(".png") || lower.includes("image/png");
  }

  const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
}

// === Numerador: Opción A (RPC) + fallback local si falla ===
async function getNextRemitoNumber(companyId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("get_next_remito_no", {
      p_company_id: companyId,
    });
    if (error) throw error;
    // La función puede devolver string o number. En ambos casos, pad a 8.
    const n = typeof data === "number" ? data : parseInt(String(data), 10);
    return String(n).padStart(8, "0");
  } catch (e) {
    console.warn("[Remito] RPC get_next_remito_no falló, usando fallback local", e);
    // Fallback NO persistente: timestamp reducido a secuencia "única"
    const n = Math.floor(Date.now() / 1000) % 100000000;
    return String(n).padStart(8, "0");
  }
}

export async function downloadRemito(companyId: string, workOrderId: string) {
  try {
    console.log("[Remito] start", { companyId, workOrderId });

    // 1) PDF base
    console.log("[Remito] fetch template…", REMITO_TEMPLATE_URL);
    const r = await fetch(REMITO_TEMPLATE_URL);
    console.log("[Remito] template status", r.status);
    if (!r.ok) throw new Error(`Template fetch failed: ${r.status}`);
    const templateBytes = new Uint8Array(await r.arrayBuffer());

    // 2) Work order
    console.log("[Remito] fetch work order…");
    const { data: wo, error: e1 } = await supabase
      .from("work_orders")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", workOrderId)
      .maybeSingle();
    if (e1) throw e1;
    if (!wo) throw new Error("Work order not found");
    if (wo.status !== "Completed") throw new Error("Work order must be Completed");
    if (!wo.finish_time) throw new Error("Missing finish_time");
    if (!wo.building_id) throw new Error("Missing building_id");
    console.log("[Remito] work order OK");

    // 3) Building
    console.log("[Remito] fetch building…");
    const { data: building, error: e2 } = await supabase
      .from("buildings")
      .select("address")
      .eq("company_id", companyId)
      .eq("id", wo.building_id)
      .maybeSingle();
    if (e2) throw e2;
    if (!building?.address) throw new Error("Missing building address");

    // 4) Firma
    if (!wo.signature_data_url) throw new Error("Missing customer signature");

    // 5) Número de remito
    console.log("[Remito] next number…");
    const remitoNumber = await getNextRemitoNumber(companyId);
    console.log("[Remito] number", remitoNumber);

    // 6) Render
    console.log("[Remito] render…");
    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPages()[0];
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    drawText(page, font, remitoNumber, ANCHORS_PT.NUMERO.x, ANCHORS_PT.NUMERO.y, ANCHORS_PT.NUMERO.maxW);
    drawText(page, font, ddmmyyyy(wo.finish_time), ANCHORS_PT.FECHA.x, ANCHORS_PT.FECHA.y, ANCHORS_PT.FECHA.maxW);
    drawText(page, font, building.address, ANCHORS_PT.DOMICILIO.x, ANCHORS_PT.DOMICILIO.y, ANCHORS_PT.DOMICILIO.maxW);

    drawWrapped(
      page,
      font,
      wo.comments || "",
      ANCHORS_PT.DESC_START.x,
      ANCHORS_PT.DESC_START.y,
      ANCHORS_PT.DESC_START.maxW,
      ANCHORS_PT.DESC_START.lineH,
      12,
      ANCHORS_PT.DESC_START.maxLines
    );

    await drawSignature(page, pdf, wo.signature_data_url, ANCHORS_PT.FIRMA_BOX);

    const bytes = await pdf.save();
    console.log("[Remito] bytes", bytes.byteLength);

    // 7) Descarga
    console.log("[Remito] download…");
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remito_${remitoNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log("[Remito] done");
  } catch (err) {
    console.error("[Remito] ERROR", err);
    alert(`Remito error: ${String((err as any)?.message || err)}`);
    throw err;
  }
}
