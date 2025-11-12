import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";

type Fields = {
  number?: { x:number; y:number; fontSize?:number; bold?:boolean };
  date?: {
    city:{x:number;y:number;label?:string};
    day:{x:number;y:number};
    month:{x:number;y:number};
    y20?:{x:number;y:number;label?:string};
    yy:{x:number;y:number};
  };
  addressLine?: { x:number; y:number; fontSize?:number };
  addressNumber?: { x:number; y:number; fontSize?:number };
  descriptionBox?: { x:number; y:number; w:number; h:number; fontSize?:number; lineHeight?:number };
  signatureBox?: { x:number; y:number; w:number; h:number };
};

type Template = { image_url: string; fields: Fields; name?: string };
type Order = { description?: string; createdAt?: string; dateTime?: string; finishTime?: string; signatureDataUrl?: string };
type Props = { order: Order; building?: { address?: string }; template: Template; remitoNumber?: string };

// utilidades
const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const px=(W:number,H:number,x:number,y:number)=>({x:Math.round(W*x),y:Math.round(H*y)});
const splitAddress=(a?:string)=>{ if(!a) return {calle:"",numero:""}; const m=a.match(/^(.*?)[,\s]+(\d+)(?:\D.*)?$/); return m?{calle:m[1].trim(),numero:m[2].trim()}:{calle:a,numero:""}; };
const fechaArreglo=(o:Order)=>new Date(o.finishTime ?? o.dateTime ?? o.createdAt ?? Date.now());

