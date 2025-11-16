import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, Technician, WorkOrder } from '../lib/dataLayer';
import { Users, Circle, Plus, Edit } from 'lucide-react';

interface DailyCounters {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

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

  const getTodayCounters = async (technicianId: string): Promise<DailyCounters> => {
    const allOrders = await dataLayer.listWorkOrders();

    // Helper: Check if a date is today in Buenos Aires
    const isTodayBA = (isoString: string | null | undefined) => {
      if (!isoString) return false;
      const date = new Date(isoString);
      const baString = date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' });
      const baDate = new Date(baString);
      baDate.setHours(0, 0, 0, 0);
      const now = new Date();
      const nowBA = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      nowBA.setHours(0, 0, 0, 0);
      return baDate.getTime() === nowBA.getTime();
    };

    const techOrders = allOrders.filter(order => order.technicianId === technicianId);

    // POR HACER: scheduled for today or no date
    const pending = techOrders.filter((o: any) => {
      if (o.status !== 'Pending') return false;
      const dateTime = o.dateTime || o.date_time;
      if (!dateTime) return true;
      return isTodayBA(dateTime);
    });

    // EN CURSO: In Progress started today
    const inProgress = techOrders.filter((o: any) => {
      if (o.status !== 'In Progress') return false;
      return isTodayBA(o.start_time || o.startTime);
    });

    // COMPLETADAS: Completed finished today
    const completed = techOrders.filter((o: any) => {
      if (o.status !== 'Completed') return false;
      return isTodayBA(o.finish_time || o.completion_time);
    });

    return {
      total: pending.length + inProgress.length + completed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
    };
  };

  const loadData = async () => {
    const techs = await dataLayer.listTechnicians();
    setTechnicians(techs);

    const statuses: Record<string, 'free' | 'busy'> = {};
    const counters: Record<string, DailyCounters> = {};

    // Get all work orders once
    const allOrders = await dataLayer.listWorkOrders();

    for (const tech of techs) {
      // 🔴 busy si tiene ≥1 In Progress, 🟢 free en cualquier otro caso
      const hasInProgress = allOrders.some(o => o.technicianId === tech.id && o.status === 'In Progress');
      statuses[tech.id] = hasInProgress ? 'busy' : 'free';
      counters[tech.id] = await getTodayCounters(tech.id);
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
                        <h3 className="text-xl font-bold text-[#694e35] hover:text-[#fcca53] transition-colors">{technician.name}</h3>
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
                        <h4 className="text-xs font-bold text-[#5e4c1e] mb-2">CONTADORES DEL DÍA</h4>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Total del día</p>
                            <p className="text-lg font-bold text-[#694e35]">{dailyCounters[technician.id]?.total || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Por hacer</p>
                            <p className="text-lg font-bold text-yellow-600">{dailyCounters[technician.id]?.pending || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">En curso</p>
                            <p className="text-lg font-bold text-blue-600">{dailyCounters[technician.id]?.inProgress || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#5e4c1e]">Completadas</p>
                            <p className="text-lg font-bold text-green-600">{dailyCounters[technician.id]?.completed || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-[#5e4c1e]">Rol</span>
                        <div className="mt-1">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRoleBadgeColor(technician.role)}`}>
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
