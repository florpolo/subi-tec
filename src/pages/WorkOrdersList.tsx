import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, WorkOrder, Building, Elevator, Technician } from '../lib/dataLayer';
import { Search, Filter, FileText, Clock, AlertCircle, PlayCircle, CheckCircle } from 'lucide-react';
import usePreserveScroll from '../hooks/usePreserveScroll';

// --- Zona horaria Buenos Aires ---
const TZ_BA = 'America/Argentina/Buenos_Aires';

// Normaliza: minúsculas y sin acentos (p.ej. "Córdoba" -> "cordoba")
const normalize = (s?: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');

// Clave de día BA: "YYYY-MM-DD" (evita corrimientos)
const baDayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_BA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // en-CA => YYYY-MM-DD

// Instante relevante para filtrar por fecha:
// - Completed -> finalización
// - Otros     -> programada
const getRelevantInstant = (o: any): Date | null => {
  const status = String(o?.status || '').toLowerCase();
  const finishedISO = o?.finishTime ?? o?.finish_time ?? null;
  const scheduledISO = o?.dateTime ?? o?.date_time ?? null;
  if (status === 'completed') return finishedISO ? new Date(finishedISO) : null;
  return scheduledISO ? new Date(scheduledISO) : null;
};

// Mostrar SIEMPRE en horario BA
const formatBA = (iso?: string) =>
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

// Etiquetas
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return 'text-red-700 border-red-600';
    case 'Medium': return 'text-amber-700 border-amber-600';
    case 'Low': return 'text-green-700 border-green-600';
    default: return 'text-[#5e4c1e] border-[#d4caaf]';
  }
};
const getPriorityLabel = (priority: string) =>
  priority === 'High' ? 'Alta' : priority === 'Medium' ? 'Media' : priority === 'Low' ? 'Baja' : priority;
const getStatusLabel = (status: string) =>
  status === 'Completed' ? 'Completada' : status === 'In Progress' ? 'En curso' : status === 'Pending' ? 'Por hacer' : status;
const getClaimTypeLabel = (claimType: string) =>
  claimType === 'Semiannual Tests'
    ? 'Pruebas semestrales'
    : claimType === 'Monthly Maintenance'
    ? 'Mantenimiento mensual'
    : claimType === 'Corrective'
    ? 'Correctivo'
    : claimType;

// VISIBILIDAD BASE (SIN limpieza por día):
// → Todas las órdenes, sin ocultar completadas antiguas.
const baseVisibility = (list: WorkOrder[]) => list;

