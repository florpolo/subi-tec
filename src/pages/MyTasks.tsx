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
  if (!iso) return true; // sin fecha => permitido en Pending
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

// ======== Tipos auxiliares ========
interface DailyCounters {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  unassigned: number;
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
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    unassigned: 0
  });
  const [activeFilter, setActiveFilter] = useState<'total' | 'pending' | 'inProgress' | 'completed'>('total');

  // Edición (estado compartido para el bloque activo)
  const [comments, setComments] = useState<string>('');
  const [parts, setParts] = useState<Array<{ name: string; quantity: number }>>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ======== Catálogos ========
  const getBuilding = (buildingId: string) => buildings.find(b => b.id === buildingId);
  const getBuildingName = (buildingId: string) => getBuilding(buildingId)?.address || 'Desconocido';
  const getElevatorInfo = (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    return elevator ? `${elevator.number} - ${elevator.location_description}` : 'Desconocido';
  };

  // ======== Reglas de filtrado (vista técnico) ========
  const applyFilter = (ordersList: WorkOrder[], filter: 'total' | 'pending' | 'inProgress' | 'completed') => {
    let filtered = ordersList;

    if (filter === 'total') {
      filtered = ordersList.filter((o: any) => {
        if (o.status === 'Pending') {
          if (!o.date_time && !o.dateTime) return true;
          return !isFutureBA(o.date_time || o.dateTime);
        }
        if (o.status === 'In Progress') return true;
        if (o.status === 'Completed') return true;
        return false;
      });
    } else if (filter === 'pending') {
      filtered = ordersList.filter((o: any) => {
        if (o.status !== 'Pending') return false;
        const dt = o.date_time || o.dateTime || null;
        return isOnOrBeforeTodayBA(dt);
      });
    } else if (filter === 'inProgress') {
      filtered = ordersList.filter((o) => o.status === 'In Progress');
    } else if (filter === 'completed') {
      filtered = ordersList.filter((o) => o.status === 'Completed');
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
      total: applyFilter(ordersAll, 'total').length,
      pending: applyFilter(ordersAll, 'pending').length,
      inProgress: applyFilter(ordersAll, 'inProgress').length,
      completed: applyFilter(ordersAll, 'completed').length,
      unassigned: 0,
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

    // Historial por ascensor
    const histories: Record<string, ElevatorHistory[]> = {};
    const elevatorIds = new Set(fetchedOrders.map((o: any) => o.elevator_id));
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
  };

  const handleSaveChanges = async (orderId: string) => {
    if (!activeCompanyId) return;
    await supabaseDataLayer.updateWorkOrder(
      orderId,
      {
        comments,
        parts_used: parts.length > 0 ? parts : undefined,
        photo_urls: photos.length > 0 ? photos : undefined,
        signature_data_url: signature || undefined,
      },
      activeCompanyId
    );
    alert('¡Cambios guardados exitosamente!');
    setEditingOrderId(null);
    loadData();
  };

  const handleComplete = async (order: WorkOrder) => {
    if (!activeCompanyId) return;
    await supabaseDataLayer.updateWorkOrder(
      order.id,
      {
        status: 'Completed',
        finish_time: new Date().toISOString(),
        comments,
        parts_used: parts.length > 0 ? parts : undefined,
        photo_urls: photos.length > 0 ? photos : undefined,
        signature_data_url: signature || undefined,
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
    alert('¡Tarea completada exitosamente!');
    loadData();
  };

  const handleRevisit = async (order: WorkOrder) => {
    if (!activeCompanyId) return;
    try {
      await supabaseDataLayer.updateWorkOrder(
        order.id,
        {
          status: 'Completed',
          finish_time: new Date().toISOString(),
          comments,
          parts_used: parts.length > 0 ? parts : undefined,
          photo_urls: photos.length > 0 ? photos : undefined,
          signature_data_url: signature || undefined,
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

      alert('✅ Orden completada y revisita creada.');
      await loadData();
    } catch (error) {
      console.error('Error al crear revisita:', error);
      alert(`❌ No se pudo crear la revisita: ${error instanceof Error ? error.message : 'ver consola'}`);
    }
  };

  // ======== Render ========
  const kpiButton = (key: 'total' | 'pending' | 'inProgress' | 'completed', label: string, value: number, extraClasses = '') => (
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
          {kpiButton('total', 'Total', dailyCounters.total)}
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

            // Teléfono de contacto
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

                    {/* Acciones (siempre visibles) */}
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

                      {/* Si ya está "En curso", no hace falta mostrar Editar (ya está abierto) */}
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

                {/* Sección inferior SIEMPRE presente (sin flecha). */}
                <div className="border-t-2 border-[#d4caaf] p-6 bg-white space-y-6">
                  {/* Historial (toggle) */}
                  {showHistoryForElevator === order.elevator_id && (
                    <div className="bg-[#f4ead0] p-4 rounded-lg border-2 border-[#d4caaf]">
                      <h4 className="font-bold text-[#694e35] mb-3 flex items-center gap-2">
                        <HistoryIcon size={18} />
                        Historial del Ascensor {getElevatorInfo(order.elevator_id)}
                      </h4>
                      {elevatorHistories[order.elevator_id]?.length === 0 ? (
                        <p className="text-sm text-[#5e4c1e]">No hay historial registrado para este ascensor</p>
                      ) : (
                        <div className="space-y-2">
                          {elevatorHistories[order.elevator_id]?.map((entry) => (
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
                      )}
                    </div>
                  )}

                  {/* Edición rápida: visible SI la orden está En curso o si el usuario presionó Editar */}
                  {isEditing && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[#694e35] font-bold mb-2">Comentarios</label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={4}
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
