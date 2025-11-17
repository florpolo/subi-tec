import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dataLayer, Technician, WorkOrder } from '../lib/dataLayer';
import { ArrowLeft, Calendar } from 'lucide-react';

interface DailyCounters {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export default function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [dailyCounters, setDailyCounters] = useState<DailyCounters>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getTodayCounters = async (technicianId: string): Promise<DailyCounters> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allOrders = await dataLayer.listWorkOrders();
    const todayOrders = allOrders.filter(order => {
      if (order.technicianId !== technicianId) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= today && orderDate < tomorrow;
    });

    return {
      total: todayOrders.length,
      pending: todayOrders.filter(o => o.status === 'Pending').length,
      inProgress: todayOrders.filter(o => o.status === 'In Progress').length,
      completed: todayOrders.filter(o => o.status === 'Completed').length,
    };
  };

  const loadData = async () => {
    if (!id) return;
    const foundTech = await dataLayer.getTechnician(id);
    if (!foundTech) {
      navigate('/technicians');
      return;
    }
    setTechnician(foundTech);

    const [counters, techOrders] = await Promise.all([
      getTodayCounters(id),
      dataLayer.listWorkOrders({ technicianId: id })
    ]);

    setDailyCounters(counters);

    let filteredOrders = techOrders;
    if (fromDate || toDate) {
      filteredOrders = techOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        if (from && orderDate < from) return false;
        if (to && orderDate > to) return false;
        return true;
      });
    }

    setOrders(filteredOrders);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id, fromDate, toDate]);

  if (!technician) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[#5e4c1e] text-lg">Cargando...</p>
      </div>
    );
  }


  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return 'Completada';
      case 'In Progress': return 'En curso';
      case 'Pending': return 'Por hacer';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'High': return 'Alta';
      case 'Medium': return 'Media';
      case 'Low': return 'Baja';
      default: return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-700 bg-green-100';
      case 'In Progress': return 'text-blue-700 bg-blue-100';
      case 'Pending': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-100';
      case 'Medium': return 'text-yellow-700 bg-yellow-100';
      case 'Low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/technicians"
        className="inline-flex items-center gap-2 text-[#694e35] hover:text-[#5e4c1e] font-medium focus:outline-none focus:ring-2 focus:ring-[#fcca53] rounded px-2 py-1"
      >
        <ArrowLeft size={20} />
        Volver a Técnicos
      </Link>

      <div className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] p-6">
        <h2 className="text-3xl font-bold text-[#694e35] mb-4">{technician.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <span className="text-sm text-[#5e4c1e]">Rol</span>
            <p className="font-medium text-[#694e35]">{technician.role}</p>
          </div>
          <div>
            <span className="text-sm text-[#5e4c1e]">Especialidad</span>
            <p className="font-medium text-[#694e35]">{technician.specialty}</p>
          </div>
          <div>
            <span className="text-sm text-[#5e4c1e]">Contacto</span>
            <p className="font-medium text-[#694e35]">{technician.contact}</p>
          </div>
        </div>

        <div className="border-t-2 border-[#d4caaf] pt-6">
          <h3 className="text-xl font-bold text-[#694e35] mb-4">Contador del Día (Hoy: {new Date().toLocaleDateString('es-AR')})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
              <div className="text-2xl font-bold text-[#694e35]">{dailyCounters.total}</div>
              <div className="text-sm text-[#5e4c1e]">Hoy</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
              <div className="text-2xl font-bold text-yellow-600">{dailyCounters.pending}</div>
              <div className="text-sm text-[#5e4c1e]">Por hacer</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
              <div className="text-2xl font-bold text-blue-600">{dailyCounters.inProgress}</div>
              <div className="text-sm text-[#5e4c1e]">En curso</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
              <div className="text-2xl font-bold text-green-600">{dailyCounters.completed}</div>
              <div className="text-sm text-[#5e4c1e]">Completadas</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-[#d4caaf] mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={20} className="text-[#694e35]" />
              <h4 className="font-bold text-[#694e35]">Filtrar por Rango de Fechas</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#5e4c1e] mb-1">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#5e4c1e] mb-1">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                />
              </div>
            </div>
          </div>

          <h4 className="font-bold text-[#694e35] mb-3">Tareas ({orders.length})</h4>
          {orders.length === 0 ? (
            <p className="text-[#5e4c1e]">No hay tareas en el período seleccionado</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block bg-white p-4 rounded-lg border-2 border-[#d4caaf] hover:border-[#fcca53] transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityColor(order.priority)}`}>
                      {getPriorityLabel(order.priority)}
                    </span>
                  </div>
                  <p className="font-medium text-[#694e35]">{order.description}</p>
                  <p className="text-sm text-[#5e4c1e]">
                    {new Date(order.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
