import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dataLayer, Equipment, Building, EquipmentType } from '../lib/dataLayer';
import { ArrowLeft, Building2, History as HistoryIcon, Edit } from 'lucide-react';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCapacity, setEditCapacity] = useState('');

  const getEquipmentTypeLabel = (type: EquipmentType): string => {
    const labels: Record<EquipmentType, string> = {
      elevator: 'Ascensor',
      water_pump: 'Bomba de agua',
      freight_elevator: 'Montacarga',
      car_lift: 'Montacoche',
      dumbwaiter: 'Montaplatos',
      camillero: 'Camillero',
      other: 'Otro',
    };
    return labels[type] || type;
  };

  const loadData = async () => {
    if (!id) return;
    const foundEquipment = await dataLayer.getEquipment(id);
    if (!foundEquipment) {
      navigate('/buildings');
      return;
    }
    setEquipment(foundEquipment);

    const [buildingData, allOrders] = await Promise.all([
      dataLayer.getBuilding(foundEquipment.buildingId),
      dataLayer.listWorkOrders({ equipmentId: id })
    ]);

    setBuilding(buildingData || null);
    setWorkOrders(allOrders);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  const handleEdit = () => {
    if (!equipment) return;
    setIsEditing(true);
    setEditName(equipment.name);
    setEditLocation(equipment.locationDescription);
    setEditBrand(equipment.brand || '');
    setEditCapacity(equipment.capacity?.toString() || '');
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!id || !equipment) return;
    if (!editName.trim() || !editLocation.trim()) {
      alert('El nombre y la ubicación son obligatorios');
      return;
    }

    await dataLayer.updateEquipment(id, {
      name: editName.trim(),
      locationDescription: editLocation.trim(),
      brand: editBrand.trim() || null,
      capacity: editCapacity.trim() ? parseFloat(editCapacity) : null,
    });

    alert('¡Equipo actualizado exitosamente!');
    setIsEditing(false);
    await loadData();
  };

  if (!equipment) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[#5e4c1e] text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/buildings"
        className="inline-flex items-center gap-2 text-[#694e35] hover:text-[#5e4c1e] font-medium focus:outline-none focus:ring-2 focus:ring-[#fcca53] rounded px-2 py-1"
      >
        <ArrowLeft size={20} />
        Volver a Edificios
      </Link>

      <div className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] overflow-hidden">
        <div className="bg-[#d4caaf] px-6 py-4 border-b-2 border-[#bda386]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#fcca53] uppercase mb-1">
                {getEquipmentTypeLabel(equipment.type)}
              </div>
              <h2 className="text-3xl font-bold text-[#694e35]">{equipment.name}</h2>
              <p className="text-[#5e4c1e]">{equipment.locationDescription}</p>
            </div>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
              >
                <Edit size={18} />
                Editar
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-6">
              <h3 className="font-bold text-[#694e35] text-lg">Editar Información del Equipo</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">
                    Nombre <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">
                    Ubicación/Descripción <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Marca (opcional)</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Capacidad (opcional)</label>
                  <input
                    type="text"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t-2 border-[#d4caaf]">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-[#d4caaf] text-[#694e35] rounded-lg font-medium hover:bg-[#bda386] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={20} className="text-[#694e35]" />
                  <h3 className="font-bold text-[#694e35]">Edificio</h3>
                </div>
                {building && (
                  <div className="bg-white p-4 rounded-lg border border-[#d4caaf]">
                    <p className="font-medium text-[#694e35]">{building.address}</p>
                    <p className="text-sm text-[#5e4c1e]">{building.neighborhood}</p>
                    <p className="text-sm text-[#5e4c1e]">Horario de Ingreso: {building.entryHours || 'N/A'}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-[#694e35] mb-2">Ficha Técnica</h3>
                <div className="bg-white p-4 rounded-lg border border-[#d4caaf]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-bold text-[#694e35]">Ubicación:</span>
                      <p className="text-[#5e4c1e]">{equipment.locationDescription}</p>
                    </div>
                    {equipment.brand && (
                      <div>
                        <span className="font-bold text-[#694e35]">Marca:</span>
                        <p className="text-[#5e4c1e]">{equipment.brand}</p>
                      </div>
                    )}
                    {equipment.capacity && (
                      <div>
                        <span className="font-bold text-[#694e35]">Capacidad:</span>
                        <p className="text-[#5e4c1e]">{equipment.capacity}</p>
                      </div>
                    )}
                    {equipment.model && (
                      <div>
                        <span className="font-bold text-[#694e35]">Modelo:</span>
                        <p className="text-[#5e4c1e]">{equipment.model}</p>
                      </div>
                    )}
                    {equipment.serialNumber && (
                      <div>
                        <span className="font-bold text-[#694e35]">N.º de serie:</span>
                        <p className="text-[#5e4c1e]">{equipment.serialNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HistoryIcon size={20} className="text-[#694e35]" />
                  <h3 className="font-bold text-[#694e35]">Órdenes de Trabajo Asociadas</h3>
                </div>

                {workOrders.length === 0 ? (
                  <p className="text-[#5e4c1e] bg-white p-4 rounded-lg border border-[#d4caaf]">
                    No hay órdenes de trabajo asociadas todavía
                  </p>
                ) : (
                  <div className="space-y-3">
                    {workOrders.map((order) => (
                      <div key={order.id} className="bg-white p-4 rounded-lg border border-[#d4caaf]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-[#694e35]">{order.claimType}</span>
                            <p className="text-sm text-[#5e4c1e] mt-1">{order.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status === 'Completed' ? 'Completada' :
                             order.status === 'In Progress' ? 'En Progreso' : 'Pendiente'}
                          </span>
                        </div>
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-sm text-[#694e35] hover:text-[#fcca53] underline mt-2 inline-block"
                        >
                          Ver Orden de Trabajo →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
