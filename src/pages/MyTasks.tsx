// src/pages/MyTasks.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDataLayer, WorkOrder, Building, Elevator, ElevatorHistory, Technician } from '../lib/supabaseDataLayer';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Play, Save, CheckCircle, RotateCcw, Camera, Plus, X, History as HistoryIcon } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

// ======== Timezone helpers (Buenos Aires) ========
const TZ_BA = 'America/Argentina/Buenos_Aires';

const baDayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ_BA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const isOnOrBeforeTodayBA = (iso?: string | null) => {
  if (!iso) return true;
  const k = baDayKey(new Date(iso));
  const todayK = baDayKey(new Date());
  return k <= todayK;
};

const isFutureBA = (iso?: string | null) => {
  if (!iso) return false;
  const k = baDayKey(new Date(iso));
  const todayK = baDayKey(new Date());
  return k > todayK;
};

const isSameDayBA = (iso?: string | null) => {
  if (!iso) return false;
  return baDayKey(new Date(iso)) === baDayKey(new Date());
};

const formatBA = (iso?: string | null) =>
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

const todayPretty = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ_BA, day: '2-digit', month: '2-digit', year: 'numeric'
}).format(new Date());

// ======== Etiquetas ========
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'text-red-600 border-red-600';
    case 'Medium': return 'text-yellow-700 border-yellow-700';
    case 'Low': return 'text-green-600 border-green-600';
    default: return 'text-[#5e4c1e] border-[#d4caaf]';
  }
};
const getStatusLabel = (status: string) =>
  status === 'Completed' ? 'Completada' : status === 'In Progress' ? 'En curso' : status === 'Pending' ? 'Por hacer' : status;
const getPriorityLabel = (p: string) => (p === 'High' ? 'Alta' : p === 'Medium' ? 'Media' : p === 'Low' ? 'Baja' : p);
const getClaimTypeLabel = (t: string) =>
  t === 'Semiannual Tests' ? 'Pruebas semestrales' : t === 'Monthly Maintenance' ? 'Mantenimiento mensual' : t === 'Corrective' ? 'Correctivo' : t;

// ======== Autocorrección (simple) ========
// Reemplazos de palabras/expresiones comunes de mantenimiento
const AUTOCORRECT_MAP: Array<{ pattern: RegExp; replace: string }> = [
  // Palabras sueltas (con límites de palabra)
  { pattern: /\basensor\b/gi, replace: 'ascensor' },
  { pattern: /\bvalvula\b/gi, replace: 'válvula' },
  { pattern: /\bvalvulas\b/gi, replace: 'válvulas' },
  { pattern: /\bmanija\b/gi, replace: 'manilla' }, // si preferís "manija", borrá esta línea
  { pattern: /\bplaqueta\b/gi, replace: 'placa' },
  { pattern: /\bburlete\b/gi, replace: 'burlete' }, // ejemplo para mantener igual si viene mal capitalizado
  { pattern: /\bmanten(i|í)mento\b/gi, replace: 'mantenimiento' },
  { pattern: /\bpreventibo\b/gi, replace: 'preventivo' },
  { pattern: /\bcorrectibo\b/gi, replace: 'correctivo' },
  { pattern: /\bllabe\b/gi, replace: 'llave' },
  { pattern: /\bpasamano\b/gi, replace: 'pasamanos' },

  // Frases frecuentes
  { pattern: /\bmantenimiento preventibo\b/gi, replace: 'mantenimiento preventivo' },
  { pattern: /\bpuerta cabina\b/gi, replace: 'puerta de cabina' },
  { pattern: /\bpuerta piso\b/gi, replace: 'puerta de piso' },
  { pattern: /\btablero electrico\b/gi, replace: 'tablero eléctrico' },
  { pattern: /\binterruptor termico\b/gi, replace: 'interruptor térmico' },
  { pattern: /\bcontacto electrico\b/gi, replace: 'contacto eléctrico' },
];

