import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, WorkOrder, Building, Elevator, Technician } from '../lib/dataLayer';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const loadData = async () => {
    const [ordersList, buildingsList, elevatorsList, techniciansList] = await Promise.all([
      dataLayer.listWorkOrders(),
      dataLayer.listBuildings(),
      dataLayer.listElevators(),
      dataLayer.listTechnicians()
    ]);
    setOrders(ordersList);
    setBuildings(buildingsList);
    setElevators(elevatorsList);
    setTechnicians(techniciansList);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;

  const recentOrders = orders.slice(0, 10);

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.address || 'Unknown';
  };

  const getElevatorInfo = (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    return elevator ? `${elevator.number} - ${elevator.locationDescription}` : 'Unknown';
  };

  const getTechnicianName = (technicianId?: string) => {
    if (!technicianId) return 'Unassigned';
    const technician = technicians.find(t => t.id === technicianId);
    return technician?.name || 'Unknown';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-100';
      case 'Medium': return 'text-yellow-700 bg-yellow-100';
      case 'Low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-[#694e35] mb-2">Dashboard</h2>
        <p className="text-[#5e4c1e]">Overview of all work orders and activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#f4ead0] rounded-xl p-6 shadow-lg border-2 border-[#d4caaf]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#fcca53] rounded-lg">
              <FileText size={32} className="text-[#694e35]" />
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#694e35]">{totalOrders}</p>
              <p className="text-sm text-[#5e4c1e] font-medium">Total Orders</p>
            </div>
          </div>
        </div>

        <div className="bg-[#f4ead0] rounded-xl p-6 shadow-lg border-2 border-[#d4caaf]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#ffe5a5] rounded-lg">
              <Clock size={32} className="text-[#694e35]" />
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#694e35]">{pendingOrders}</p>
              <p className="text-sm text-[#5e4c1e] font-medium">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-[#f4ead0] rounded-xl p-6 shadow-lg border-2 border-[#d4caaf]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#bda386] rounded-lg">
              <CheckCircle size={32} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#694e35]">{completedOrders}</p>
              <p className="text-sm text-[#5e4c1e] font-medium">Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] overflow-hidden">
        <div className="px-6 py-4 bg-[#d4caaf] border-b-2 border-[#bda386]">
          <h3 className="text-xl font-bold text-[#694e35] flex items-center gap-2">
            <AlertCircle size={24} />
            Recent Work Orders
          </h3>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#5e4c1e] text-lg">No work orders yet</p>
            <Link
              to="/orders/new"
              className="inline-block mt-4 px-6 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
            >
              Create Your First Order
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#d4caaf]">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block p-6 hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#fcca53]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#694e35]">#{order.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                    <p className="text-[#694e35] font-medium">{order.claimType}</p>
                    <p className="text-sm text-[#5e4c1e]">{order.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5e4c1e]">
                      <span>Building: {getBuildingName(order.buildingId)}</span>
                      <span>Elevator: {getElevatorInfo(order.elevatorId)}</span>
                      <span>Technician: {getTechnicianName(order.technicianId)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-[#5e4c1e] sm:text-right">
                    {new Date(order.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
