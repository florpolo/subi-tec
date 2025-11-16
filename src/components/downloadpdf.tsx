import { useState } from "react";
import { jsPDF } from "jspdf";

type Props = {
  order: any;
  building: any;
  elevator: any;
  technician: any;
  /** Nombre comercial de tu empresa (p. ej. "SubiTec") o del cliente. */
  companyName?: string;
  className?: string;
  label?: string;
};

async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** ==== Utilidades de labels en español ==== */
function getStatusLabel(status?: string) {
  switch (status) {
    case "Completed": return "Completada";
    case "In Progress": return "En curso";
    case "Pending": return "Por hacer";
    default: return status ?? "";
  }
}
function getPriorityLabel(priority?: string) {
  switch (priority) {
    case "High": return "Alta";
    case "Medium": return "Media";
    case "Low": return "Baja";
    default: return priority ?? "";
  }
}
function getClaimTypeLabel(claimType?: string) {
  switch (claimType) {
    case "Semiannual Tests": return "Pruebas semestrales";
    case "Monthly Maintenance": return "Mantenimiento mensual";
    case "Corrective": return "Correctivo";
    default: return claimType ?? "";
  }
}
function getCorrectiveTypeLabel(correctiveType?: string) {
  if (!correctiveType) return "";
  switch (correctiveType) {
    case "Minor Repair": return "Reparación menor";
    case "Refurbishment": return "Reacondicionamiento";
    case "Installation": return "Instalación";
    default: return correctiveType;
  }
}
function fmtDate(d?: string | number | Date) {
  if (!d) return "";
  return new Date(d).toLocaleString("es-AR");
}
function safeFileName(s: string) {
  return (s ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\/\\?%*:|"<>]/g, "")
    .slice(0, 100);
}

export default function DownloadWorkOrderPDF({
  order,
  building,
  elevator,
  technician,
  companyName,
  className,
  label = "Descargar PDF",
}: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Firma y hasta 4 fotos (si existen)
      const signatureDataUrl = order?.signatureDataUrl
        ? await toDataURL(order.signatureDataUrl)
        : null;

      const photoDataUrls: string[] = [];
      for (const url of (order?.photoUrls ?? []).slice(0, 4)) {
        const b64 = await toDataURL(url);
        if (b64) photoDataUrls.push(b64);
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 40;
      const W = 515;
      let y = 50;

      const H2 = (t: string) => {
        doc.setFont(undefined, "bold");
        doc.text(t, M, y);
        doc.setFont(undefined, "normal");
        y += 16;
      };
      const L = (k: string, v?: string) => {
        if (!v) return;
        doc.text(`${k}: ${v}`, M, y);
        y += 14;
      };

      // ==== Encabezado (sin ID) ====
      doc.setFontSize(22);
      doc.text("Orden de Trabajo", M, y);
      y += 26;
      doc.setFontSize(12);

      // <- NUEVO: nombre de la empresa (si lo pasás por props)
      L("Empresa", companyName);

      L(
        "Tipo",
        [getClaimTypeLabel(order?.claimType), order?.correctiveType ? `(${getCorrectiveTypeLabel(order?.correctiveType)})` : ""]
          .filter(Boolean)
          .join(" ")
      );
      L("Estado", getStatusLabel(order?.status));
      L("Prioridad", getPriorityLabel(order?.priority));
      if (order?.dateTime) L("Programada", fmtDate(order.dateTime));
      if (order?.createdAt) L("Creada", fmtDate(order.createdAt));
      y += 6;

      // ==== Ubicación ====
      H2("Ubicación");
      // <- NUEVO: si el building trae nombre/compañía, lo mostramos
      L("Empresa/Consorcio", building?.companyName ?? building?.name);
      L("Edificio", building?.address || "Desconocido");
      L("Barrio", building?.neighborhood || "N/A");
      if (elevator) L("Ascensor", `${elevator.number} - ${elevator.locationDescription}`);
      y += 6;

      // ==== Asignación ====
      H2("Asignación");
      L("Técnico", technician?.name || "Sin asignar");
      if (order?.startTime) L("Iniciada", fmtDate(order.startTime));
      if (order?.finishTime) L("Finalizada", fmtDate(order.finishTime));
      y += 6;

      // ==== Descripción ====
      H2("Descripción");
      const descLines = doc.splitTextToSize(order?.description ?? "", W);
      doc.text(descLines, M, y);
      y += descLines.length * 14 + 10;

      // ==== Repuestos usados ====
      if (y > 620) { doc.addPage(); y = 50; }
      H2("Repuestos usados");
      const parts = order?.partsUsed ?? [];
      if (!parts.length) {
        doc.text("Sin repuestos registrados.", M, y);
        y += 14;
      } else {
        const colX = [M, M + 300, M + 420]; // nombre, cant.
        doc.setFont(undefined, "bold");
        doc.text("Repuesto", colX[0], y);
        doc.text("Cant.", colX[1], y);
        doc.setFont(undefined, "normal");
        y += 12;

        for (const p of parts) {
          if (y > 780) { doc.addPage(); y = 50; }
          doc.text(String(p?.name ?? ""), colX[0], y);
          doc.text(String(p?.quantity ?? ""), colX[1], y);
          y += 16;
        }
      }

      // ==== Fotos (si hay) ====
      if (photoDataUrls.length) {
        if (y > 600) { doc.addPage(); y = 50; }
        H2("Fotos");
        const imgW = 240, imgH = 160, gap = 10;
        let x = M;
        for (const b64 of photoDataUrls) {
          if (x + imgW > 555) { x = M; y += imgH + gap; }
          if (y + imgH > 780) { doc.addPage(); x = M; y = 50; }
          doc.addImage(b64, "JPEG", x, y, imgW, imgH);
          x += imgW + gap;
        }
        y += imgH + 10;
      }

      // ==== Firma (AL FINAL) ====
      if (signatureDataUrl) {
        if (y > 680) { doc.addPage(); y = 50; }
        H2("Firma del Cliente");
        doc.addImage(signatureDataUrl, "PNG", M, y, 220, 110);
        y += 120;
      }

      // Footer
      doc.setFontSize(9);
      doc.text("Generado desde SUBITEC — " + new Date().toLocaleString(), M, 820);

      // ==== Nombre del archivo: Dirección + fecha (D-M-YYYY) ====
      const fechaBase = order?.createdAt ?? order?.dateTime ?? new Date();
      const d = new Date(fechaBase);
      const dd = String(d.getDate());          // sin cero a la izquierda (2)
      const mm = String(d.getMonth() + 1);     // sin cero a la izquierda (11)
      const yyyy = d.getFullYear();
      const fechaStrFile = `${dd}-${mm}-${yyyy}`; // usar guiones (no /)
      const direccion = safeFileName(building?.address ?? "orden");
      const fileName = `${direccion}__${fechaStrFile}.pdf`;

      doc.save(fileName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={className ?? "inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-2 font-bold text-[#520f0f] hover:bg-yellow-400"}
    >
      {downloading ? "Generando…" : (label ?? "Descargar PDF")}
    </button>
  );
}