// Normaliza múltiples espacios y capitaliza oraciones si hace falta
function postNormalize(text: string): string {
  // compactar espacios
  let t = text.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim();
  return t;
}

// Aplica el diccionario de reemplazos
function autoCorrectText(text: string): string {
  if (!text) return text;
  let out = text;
  for (const rule of AUTOCORRECT_MAP) {
    out = out.replace(rule.pattern, rule.replace);
  }
  return postNormalize(out);
}

function autoCorrectParts(parts: Array<{ name: string; quantity: number }>): Array<{ name: string; quantity: number }> {
  return parts.map(p => ({ ...p, name: autoCorrectText(p.name) }));
}

// ======== Tipos auxiliares ========
interface DailyCounters {
  today: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export default function MyTasks() {
  const navigate = useNavigate();
  const { activeCompanyId, user } = useAuth();

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [allOrders, setAllOrders] = useState<WorkOrder[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [showHistoryForElevator, setShowHistoryForElevator] = useState<string | null>(null);
  const [elevatorHistories, setElevatorHistories] = useState<Record<string, ElevatorHistory[]>>({});

  const [dailyCounters, setDailyCounters] = useState<DailyCounters>({
    today: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [activeFilter, setActiveFilter] = useState<'today' | 'pending' | 'inProgress' | 'completed'>('today');

  // Edición
  const [comments, setComments] = useState<string>('');
  const [parts, setParts] = useState<Array<{ name: string; quantity: number }>>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [clientDni, setClientDni] = useState<string>('');
  const [clientClarification, setClientClarification] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ======== Catálogos ========
  const getBuilding = (buildingId: string) => buildings.find(b => b.id === buildingId);
  const getBuildingName = (buildingId: string) => getBuilding(buildingId)?.address || 'Desconocido';
  const getElevatorInfo = (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    return elevator ? `${elevator.number} - ${elevator.location_description}` : 'Desconocido';
  };

  // ======== Reglas de filtrado (vista técnico) ========
  const applyFilter = (ordersList: WorkOrder[], filter: 'today' | 'pending' | 'inProgress' | 'completed') => {
    let filtered = ordersList;

    if (filter === 'today') {
      filtered = ordersList.filter((o: any) => {
        if (o.status !== 'Pending') return false;
        const dt = o.date_time || o.dateTime || null;
        return isSameDayBA(dt);
      });
    } else if (filter === 'pending') {
      filtered = ordersList.filter((o: any) => {
        if (o.status !== 'Pending') return false;
        const dt = o.date_time || o.dateTime || null;
        return !dt || (!isSameDayBA(dt) && !isFutureBA(dt));
      });
    } else if (filter === 'inProgress') {
      filtered = ordersList.filter((o) => o.status === 'In Progress');
    } else if (filter === 'completed') {
      filtered = ordersList.filter((o: any) => {
        if (o.status !== 'Completed') return false;
        const ft = o.finish_time || o.finishTime || null;
        return isSameDayBA(ft);
      });
    }

    return filtered.sort((a: any, b: any) => {
      if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
      if (a.status !== 'In Progress' && b.status === 'In Progress') return 1;
      const pw = (p: string) => (p === 'High' ? 3 : p === 'Medium' ? 2 : 1);
      const diff = pw(b.priority) - pw(a.priority);
      if (diff !== 0) return diff;
      return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
    });
  };

  const recomputeCounters = (ordersAll: WorkOrder[]) => {
    setDailyCounters({
      today: applyFilter(ordersAll, 'today').length,
      pending: applyFilter(ordersAll, 'pending').length,
      inProgress: applyFilter(ordersAll, 'inProgress').length,
      completed: applyFilter(ordersAll, 'completed').length,
    });
  };

  // ======== Carga de datos ========
  const loadData = async () => {
    if (!activeCompanyId || !user) return;

    const allTechnicians = await supabaseDataLayer.listTechnicians(activeCompanyId);
    const currentTech = allTechnicians.find((t: any) => t.user_id === user.id);
    if (!currentTech) {
      setTechnician(null);
      setAllOrders([]);
      setOrders([]);
      return;
    }
    setTechnician(currentTech);

    const fetchedOrders = await supabaseDataLayer.listWorkOrders(activeCompanyId, {
      technician_id: currentTech.id,
    });

    setAllOrders(fetchedOrders);
    recomputeCounters(fetchedOrders);
    setOrders(applyFilter(fetchedOrders, activeFilter));

    const [allBuildings, allElevators] = await Promise.all([
      supabaseDataLayer.listBuildings(activeCompanyId),
      supabaseDataLayer.listElevators(activeCompanyId),
    ]);
    setBuildings(allBuildings);
    setElevators(allElevators);

    const histories: Record<string, ElevatorHistory[]> = {};
    const elevatorIds = new Set((fetchedOrders as any[]).map((o) => o.elevator_id));
    for (const eId of elevatorIds) {
      const history = await supabaseDataLayer.getElevatorHistory(eId as string, activeCompanyId);
      histories[eId as string] = history;
    }
    setElevatorHistories(histories);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeCompanyId, user]);

  useEffect(() => {
    setOrders(applyFilter(allOrders, activeFilter));
    recomputeCounters(allOrders);
  }, [activeFilter, allOrders]);

  // ======== Acciones ========
  const handleStart = async (orderId: string) => {
    if (!activeCompanyId) return;
    await supabaseDataLayer.updateWorkOrder(
      orderId,
      { status: 'In Progress', start_time: new Date().toISOString() },
      activeCompanyId
    );
    setEditingOrderId(orderId); // queda “abierta” para completar
    loadData();
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrderId(order.id);
    setComments((order as any).comments || '');
    setParts((order as any).parts_used || []);
    setPhotos((order as any).photo_urls || []);
    setSignature((order as any).signature_data_url || '');
    setClientDni((order as any).client_dni || '');
    setClientClarification((order as any).client_clarification || '');
  };

  const handleSaveChanges = async (orderId: string) => {
    if (!activeCompanyId) return;

    // ⬇️ AUTOCORRECCIÓN ANTES DE GUARDAR
    const correctedComments = autoCorrectText(comments);
    const correctedParts = autoCorrectParts(parts);
    const correctedClarification = autoCorrectText(clientClarification);

    await supabaseDataLayer.updateWorkOrder(
      orderId,
      {
        comments: correctedComments || undefined,
        parts_used: correctedParts.length > 0 ? correctedParts : undefined,
        photo_urls: photos.length > 0 ? photos : undefined,
        signature_data_url: signature || undefined,
        client_dni: clientDni || undefined,
        client_clarification: correctedClarification || undefined,
      },
      activeCompanyId
    );
    alert('¡Cambios guardados exitosamente!');
    setEditingOrderId(null);
    loadData();
  };

  const handleComplete = async (order: WorkOrder) => {
    if (!activeCompanyId) return;

    // ⬇️ AUTOCORRECCIÓN ANTES DE COMPLETAR
    const correctedComments = autoCorrectText(comments);
    const correctedParts = autoCorrectParts(parts);
    const correctedClarification = autoCorrectText(clientClarification);

    await supabaseDataLayer.updateWorkOrder(
      order.id,
      {
        status: 'Completed',
        finish_time: new Date().toISOString(),
        comments: correctedComments || undefined,
        parts_used: correctedParts.length > 0 ? correctedParts : undefined,
        photo_urls: photos.length > 0 ? photos : undefined,
        signature_data_url: signature || undefined,
        client_dni: clientDni || undefined,
        client_clarification: correctedClarification || undefined,
      },
      activeCompanyId
    );

    await supabaseDataLayer.addElevatorHistory(
      {
        elevator_id: (order as any).elevator_id,
        work_order_id: order.id,
        date: new Date().toISOString().split('T')[0],
        description: `${getClaimTypeLabel((order as any).claim_type)} - ${order.description}`,
        technician_name: technician?.name || 'Desconocido',
      },
      activeCompanyId
    );

    if (editingOrderId === order.id) setEditingOrderId(null);
    setComments('');
    setParts([]);
    setPhotos([]);
    setSignature('');
    setClientDni('');
    setClientClarification('');
    alert('¡Tarea completada exitosamente!');
    loadData();
  };

  const handleRevisit = async (order: WorkOrder) => {
    if (!activeCompanyId) return;
    try {
      // ⬇️ AUTOCORRECCIÓN ANTES DE REVISITA
      const correctedComments = autoCorrectText(comments);
      const correctedParts = autoCorrectParts(parts);
      const correctedClarification = autoCorrectText(clientClarification);

      await supabaseDataLayer.updateWorkOrder(
        order.id,
        {
          status: 'Completed',
          finish_time: new Date().toISOString(),
          comments: correctedComments || undefined,
          parts_used: correctedParts.length > 0 ? correctedParts : undefined,
          photo_urls: photos.length > 0 ? photos : undefined,
          signature_data_url: signature || undefined,
          client_dni: clientDni || undefined,
          client_clarification: correctedClarification || undefined,
        },
        activeCompanyId
      );

      const building = await supabaseDataLayer.getBuilding((order as any).building_id, activeCompanyId);
      const contactName = (order as any).contact_name || (building as any)?.client_name || 'Contacto';
      const contactPhone = (order as any).contact_phone || (building as any)?.contact_phone || 'N/A';

      await supabaseDataLayer.createWorkOrder(
        {
          company_id: activeCompanyId,
          claim_type: (order as any).claim_type,
          corrective_type: (order as any).corrective_type,
          building_id: (order as any).building_id,
          elevator_id: (order as any).elevator_id,
          technician_id: null,
          contact_name: contactName,
          contact_phone: contactPhone,
          description: `Revisita de OT #${order.id}: ${order.description}`,
          status: 'Pending',
          priority: (order as any).priority || 'Medium',
          comments: undefined,
          parts_used: undefined,
          photo_urls: undefined,
        },
        activeCompanyId
      );

      await supabaseDataLayer.addElevatorHistory(
        {
          elevator_id: (order as any).elevator_id,
          work_order_id: order.id,
          date: new Date().toISOString().split('T')[0],
          description: `${getClaimTypeLabel((order as any).claim_type)} - ${order.description}`,
          technician_name: technician?.name || 'Desconocido',
        },
        activeCompanyId
      );

      if (editingOrderId === order.id) setEditingOrderId(null);
      setComments('');
      setParts([]);
      setPhotos([]);
      setSignature('');
      setClientDni('');
      setClientClarification('');

      alert('✅ Orden completada y revisita creada.');
      await loadData();
    } catch (error) {
      console.error('Error al crear revisita:', error);
      alert(`❌ No se pudo crear la revisita: ${error instanceof Error ? error.message : 'ver consola'}`);
    }
  };

  // ======== Render ========
  const kpiButton = (
    key: 'today' | 'pending' | 'inProgress' | 'completed',
    label: string,
    value: number,
    extraClasses = ''
  ) => (
    <button
      onClick={() => setActiveFilter(key)}
      className={`p-3 rounded-lg border-2 text-center shadow-sm transition-all ${
        activeFilter === key ? 'bg-yellow-100 border-yellow-500' : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${extraClasses}`}
    >
      <p className="text-xs text-[#520f0f]">{label}</p>
      <p className="text-2xl font-bold text-[#520f0f]">{value}</p>
    </button>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-[#694e35] mb-2">Mis Tareas</h2>
        <p className="text-[#5e4c1e]">
          {technician ? `${technician.name} - ${technician.role}` : 'Tus órdenes de trabajo asignadas'}
        </p>
        <p className="text-[#5e4c1e]">Hoy: {todayPretty}</p>
      </div>

      {/* Counters */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiButton('today', 'HOY', dailyCounters.today)}
          {kpiButton('pending', 'Por hacer', dailyCounters.pending, 'text-yellow-600')}
          {kpiButton('inProgress', 'En curso', dailyCounters.inProgress, 'text-blue-600')}
          {kpiButton('completed', 'Completadas', dailyCounters.completed, 'text-green-600')}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
          <p className="text-[#5e4c1e] text-lg">No hay tareas asignadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const building = getBuilding(order.building_id);
            const isEditing = order.status === 'In Progress' || editingOrderId === order.id;

            const contactPhone =
              (order as any).contact_phone ||
              (building as any)?.contact_phone ||
              '';

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-2 py-0.5 text-xs font-medium border ${getPriorityColor(order.priority)} rounded`}>
                          {getPriorityLabel(order.priority)}
                        </span>
                        <span className="text-sm text-[#5e4c1e]">
                          Estado: {getStatusLabel(order.status)}
                        </span>
                        <span className="text-sm text-[#5e4c1e]">
                          {getClaimTypeLabel(order.claim_type)}
                        </span>
                      </div>

                      {/* Título principal: Dirección */}
                      <h3 className="text-2xl font-bold text-[#694e35]">{getBuildingName(order.building_id)}</h3>
                      {/* Ascensor */}
                      <p className="text-[#694e35]">Ascensor: {getElevatorInfo(order.elevator_id)}</p>
                      {/* Descripción */}
                      <p className="text-sm text-[#5e4c1e]">{order.description}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5e4c1e]">
                        {building?.entry_hours && (
                          <span>Horario de ingreso: <span className="font-medium">{building.entry_hours}</span></span>
                        )}
                        {contactPhone && (
                          <span>Teléfono: <span className="font-medium">{contactPhone}</span></span>
                        )}
                        {order.date_time && (
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatBA(order.date_time)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHistoryForElevator(prev => (prev === order.elevator_id ? null : order.elevator_id));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-[#520f0f] rounded-lg font-medium hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                      >
                        <HistoryIcon size={18} />
                        Historial del ascensor
                      </button>

                      {order.status !== 'In Progress' && editingOrderId !== order.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(order);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                        >
                          <Save size={18} />
                          Editar Tarea
                        </button>
                      )}

                      {order.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStart(order.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                        >
                          <Play size={18} />
                          Iniciar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección inferior */}
                <div className="border-t-2 border-[#d4caaf] p-6 bg-white space-y-6">
                  {/* Historial (toggle) */}
                  {showHistoryForElevator === order.elevator_id && (
                    <div className="bg-[#f4ead0] p-4 rounded-lg border-2 border-[#d4caaf]">
                      <h4 className="font-bold text-[#694e35] mb-3 flex items-center gap-2">
                        <HistoryIcon size={18} />
                        Historial del Ascensor {getElevatorInfo(order.elevator_id)}
                      </h4>
                      {(() => {
                        const list = elevatorHistories[order.elevator_id];
                        if (!list || list.length === 0) {
                          return <p className="text-sm text-[#5e4c1e]">No hay historial registrado para este ascensor</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {list.map((entry) => (
                              <div key={entry.id} className="bg-white p-3 rounded-lg border border-[#d4caaf]">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-[#694e35] text-sm">{(entry as any).technician_name}</span>
                                  <span className="text-xs text-[#5e4c1e]">
                                    {new Date(entry.date).toLocaleDateString('es-AR')}
                                  </span>
                                </div>
                                <p className="text-sm text-[#5e4c1e]">{entry.description}</p>

                                {entry.work_order_id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/task/${entry.work_order_id}`);
                                    }}
                                    className="mt-2 text-sm text-[#694e35] underline hover:text-[#fcca53]"
                                  >
                                    Ver Orden de Trabajo →
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Edición rápida */}
                  {(order.status === 'In Progress' || editingOrderId === order.id) && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[#694e35] font-bold mb-2">Comentarios</label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          onBlur={() => setComments(prev => autoCorrectText(prev))} // ⬅️ autocorrección al salir
                          rows={4}
                          spellCheck={true}
                          autoCorrect="on"
                          autoCapitalize="sentences"
                          className="w-full px-4 py-3 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          placeholder="Agregar notas u observaciones..."
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[#694e35] font-bold">Repuestos Utilizados</label>
                          <button
                            type="button"
                            onClick={() => setParts([...parts, { name: '', quantity: 1 }])}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-500 text-[#520f0f] rounded-lg hover:bg-yellow-400 transition-colors"
                          >
                            <Plus size={16} />
                            Agregar Repuesto
                          </button>
                        </div>
                        {parts.length === 0 ? (
                          <p className="text-sm text-[#5e4c1e]">No se agregaron repuestos</p>
                        ) : (
                          <div className="space-y-2">
                            {parts.map((part, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Nombre del repuesto"
                                  value={part.name}
                                  onChange={(e) => {
                                    const next = [...parts];
                                    next[index] = { ...next[index], name: e.target.value };
                                    setParts(next);
                                  }}
                                  onBlur={() => {
                                    setParts(prev => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], name: autoCorrectText(next[index].name) }; // ⬅️ autocorrige
                                      return next;
                                    });
                                  }}
                                  spellCheck={true}
                                  autoCorrect="on"
                                  autoCapitalize="sentences"
                                  className="flex-1 px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                                />
                                <input
                                  type="number"
                                  placeholder="Cant"
                                  value={part.quantity}
                                  onChange={(e) => {
                                    const next = [...parts];
                                    next[index] = { ...next[index], quantity: parseInt(e.target.value) || 1 };
                                    setParts(next);
                                  }}
                                  className="w-24 px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setParts(parts.filter((_, i) => i !== index))}
                                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[#694e35] font-bold mb-2">Fotos</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || !activeCompanyId) return;
                            const newPhotos = [...photos];
                            for (let i = 0; i < files.length; i++) {
                              const url = await supabaseDataLayer.uploadPhoto(files[i], activeCompanyId, order.id);
                              if (url) newPhotos.push(url);
                            }
                            setPhotos(newPhotos);
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg hover:bg-yellow-400 transition-colors mb-3"
                        >
                          <Camera size={18} />
                          Agregar Fotos
                        </button>
                        {photos.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {photos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={photo}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border-2 border-[#d4caaf]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[#694e35] font-bold mb-2">Firma del Cliente</label>
                        <SignaturePad onSave={setSignature} initialSignature={signature} />

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[#694e35] font-bold mb-2">DNI</label>
                            <input
                              type="text"
                              value={clientDni}
                              onChange={(e) => setClientDni(e.target.value)}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                              placeholder="Documento del cliente"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-bold mb-2">Aclaración</label>
                            <input
                              type="text"
                              value={clientClarification}
                              onChange={(e) => setClientClarification(e.target.value)}
                              onBlur={() => setClientClarification(prev => autoCorrectText(prev))} // ⬅️ autocorrección
                              spellCheck={true}
                              autoCorrect="on"
                              autoCapitalize="sentences"
                              className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                              placeholder="Nombre y apellido en claro"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-4 border-t border-[#d4caaf]">
                        <button
                          onClick={() => handleSaveChanges(order.id)}
                          className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                        >
                          <Save size={18} />
                          Guardar Cambios
                        </button>

                        {order.status === 'In Progress' && (
                          <>
                            <button
                              onClick={() => handleComplete(order)}
                              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-800"
                            >
                              <CheckCircle size={18} />
                              Completar Tarea
                            </button>

                            <button
                              onClick={() => handleRevisit(order)}
                              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                            >
                              <RotateCcw size={18} />
                              Revisita
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