export default function WorkOrdersList() {
  usePreserveScroll('workOrdersListScroll');

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  const [ordersRaw, setOrdersRaw] = useState<WorkOrder[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Filtros UI
  const [activeKpiFilter, setActiveKpiFilter] = useState<string>(() => sessionStorage.getItem('workOrders_activeKpiFilter') || 'today');
  const [priorityFilter, setPriorityFilter] = useState<string>(() => sessionStorage.getItem('workOrders_priorityFilter') || '');
  const [technicianFilter, setTechnicianFilter] = useState<string>(() => sessionStorage.getItem('workOrders_technicianFilter') || '');
  const [searchTerm, setSearchTerm] = useState<string>(() => sessionStorage.getItem('workOrders_searchTerm') || '');
  const [dateFilter, setDateFilter] = useState<string>(() => sessionStorage.getItem('workOrders_dateFilter') || '');

  // KPIs (sobre visibilidad base = todas las órdenes)
  // total => "Hoy" (Pending con fecha programada = hoy)
  // pending => "Por hacer" (Pending sin fecha, con fecha ≠ hoy, o sin técnico)
  // completed => Completadas hoy
  const [kpis, setKpis] = useState({
    total: 0,
    pending: 0,
    unassigned: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    sessionStorage.setItem('workOrders_activeKpiFilter', activeKpiFilter);
    sessionStorage.setItem('workOrders_priorityFilter', priorityFilter);
    sessionStorage.setItem('workOrders_technicianFilter', technicianFilter);
    sessionStorage.setItem('workOrders_searchTerm', searchTerm);
    sessionStorage.setItem('workOrders_dateFilter', dateFilter);
  }, [activeKpiFilter, priorityFilter, technicianFilter, searchTerm, dateFilter]);

  const loadData = async () => {
    const allOrders = await dataLayer.listWorkOrders();
    setOrdersRaw(allOrders);

    const [buildingsList, elevatorsList, techniciansList] = await Promise.all([
      dataLayer.listBuildings(),
      dataLayer.listElevators(),
      dataLayer.listTechnicians()
    ]);
    setBuildings(buildingsList);
    setElevators(elevatorsList);
    setTechnicians(techniciansList);

    // KPIs con la lógica nueva
    const base = baseVisibility(allOrders);
    const todayKey = baDayKey(new Date());

    // "Hoy": Pending con fecha programada = hoy (BA)
    const pendingToday = base.filter((o: any) => {
      if (o.status !== 'Pending') return false;
      const when = getRelevantInstant(o);
      if (!when) return false;
      return baDayKey(when) === todayKey;
    });

    // "Por hacer":
    // - Pending sin fecha programada
    // - Pending con fecha programada ≠ hoy
    // - Pending sin técnico asignado
    const toDo = base.filter((o: any) => {
      if (o.status !== 'Pending') return false;
      const when = getRelevantInstant(o); // programada para Pending
      const noDateOrDifferentDay = !when || baDayKey(when) !== todayKey;
      const noTechnician = !o.technicianId;
      return noDateOrDifferentDay || noTechnician;
    });

    const unassigned = base.filter(o => o.status === 'Pending' && !o.technicianId);
    const inProgress = base.filter(o => o.status === 'In Progress');

    // "Completadas": Completed cuya fecha de finalización = hoy (BA)
    const completedToday = base.filter((o: any) => {
      if (o.status !== 'Completed') return false;
      const when = getRelevantInstant(o); // finalización para Completed
      if (!when) return false;
      return baDayKey(when) === todayKey;
    });

    setKpis({
      total: pendingToday.length,
      pending: toDo.length,
      unassigned: unassigned.length,
      inProgress: inProgress.length,
      completed: completedToday.length,
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // --------- PIPELINE DE VISUALIZACIÓN ---------
  const visible = useMemo(() => {
    let filtered: WorkOrder[] = baseVisibility(ordersRaw);
    const todayKey = baDayKey(new Date());

    // KPI (estado) como filtro de la lista, según la lógica nueva
    if (activeKpiFilter === 'today') {
      // "Hoy": Pending con fecha programada = hoy
      filtered = filtered.filter((o: any) => {
        if (o.status !== 'Pending') return false;
        const when = getRelevantInstant(o);
        if (!when) return false;
        return baDayKey(when) === todayKey;
      });
    } else if (activeKpiFilter === 'Pending') {
      // "Por hacer": Pending sin fecha, con fecha ≠ hoy o sin técnico
      filtered = filtered.filter((o: any) => {
        if (o.status !== 'Pending') return false;
        const when = getRelevantInstant(o);
        const noDateOrDifferentDay = !when || baDayKey(when) !== todayKey;
        const noTechnician = !o.technicianId;
        return noDateOrDifferentDay || noTechnician;
      });
    } else if (activeKpiFilter === 'In Progress') {
      filtered = filtered.filter(o => o.status === 'In Progress');
    } else if (activeKpiFilter === 'Completed') {
      // Completadas hoy
      filtered = filtered.filter((o: any) => {
        if (o.status !== 'Completed') return false;
        const when = getRelevantInstant(o);
        if (!when) return false;
        return baDayKey(when) === todayKey;
      });
    } else if (activeKpiFilter === 'CompletedAll') {
      // Nueva "pestaña": todas las completadas (sin importar fecha)
      filtered = filtered.filter(o => o.status === 'Completed');
    } else if (activeKpiFilter === 'unassigned') {
      filtered = filtered.filter(o => o.status === 'Pending' && !o.technicianId);
    }

    // Prioridad / Técnico
    if (priorityFilter) {
      filtered = filtered.filter(o => o.priority === priorityFilter);
    }
    if (technicianFilter) {
      filtered = filtered.filter(o => o.technicianId === technicianFilter);
    }

    // Filtro por FECHA (día BA, programada vs finalizada)
    if (dateFilter) {
      filtered = filtered.filter((o: any) => {
        const when = getRelevantInstant(o);
        if (!when) return false; // sin fecha relevante no entra al día filtrado
        return baDayKey(when) === dateFilter;
      });
    }

    // Búsqueda (solo dirección y barrio del edificio; insensible a acentos)
    if (searchTerm) {
      const q = normalize(searchTerm);

      // mapa para acceso rápido al edificio por id
      const bById = new Map(buildings.map(b => [b.id, b]));

      filtered = filtered.filter((o) => {
        const b = bById.get(o.buildingId);
        return (
          normalize(b?.address).includes(q) ||       // dirección (calle)
          normalize(b?.neighborhood).includes(q)     // barrio
        );
      });
    }

    // Ordenar (prioridad > creación)
    return filtered.sort((a, b) => {
      const weights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      const aw = weights[a.priority] ?? 0;
      const bw = weights[b.priority] ?? 0;
      if (aw !== bw) return bw - aw;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [ordersRaw, activeKpiFilter, priorityFilter, technicianFilter, dateFilter, searchTerm, buildings]);
  
  usePreserveScroll('workOrdersListScroll', [visible]);

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.address || 'Desconocido';
  };
  const getElevatorInfo = (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    return elevator ? `${elevator.number} - ${elevator.locationDescription}` : 'Desconocido';
  };
  const getTechnicianName = (technicianId?: string) => {
    if (!technicianId) return 'Sin asignar';
    const technician = technicians.find(t => t.id === technicianId);
    return technician?.name || 'Desconocido';
  };

  const todayPretty = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ_BA, day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date());

  // KPIs (números fijos sobre base; al click filtran la lista)
  const kpiCards = [
    // "Hoy": Pending con fecha programada = hoy
    { label: 'Hoy', value: kpis.total, icon: FileText, filter: 'today' },
    // "Por hacer" con la lógica nueva
    { label: 'Por hacer', value: kpis.pending, icon: Clock, filter: 'Pending' },
    { label: 'Por asignar', value: kpis.unassigned, icon: AlertCircle, filter: 'unassigned' },
    { label: 'En curso', value: kpis.inProgress, icon: PlayCircle, filter: 'In Progress' },
    // Completadas hoy (cambio de texto acá)
    { label: 'Completadas del día', value: kpis.completed, icon: CheckCircle, filter: 'Completed' },
    // "Pestaña" nueva: todas las completadas (hoy + anteriores)
    { label: 'Todas las completadas', value: ordersRaw.filter(o => o.status === 'Completed').length, icon: CheckCircle, filter: 'CompletedAll' },
  ];

  const handleKpiClick = (filter: string) => {
    setActiveKpiFilter(filter);
    // si querés, podés limpiar otros filtros aquí
    // setTechnicianFilter(''); setPriorityFilter(''); setSearchTerm(''); setDateFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#694e35]">Órdenes</h2>
          <p className="text-[#5e4c1e]">Hoy: {todayPretty}</p>
        </div>
        <Link
          to="/orders/new"
          className="px-6 py-3 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#520f0f] text-center"
        >
          + Crear orden de trabajo
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isActive = activeKpiFilter === kpi.filter;
          return (
            <button
              key={kpi.label}
              onClick={() => handleKpiClick(kpi.filter)}
              className={`bg-white rounded-xl p-4 border-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#520f0f] ${
                isActive ? 'border-[#520f0f] ring-2 ring-yellow-500' : 'border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={24} className="text-[#520f0f]" />
                <p className="text-3xl font-bold text-[#520f0f]">{kpi.value}</p>
              </div>
              <p className="text-sm text-[#520f0f] font-medium text-left">{kpi.label}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-[#520f0f]" />
          <h3 className="font-bold text-[#520f0f]">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e4c1e]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-[#520f0f] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-[#520f0f] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-[#520f0f] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="">Todas las prioridades</option>
            <option value="High">Alta</option>
            <option value="Medium">Media</option>
            <option value="Low">Baja</option>
          </select>

          <select
            value={technicianFilter === 'unassigned' ? '' : technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-[#520f0f] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="">Todos los técnicos</option>
            {technicians.map(tech => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-300 p-8 text-center shadow-sm">
          <p className="text-[#5e4c1e] text-lg">No se encontraron órdenes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visible.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow border-2 border-gray-300 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 text-sm font-bold border-2 ${getPriorityColor(order.priority)} rounded`}>
                      {getPriorityLabel(order.priority)}
                    </span>
                    <span className="text-sm text-[#5e4c1e]">
                      Estado: {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <h3 className="text-[#694e35] font-bold text-xl">{getBuildingName(order.buildingId)}</h3>
                  <p className="text-[#5e4c1e] text-sm">{order.description}</p>
                  <p className="text-[#5e4c1e] text-sm">Técnico: {getTechnicianName(order.technicianId)}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-4 py-2 bg-gray-300 text-[#520f0f] rounded-lg font-medium hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f] text-sm"
                  >
                    Ver
                  </Link>
                  <Link
                    to={`/orders/${order.id}/edit`}
                    className="px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-medium hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f] text-sm"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
