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

type Template = { image_url: string; fields: Fields; name?: string; };
type Order = { description?: string; createdAt?: string; dateTime?: string; finishTime?: string; signatureDataUrl?: string; };
type Props = { order: Order; building?: { address?: string }; template: Template; remitoNumber?: string };

const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const toDataURL=(u:string)=>fetch(u).then(r=>r.blob()).then(b=>new Promise<string>(res=>{const fr=new FileReader();fr.onloadend=()=>res(fr.result as string);fr.readAsDataURL(b);}));
const px=(W:number,H:number,x:number,y:number)=>({x:Math.round(W*x),y:Math.round(H*y)});
const splitAddress=(a?:string)=>{ if(!a) return {calle:"",numero:""}; const m=a.match(/^(.*?)[,\s]+(\d+)(?:\D.*)?$/); return m?{calle:m[1].trim(),numero:m[2].trim()}:{calle:a,numero:""}; };
const fechaArreglo=(o:Order)=>new Date(o.finishTime ?? o.dateTime ?? o.createdAt ?? Date.now());

export default function RemitoRenderer({ order, building, template, remitoNumber }: Props){
  const ref=useRef<HTMLCanvasElement|null>(null);
  const [bg,setBg]=useState<HTMLImageElement|null>(null);
  const [sig,setSig]=useState<string|null>(null);

  useEffect(()=>{ const i=new Image(); i.crossOrigin="anonymous"; i.onload=()=>setBg(i); i.src=template.image_url; },[template.image_url]);
  useEffect(()=>{ const s=order.signatureDataUrl; if(!s){setSig(null);return;} if(s.startsWith("data:")) setSig(s); else toDataURL(s).then(setSig).catch(()=>setSig(null)); },[order.signatureDataUrl]);

  useEffect(()=>{ const c=ref.current; if(!c||!bg) return;
    c.width=bg.naturalWidth; c.height=bg.naturalHeight;
    const ctx=c.getContext("2d")!;
    ctx.drawImage(bg,0,0,c.width,c.height); ctx.fillStyle="#000";

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
    if(template.fields.signatureBox && sig){
      const sb=template.fields.signatureBox; const area={...px(c.width,c.height,sb.x,sb.y), w:Math.round(c.width*sb.w), h:Math.round(c.height*sb.h)};
      const img=new Image(); img.onload=()=>{ const r=Math.min(area.w/img.width, area.h/img.height)*0.9; const w=img.width*r, h=img.height*r; const x=area.x+(area.w-w)/2, y=area.y+(area.h-h)/2 + h; c.getContext("2d")!.drawImage(img,x,y-h,w,h); };
      img.src=sig;
    }
  },[bg, template, order, building, sig, remitoNumber]);

  const downloadPDF=()=>{ const c=ref.current; if(!c) return; const pdf=new jsPDF({unit:"pt",format:"a4"}); const W=pdf.internal.pageSize.getWidth(); const H=pdf.internal.pageSize.getHeight(); const d=c.toDataURL("image/jpeg",0.92); const w=W-60; const r=w/c.width; const h=c.height*r; const y=Math.max((H-h)/2,30); pdf.addImage(d,"JPEG",30,y,w,h); pdf.save("remito.pdf"); };

  return (
    <div>
      <button onClick={downloadPDF} className="rounded bg-yellow-500 px-3 py-2 font-bold text-[#520f0f] hover:bg-yellow-400">
        Descargar Remito (PDF)
      </button>
      <canvas ref={ref} style={{width:"100%", border:"1px solid #d4caaf", borderRadius:8, marginTop:8}}/>
    </div>
  );
}
