// src/pages/TaskDetail.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabaseDataLayer, WorkOrder } from '../lib/supabaseDataLayer';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ListChecks, Wrench, Image as ImageIcon, PenLine } from 'lucide-react';

type TabKey = 'detalles' | 'materiales' | 'fotos' | 'firma';

// ======== Timezone helpers (Buenos Aires) ========
const TZ_BA = 'America/Argentina/Buenos_Aires';
const fmtDateTimeBA = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        timeZone: TZ_BA,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const claimLabel = (t?: string) =>
  t === 'Semiannual Tests' ? 'Pruebas semestrales'
  : t === 'Monthly Maintenance' ? 'Mantenimiento mensual'
  : t === 'Corrective' ? 'Correctivo'
  : (t || '');

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('detalles');

  useEffect(() => {
    const load = async () => {
      if (!id || !activeCompanyId) return;
      setLoading(true);
      const ord = await supabaseDataLayer.getWorkOrder(id, activeCompanyId);
      setOrder(ord);
      setLoading(false);
    };
    load();
  }, [id, activeCompanyId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[#520f0f] hover:underline">
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="animate-pulse h-40 bg-[#f4ead0] rounded-xl border-2 border-[#d4caaf]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[#520f0f] hover:underline">
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6">
          <p className="text-[#694e35]">No se encontró la orden solicitada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[#520f0f] hover:underline">
        <ChevronLeft size={18} /> Volver
      </button>

      {/* Tabs: Detalles / Materiales / Fotos / Firma (sin header de estado/fecha, sin edificio/ascensor/contacto/historial) */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300">
        <div className="flex flex-wrap gap-2 p-3 border-b-2 border-[#d4caaf]">
          <TabButton active={tab==='detalles'} onClick={() => setTab('detalles')} icon={ListChecks} label="Detalles" />
          <TabButton active={tab==='materiales'} onClick={() => setTab('materiales')} icon={Wrench} label="Materiales" />
          <TabButton active={tab==='fotos'} onClick={() => setTab('fotos')} icon={ImageIcon} label="Fotos" />
          <TabButton active={tab==='firma'} onClick={() => setTab('firma')} icon={PenLine} label="Firma" />
        </div>

        <div className="p-6">
          {tab === 'detalles' && (
            <div className="space-y-4">
              <Section title="Tipo de reclamo">
                <p className="text-[#694e35] font-medium">{claimLabel(order.claim_type)}</p>
                {order.corrective_type && <p className="text-[#5e4c1e] mt-1">Subtipo: {order.corrective_type}</p>}
              </Section>

              <Section title="Descripción">
                <p className="text-[#5e4c1e]">{order.description || '—'}</p>
              </Section>

              <Section title="Comentarios del Técnico">
                <p className="text-[#5e4c1e] whitespace-pre-wrap">{order.comments || '—'}</p>
              </Section>

              {/* Fechas: solo finalización (como te gustó antes) */}
              <Section title="Fecha de finalización">
                <p className="text-[#5e4c1e]">{order.finish_time ? fmtDateTimeBA(order.finish_time) : '—'}</p>
              </Section>
            </div>
          )}

          {tab === 'materiales' && (
            <div>
              {!order.parts_used || order.parts_used.length === 0 ? (
                <p className="text-[#5e4c1e]">No se registraron repuestos.</p>
              ) : (
                <ul className="divide-y border rounded-lg overflow-hidden">
                  {order.parts_used.map((p, i) => (
                    <li key={`${p.name}-${i}`} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[#694e35]">{p.name}</span>
                      <span className="text-sm text-[#5e4c1e]">x {p.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'fotos' && (
            <div>
              {!order.photo_urls || order.photo_urls.length === 0 ? (
                <p className="text-[#5e4c1e]">No hay fotos adjuntas.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {order.photo_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                      <img src={url} alt={`Foto ${idx+1}`} className="w-full h-40 object-cover rounded-lg border-2 border-[#d4caaf]" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'firma' && (
            <div className="space-y-2">
              {order.signature_data_url ? (
                <>
                  <p className="text-sm text-[#5e4c1e]">Firma del cliente (solo lectura):</p>
                  <img
                    src={order.signature_data_url}
                    alt="Firma"
                    className="border-2 border-[#d4caaf] rounded-lg bg-white w-full max-w-md"
                  />
                </>
              ) : (
                <p className="text-[#5e4c1e]">No hay firma registrada.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sub-componentes */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border-2 border-[#d4caaf] p-4">
      <h3 className="font-bold text-[#694e35] mb-2">{title}</h3>
      {children}
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
        ${active ? 'bg-yellow-500 text-[#520f0f] border-yellow-500' : 'bg-white text-[#520f0f] border-[#c9be9f] hover:bg-gray-50'}`}
    >
      <Icon size={16} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
