// src/lib/RemitoGenerator.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "./supabase";

const REMITO_TEMPLATE_URL =
  "https://qoxmccvysxjvraqchlhy.supabase.co/storage/v1/object/public/remitos/REMITO%20TEMPLATE%20pdf.pdf";

const ANCHORS_PT = {
  FIRMA_BOX:  { x: 376.3,  y: 109.65, w: 187.0, h: 82.0 },
  DOMICILIO:  { x: -1.73,  y: 659.0,  maxW: 491.25 },
  DESC_START: { x: 134.9,  y: 560.9,  maxW: 491.25, lineH: 16.5, maxLines: 10 },
  NUMERO:     { x: 379.0,  y: 765.5,  maxW: 112.5 },
  FECHA:      { x: 404.9,  y: 730.0,  maxW: 165.0 },
} as const;

const baselineFix = (size = 12) => size * 0.35;
const ddmmyyyy = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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
  const safe = text ?? "";
  if (maxW) {
    while (s > 8 && font.widthOfTextAtSize(safe, s) > maxW) s -= 0.5;
  }
  page.drawText(safe, { x, y: y - baselineFix(s), size: s, font, color: rgb(0, 0, 0) });
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
      if (line) page.drawText(line, { x, y: yCur, size, font, color: rgb(0, 0, 0) });
      if (++lines >= maxLines) return;
      yCur -= lineH;
      line = w;
    }
  }
  if (line) page.drawText(line, { x, y: yCur, size, font, color: rgb(0, 0, 0) });
}

async function drawSignature(
  page: any,
  pdf: PDFDocument,
  src: string,
  box: { x: number; y: number; w: number; h: number }
) {
  let bytes: Uint8Array | null = null;
  let kind: "png" | "jpg" = "png";

  if (!src) throw new Error("Missing customer signature");
  if (src.startsWith("data:")) {
    const mime = src.slice(5, src.indexOf(";")).toLowerCase();
    const b64 = src.slice(src.indexOf(",") + 1);
    bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    kind = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  } else {
    // URL pública/firmada
    const resp = await fetch(src, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Signature fetch failed: ${resp.status}`);
    bytes = new Uint8Array(await resp.arrayBuffer());
    const lower = src.toLowerCase();
    kind = lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "jpg" : "png";
  }

  const img = kind === "jpg" ? await pdf.embedJpg(bytes!) : await pdf.embedPng(bytes!);
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
}

async function getNextRemitoNumber(companyId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_remito_no", { p_company_id: companyId });
  if (error) throw error;
  return data as string; // "00000042"
}

export async function downloadRemito(companyId: string, workOrderId: string) {
  try {
    // asegurar client-side
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("Download can only run on the client");
    }

    console.log("[Remito] start", { companyId, workOrderId });

    // 1) template
    console.log("[Remito] fetch template…");
    const r = await fetch(REMITO_TEMPLATE_URL, { cache: "no-store" });
    console.log("[Remito] template status", r.status);
    if (!r.ok) throw new Error(`Template fetch failed: ${r.status}`);
    const templateBytes = new Uint8Array(await r.arrayBuffer());

    // 2) datos
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

    console.log("[Remito] fetch building…");
    const { data: building, error: e2 } = await supabase
      .from("buildings")
      .select("address")
      .eq("id", wo.building_id)
      .maybeSingle();
    if (e2) throw e2;
    if (!building?.address) throw new Error("Missing building address");
    if (!wo.signature_data_url) throw new Error("Missing customer signature");

    // 3) número secuencial
    console.log("[Remito] next number…");
    const remitoNumber = await getNextRemitoNumber(companyId);
    console.log("[Remito] number", remitoNumber);

    // 4) render
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

    const pdfBytes = await pdf.save();
    console.log("[Remito] bytes", pdfBytes.byteLength);

    // 5) descarga
    console.log("[Remito] download…");
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
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
