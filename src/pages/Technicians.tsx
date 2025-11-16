// src/pages/Technicians.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, Technician, WorkOrder } from '../lib/dataLayer';
import { Users, Circle, Plus, Edit } from 'lucide-react';
import usePreserveScroll from '../hooks/usePreserveScroll';

interface DailyCounters {
  total: number;      // HOY (igual que "today" en MyTasks)
  pending: number;    // Por hacer (sin fecha + vencidas)
  inProgress: number; // En curso
  completed: number;  // Completadas HOY
}

// ==== helpers de fecha en BA, igual concepto que en MyTasks.tsx ====
const TZ_BA = 'America/Argentina/Buenos_Aires';

const baDayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_BA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

const isTodayBA = (iso?: string | null) => {
  if (!iso) return false;
  const k = baDayKey(new Date(iso));
  const todayK = baDayKey(new Date());
  return k === todayK;
};

const isBeforeTodayBA = (iso?: string | null) => {
  if (!iso) return false;
  const k = baDayKey(new Date(iso));
  const todayK = baDayKey(new Date());
  return k < todayK;
};

// ==== misma lógica de contadores que en MyTasks, pero por técnico ====
const getTodayCounters = (allOrders: WorkOrder[], technicianId: string): DailyCounters => {
  const techOrders = allOrders.filter(o => o.technicianId === technicianId);

  // HOY: Pending con fecha programada = hoy
  const todayPending = techOrders.filter((o: any) => {
    if (o.status !== 'Pending') return false;
    const dt = o.date_time || o.dateTime || null;
    return isTodayBA(dt);
  });

  // Por hacer:
  // - Pending sin fecha
  // - Pending con fecha ANTES de hoy
  const pending = techOrders.filter((o: any) => {
    if (o.status !== 'Pending') return false;
    const dt = o.date_time || o.dateTime || null;
    return !dt || isBeforeTodayBA(dt);
  });

  // En curso: todas las In Progress (sin limitar a hoy)
  const inProgress = techOrders.filter(o => o.status === 'In Progress');

  // Completadas: Completed finalizadas HOY
  const completed = techOrders.filter((o: any) => {
    if (o.status !== 'Completed') return false;
    const fin = o.finish_time || o.finishTime || o.completion_time || null;
    return isTodayBA(fin);
  });

  return {
    total: todayPending.length,       // "Total del día" = HOY del técnico
    pending: pending.length,          // "Por hacer"
    inProgress: inProgress.length,    // "En curso"
    completed: completed.length,      // "Completadas del día"
  };
};

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  // ⬇️ Binario: solo 'free' | 'busy'
  const [technicianStatuses, setTechnicianStatuses] = useState<Record<string, 'free' | 'busy'>>({});
  const [dailyCounters, setDailyCounters] = useState<Record<string, DailyCounters>>({});

  // Edit mode state
  const [editingTechnicianId, setEditingTechnicianId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'Reclamista' | 'Engrasador'>('Reclamista');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editContact, setEditContact] = useState('');

  usePreserveScroll('techniciansListScroll', [technicians]);

  const loadData = async () => {
    const techs = await dataLayer.listTechnicians();
    setTechnicians(techs);

    const statuses: Record<string, 'free' | 'busy'> = {};
    const counters: Record<string, DailyCounters> = {};

    // Get all work orders once
    const allOrders = await dataLayer.listWorkOrders();

    for (const tech of techs) {
      // 🔴 busy si tiene ≥1 In Progress, 🟢 free en cualquier otro caso
      const hasInProgress = allOrders.some(
        o => o.technicianId === tech.id && o.status === 'In Progress'
      );
      statuses[tech.id] = hasInProgress ? 'busy' : 'free';

      // Contadores alineados con MyTasks.tsx
      counters[tech.id] = getTodayCounters(allOrders, tech.id);
    }

    setTechnicianStatuses(statuses);
    setDailyCounters(counters);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleEditTechnician = (tech: Technician) => {
    setEditingTechnicianId(tech.id);
    setEditName(tech.name);
    setEditRole(tech.role);
    setEditSpecialty(tech.specialty);
    setEditContact(tech.contact);
  };

  const handleCancelEdit = () => {
    setEditingTechnicianId(null);
    setEditName('');
    setEditRole('Reclamista');
    setEditSpecialty('');
    setEditContact('');
  };

  const handleSaveTechnician = async (techId: string) => {
    if (!editName.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    await dataLayer.updateTechnician(techId, {
      name: editName.trim(),
      role: editRole,
      specialty: editSpecialty.trim(),
      contact: editContact.trim(),
    });

    alert('¡Técnico actualizado exitosamente!');
    setEditingTechnicianId(null);
    await loadData();
  };

  // ⬇️ Semáforo binario
  const getStatusColor = (status: 'free' | 'busy') => {
    return status === 'busy' ? 'text-red-600' : 'text-green-600';
  };

  const getStatusLabel = (status: 'free' | 'busy') => {
    return status === 'busy' ? 'Ocupado' : 'Disponible';
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'Reclamista' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#694e35] mb-2">Técnicos</h2>
          <p className="text-[#5e4c1e]">Gestionar información y disponibilidad de técnicos</p>
        </div>
        <Link
          to="/technicians/new"
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
        >
          <Plus size={20} />
          Crear técnico
        </Link>
      </div>

      {technicians.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
          <p className="text-[#5e4c1e] text-lg">No hay técnicos en el sistema</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((technician) => {
            const status: 'free' | 'busy' = technicianStatuses[technician.id] || 'free';
            return (
              <div
                key={technician.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#fcca53] rounded-full">
                      <Users size={24} className="text-[#694e35]" />
                    </div>
                    <div className="flex-1">
                      <Link to={`/technicians/${technician.id}`}>
                        <h3 className="text-xl font-bold text-[#694e35] hover:text-[#fcca53] transition-colors">
                          {technician.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Circle
                          size={12}
                          className={`${getStatusColor(status)} fill-current`}
                        />
                        <span className="text-sm text-[#5e4c1e] font-medium">
                          {getStatusLabel(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {editingTechnicianId === technician.id ? (
                    <div className="space-y-3">
                      <h4 className="font-bold text-[#694e35]">Editar Técnico</h4>
                      <div>
                        <label className="block text-[#5e4c1e] text-sm mb-1">Nombre</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#5e4c1e] text-sm mb-1">Rol</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as 'Reclamista' | 'Engrasador')}
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        >
                          <option value="Reclamista">Reclamista</option>
                          <option value="Engrasador">Engrasador</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#5e4c1e] text-sm mb-1">Especialidad</label>
                        <input
                          type="text"
                          value={editSpecialty}
                          onChange={(e) => setEditSpecialty(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#5e4c1e] text-sm mb-1">Contacto</label>
                        <input
                          type="tel"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 bg-gray-300 text-[#520f0f] rounded-lg font-medium hover:bg-gray-400 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveTechnician(technician.id)}
                          className="flex-1 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-medium hover:bg-yellow-400 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Daily Counters */}
                      <div className="bg-white p-3 rounded-lg border-2 border-[#d4caaf]">
                        <h4 className="text-xs font-bold text-[#5e4c1e] mb-2">TAREAS</h4>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Total del día</p>
                            <p className="text-lg font-bold text-[#694e35]">
                              {dailyCounters[technician.id]?.total || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Por hacer</p>
                            <p className="text-lg font-bold text-yellow-600">
                              {dailyCounters[technician.id]?.pending || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">En curso</p>
                            <p className="text-lg font-bold text-blue-600">
                              {dailyCounters[technician.id]?.inProgress || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Completadas</p>
                            <p className="text-lg font-bold text-green-600">
                              {dailyCounters[technician.id]?.completed || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-[#5e4c1e]">Rol</span>
                        <div className="mt-1">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${getRoleBadgeColor(
                              technician.role
                            )}`}
                          >
                            {technician.role}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-[#5e4c1e]">Especialidad</span>
                        <p className="font-medium text-[#694e35] mt-1">{technician.specialty}</p>
                      </div>

                      <div>
                        <span className="text-sm text-[#5e4c1e]">Contacto</span>
                        <p className="font-medium text-[#694e35] mt-1">{technician.contact}</p>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditTechnician(technician)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-medium hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                      </div>
                    </>
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