// carga segura por CORS -> devuelve objectURL “same-origin”
async function fetchAsObjectURL(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`No se pudo cargar la imagen: ${src}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default function RemitoRenderer({ order, building, template, remitoNumber }: Props){
  const ref=useRef<HTMLCanvasElement|null>(null);

  const [bgUrl,setBgUrl]=useState<string| null>(null);
  const [sigUrl,setSigUrl]=useState<string| null>(null);
  const [error,setError]=useState<string| null>(null);

  // carga fondo
  useEffect(()=> {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const url = await fetchAsObjectURL(template.image_url);
        if (alive) setBgUrl(url);
      } catch (e:any) {
        setError(e?.message ?? String(e));
      }
    })();
    return () => { alive = false; if (bgUrl) URL.revokeObjectURL(bgUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.image_url]);

  // carga firma (si hay), también segura
  useEffect(()=> {
    let alive = true;
    (async () => {
      try {
        const s = order.signatureDataUrl;
        if (!s) { setSigUrl(null); return; }
        if (s.startsWith("data:")) { setSigUrl(s); return; }
        const url = await fetchAsObjectURL(s);
        if (alive) setSigUrl(url);
      } catch {
        setSigUrl(null);
      }
    })();
    return () => { alive = false; if (sigUrl && sigUrl.startsWith("blob:")) URL.revokeObjectURL(sigUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.signatureDataUrl]);

  // render al canvas
  useEffect(()=>{ 
    const c=ref.current; if(!c||!bgUrl) return;
    const bg = new Image();
    bg.onload = () => {
      c.width=bg.naturalWidth; c.height=bg.naturalHeight;
      const ctx=c.getContext("2d")!;
      ctx.clearRect(0,0,c.width,c.height);
      ctx.drawImage(bg,0,0,c.width,c.height); 
      ctx.fillStyle="#000";

      // Nº
      if(template.fields.number){
        const f=template.fields.number; const {x,y}=px(c.width,c.height,f.x,f.y);
        ctx.font=`${f?.bold?"bold ":""}${f?.fontSize||20}px Arial`;
        ctx.fillText(remitoNumber ?? "________", x, y);
      }

      // Fecha
      if(template.fields.date){
        const d=fechaArreglo(order); const dia=d.getDate(); const mes=meses[d.getMonth()]; const yy2=String(d.getFullYear()).slice(-2);
        ctx.font="16px Arial";
        const city=template.fields.date.city; const p1=px(c.width,c.height,city.x,city.y); ctx.fillText(city.label ?? "Buenos Aires,", p1.x,p1.y);
        const day=template.fields.date.day;   const p2=px(c.width,c.height,day.x,day.y);   ctx.fillText(String(dia), p2.x,p2.y);
        const mon=template.fields.date.month; const p3=px(c.width,c.height,mon.x,mon.y);   ctx.fillText(mes, p3.x,p3.y);
        if(template.fields.date.y20){ const y20=template.fields.date.y20; const p4=px(c.width,c.height,y20.x,y20.y); ctx.fillText(y20.label ?? "20", p4.x,p4.y); }
        const yy=template.fields.date.yy;     const p5=px(c.width,c.height,yy.x,yy.y);     ctx.fillText(yy2, p5.x,p5.y);
      }

      // Dirección
      const {calle,numero}=splitAddress(building?.address);
      if(template.fields.addressLine){ const f=template.fields.addressLine; const p=px(c.width,c.height,f.x,f.y); ctx.font=`${f.fontSize||16}px Arial`; ctx.fillText(calle, p.x,p.y); }
      if(template.fields.addressNumber){ const f=template.fields.addressNumber; const p=px(c.width,c.height,f.x,f.y); ctx.font=`${f.fontSize||16}px Arial`; ctx.fillText(numero, p.x,p.y); }

      // Descripción
      if(template.fields.descriptionBox){
        const b=template.fields.descriptionBox; const box={...px(c.width,c.height,b.x,b.y), w:Math.round(c.width*b.w), h:Math.round(c.height*b.h)};
        const text=(order.description||"—").trim(); ctx.font=`${b.fontSize||15}px Arial`;
        const words=text.split(/\s+/); let line=""; let y=box.y+22; const lh=b.lineHeight||18;
        for(const w of words){ const t=line?line+" "+w:w; if(ctx.measureText(t).width>box.w){ ctx.fillText(line,box.x,y); line=w; y+=lh; } else line=t; }
        if(line) ctx.fillText(line,box.x,y);
      }

      // Firma conforme
      if(template.fields.signatureBox && sigUrl){
        const sb=template.fields.signatureBox; const area={...px(c.width,c.height,sb.x,sb.y), w:Math.round(c.width*sb.w), h:Math.round(c.height*sb.h)};
        const img=new Image(); 
        img.onload=()=>{ 
          const r=Math.min(area.w/img.width, area.h/img.height)*0.9; 
          const w=img.width*r, h=img.height*r; 
          const x=area.x+(area.w-w)/2, y=area.y+(area.h-h)/2 + h; 
          c.getContext("2d")!.drawImage(img,x,y-h,w,h); 
        };
        img.src=sigUrl;
      }
    };
    bg.src = bgUrl;
  },[bgUrl, template, order, building, sigUrl, remitoNumber]);

  // === PDF helpers (escala y centra en A4) ===
  function addCanvasToPDF(pdf: jsPDF, c: HTMLCanvasElement) {
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const margin = 30;
    const availW = W - margin * 2;
    const availH = H - margin * 2;
    const scale = Math.min(availW / c.width, availH / c.height);
    const w = c.width * scale;
    const h = c.height * scale;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    const dataUrl = c.toDataURL("image/jpeg", 0.95);
    pdf.addImage(dataUrl, "JPEG", x, y, w, h);
  }

  // Descargar (robusto)
  const handleDownload = () => {
    try{
      const c = ref.current; if (!c) return;
      const pdf = new jsPDF({ unit:"pt", format:"a4" });
      addCanvasToPDF(pdf, c);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remito${remitoNumber ? `_${remitoNumber}` : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(e){ console.error(e); setError("No se pudo descargar el PDF."); }
  };

  // Ver en nueva pestaña (robusto)
  const handleOpenInTab = () => {
    try{
      const c = ref.current; if (!c) return;
      const pdf = new jsPDF({ unit:"pt", format:"a4" });
      addCanvasToPDF(pdf, c);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // (no revocamos inmediatamente para no invalidar la pestaña)
      setTimeout(()=>URL.revokeObjectURL(url), 30_000);
    }catch(e){ console.error(e); setError("No se pudo abrir el PDF."); }
  };

  return (
    <div>
      {error && <div className="mb-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={handleOpenInTab} className="rounded bg-white border border-[#d4caaf] px-3 py-2 text-[#694e35] hover:bg-[#f4ead0]">
          Ver en otra pestaña
        </button>
        <button onClick={handleDownload} className="rounded bg-yellow-500 px-3 py-2 font-bold text-[#520f0f] hover:bg-yellow-400">
          Descargar Remito (PDF)
        </button>
      </div>

      <canvas
        ref={ref}
        style={{width:"100%", border:"1px solid #d4caaf", borderRadius:8, marginTop:8}}
      />
    </div>
  );
}
