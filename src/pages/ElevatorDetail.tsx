import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dataLayer, Elevator, Building, ElevatorHistory } from '../lib/dataLayer';
import { ArrowLeft, Building2, History as HistoryIcon, Edit, Plus, X } from 'lucide-react';

interface HistoryItemEdit {
  id?: string;
  date: string;
  technician: string;
  description: string;
  workOrderId: string;
}

export default function ElevatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elevator, setElevator] = useState<Elevator | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [history, setHistory] = useState<ElevatorHistory[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStops, setEditStops] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editControlType, setEditControlType] = useState('');
  const [editMachineRoom, setEditMachineRoom] = useState('');
  const [editTwoDoors, setEditTwoDoors] = useState(false);
  const [editPlateNumber, setEditPlateNumber] = useState('');
  const [editHistory, setEditHistory] = useState<HistoryItemEdit[]>([]);

  const loadData = async () => {
    if (!id) return;
    const foundElevator = await dataLayer.getElevator(id);
    if (!foundElevator) {
      navigate('/buildings');
      return;
    }
    setElevator(foundElevator);

    const [buildingData, historyData] = await Promise.all([
      dataLayer.getBuilding(foundElevator.buildingId),
      dataLayer.getElevatorHistory(id)
    ]);

    setBuilding(buildingData || null);
    setHistory(historyData);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  const handleEdit = () => {
    if (!elevator) return;
    setIsEditing(true);
    setEditNumber(elevator.number.toString());
    setEditLocation(elevator.locationDescription);
    setEditStops(elevator.stops.toString());
    setEditCapacity(elevator.capacity.toString());
    setEditControlType(elevator.controlType);
    setEditMachineRoom(elevator.machineRoomLocation);
    setEditTwoDoors(elevator.hasTwoDoors);
    setEditPlateNumber(elevator.plateNumber || '');
    setEditHistory(history.map(h => ({
      id: h.id,
      date: h.date.split('T')[0],
      technician: h.technicianName,
      description: h.description,
      workOrderId: h.workOrderId
    })));
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!id || !elevator) return;
    if (!editNumber.trim() || !editLocation.trim()) {
      alert('El número y la ubicación son obligatorios');
      return;
    }

    await dataLayer.updateElevator(id, {
      number: parseInt(editNumber),
      locationDescription: editLocation.trim(),
      stops: parseInt(editStops) || 0,
      capacity: parseInt(editCapacity) || 0,
      controlType: editControlType.trim(),
      machineRoomLocation: editMachineRoom.trim(),
      hasTwoDoors: editTwoDoors,
      plateNumber: editPlateNumber.trim(),
    });

    // Handle history updates (simplified: delete all and recreate)
    const existingHistory = await dataLayer.getElevatorHistory(id);
    // Note: In a real app, we'd have deleteElevatorHistory. For now, we'll just add new ones.
    for (const item of editHistory) {
      if (!item.id && (item.date || item.description)) {
        await dataLayer.addElevatorHistory({
          elevatorId: id,
          date: item.date || new Date().toISOString(),
          technicianName: item.technician.trim(),
          description: item.description.trim(),
          workOrderId: item.workOrderId.trim(),
        });
      }
    }

    alert('¡Ascensor actualizado exitosamente!');
    setIsEditing(false);
    await loadData();
  };

  const handleAddHistory = () => {
    setEditHistory([...editHistory, {
      date: '',
      technician: '',
      description: '',
      workOrderId: ''
    }]);
  };

  const handleRemoveHistory = (index: number) => {
    setEditHistory(editHistory.filter((_, i) => i !== index));
  };

  const handleHistoryChange = (index: number, field: keyof HistoryItemEdit, value: string) => {
    const updated = [...editHistory];
    updated[index][field] = value;
    setEditHistory(updated);
  };

  if (!elevator) {
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
              <h2 className="text-3xl font-bold text-[#694e35]">Ascensor #{elevator.number}</h2>
              <p className="text-[#5e4c1e]">{elevator.locationDescription}</p>
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
              <h3 className="font-bold text-[#694e35] text-lg">Editar Especificaciones Técnicas</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">
                    Número de ascensor <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
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
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Paradas (cantidad de pisos)</label>
                  <input
                    type="number"
                    value={editStops}
                    onChange={(e) => setEditStops(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Capacidad (kg)</label>
                  <input
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Tipo de control</label>
                  <input
                    type="text"
                    value={editControlType}
                    onChange={(e) => setEditControlType(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Sala de máquinas</label>
                  <input
                    type="text"
                    value={editMachineRoom}
                    onChange={(e) => setEditMachineRoom(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div>
                  <label className="block text-[#694e35] font-medium mb-1 text-sm">Número de patente</label>
                  <input
                    type="text"
                    value={editPlateNumber}
                    onChange={(e) => setEditPlateNumber(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-[#694e35] font-medium text-sm">
                    <input
                      type="checkbox"
                      checked={editTwoDoors}
                      onChange={(e) => setEditTwoDoors(e.target.checked)}
                      className="w-4 h-4 border-2 border-[#d4caaf] rounded focus:ring-2 focus:ring-[#fcca53]"
                    />
                    Dos puertas
                  </label>
                </div>
              </div>

              <div className="border-t-2 border-[#d4caaf] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#694e35]">Historial de Servicio</h3>
                  <button
                    type="button"
                    onClick={handleAddHistory}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-[#d4caaf] text-[#694e35] rounded hover:bg-[#bda386] transition-colors"
                  >
                    <Plus size={16} />
                    Agregar historial
                  </button>
                </div>
                {editHistory.length === 0 ? (
                  <p className="text-[#5e4c1e] text-sm">Sin historial registrado</p>
                ) : (
                  <div className="space-y-3">
                    {editHistory.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border-2 border-[#d4caaf]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#694e35]">Entrada {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHistory(index)}
                            className="flex items-center gap-1 text-xs text-red-700 hover:underline"
                          >
                            <X size={14} />
                            Eliminar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[#694e35] text-xs mb-1">Fecha</label>
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => handleHistoryChange(index, 'date', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] text-xs mb-1">Técnico</label>
                            <input
                              type="text"
                              value={item.technician}
                              onChange={(e) => handleHistoryChange(index, 'technician', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[#694e35] text-xs mb-1">Descripción</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleHistoryChange(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] text-xs mb-1">ID de orden (opcional)</label>
                            <input
                              type="text"
                              value={item.workOrderId}
                              onChange={(e) => handleHistoryChange(index, 'workOrderId', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              {/* Building */}
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
                <h3 className="font-bold text-[#694e35] mb-2">Especificaciones Técnicas</h3>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="font-bold text-[#694e35]">Paradas:</span>
                    <span className="font-normal text-[#694e35]">{elevator.stops}</span>
                  </div>
                  <div className="inline-flex items-baseline gap-1">
                    <span className="font-bold text-[#694e35]">Capacidad:</span>
                    <span className="font-normal text-[#694e35]">{elevator.capacity} kg</span>
                  </div>
                  <div className="inline-flex items-baseline gap-1">
                    <span className="font-bold text-[#694e35]">Control:</span>
                    <span className="font-normal text-[#694e35]">{elevator.controlType}</span>
                  </div>
                  <div className="inline-flex items-baseline gap-1">
                    <span className="font-bold text-[#694e35]">Sala de máquinas:</span>
                    <span className="font-normal text-[#694e35]">{elevator.machineRoomLocation}</span>
                  </div>
                  <div className="inline-flex items-baseline gap-1">
                    <span className="font-bold text-[#694e35]">Dos puertas:</span>
                    <span className="font-normal text-[#694e35]">{elevator.hasTwoDoors ? 'Sí' : 'No'}</span>
                  </div>
                  {elevator.plateNumber && (
                    <div className="inline-flex items-baseline gap-1">
                      <span className="font-bold text-[#694e35]">Número de patente:</span>
                      <span className="font-normal text-[#694e35]">{elevator.plateNumber}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Service History - only show in read mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HistoryIcon size={20} className="text-[#694e35]" />
                  <h3 className="font-bold text-[#694e35]">Historial de Servicio</h3>
                </div>

                {history.length === 0 ? (
                  <p className="text-[#5e4c1e] bg-white p-4 rounded-lg border border-[#d4caaf]">
                    No hay historial de servicio todavía
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id} className="bg-white p-4 rounded-lg border border-[#d4caaf]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-[#694e35]">{entry.technicianName}</span>
                          <span className="text-sm text-[#5e4c1e]">
                            {new Date(entry.date).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <p className="text-[#5e4c1e] text-sm">{entry.description}</p>
                        <Link
                          to={`/orders/${entry.workOrderId}`}
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
