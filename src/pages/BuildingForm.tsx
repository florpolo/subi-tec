import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataLayer } from '../lib/dataLayer';
import { Building2, Plus, X } from 'lucide-react';

interface HistoryItem {
  date: string;
  technician: string;
  description: string;
  workOrderId: string;
}

interface ElevatorFormData {
  number: string;
  locationDescription: string;
  stops: string;
  capacity: string;
  controlType: string;
  machineRoomLocation: string;
  hasTwoDoors: boolean;
  history: HistoryItem[];
}

export default function BuildingForm() {
  const navigate = useNavigate();

  // Building fields
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [entryHours, setEntryHours] = useState('');
  const [clientName, setClientName] = useState('');

  // Elevators (optional)
  const [elevators, setElevators] = useState<ElevatorFormData[]>([]);

  const handleAddElevator = () => {
    setElevators([...elevators, {
      number: '',
      locationDescription: '',
      stops: '',
      capacity: '',
      controlType: '',
      machineRoomLocation: '',
      hasTwoDoors: false,
      history: []
    }]);
  };

  const handleRemoveElevator = (index: number) => {
    setElevators(elevators.filter((_, i) => i !== index));
  };

  const handleElevatorChange = (index: number, field: keyof ElevatorFormData, value: any) => {
    const updated = [...elevators];
    updated[index][field] = value;
    setElevators(updated);
  };

  const handleAddHistory = (elevatorIndex: number) => {
    const updated = [...elevators];
    updated[elevatorIndex].history.push({
      date: '',
      technician: '',
      description: '',
      workOrderId: ''
    });
    setElevators(updated);
  };

  const handleRemoveHistory = (elevatorIndex: number, historyIndex: number) => {
    const updated = [...elevators];
    updated[elevatorIndex].history = updated[elevatorIndex].history.filter((_, i) => i !== historyIndex);
    setElevators(updated);
  };

  const handleHistoryChange = (elevatorIndex: number, historyIndex: number, field: keyof HistoryItem, value: string) => {
    const updated = [...elevators];
    updated[elevatorIndex].history[historyIndex][field] = value;
    setElevators(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!address.trim()) {
      alert('La dirección es obligatoria');
      return;
    }

    // Validate elevators if any
    for (let i = 0; i < elevators.length; i++) {
      if (!elevators[i].number.trim() || !elevators[i].locationDescription.trim()) {
        alert(`El ascensor ${i + 1}: número y ubicación son obligatorios`);
        return;
      }
    }

    // Create building
    const newBuilding = await dataLayer.createBuilding({
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      contactPhone: contactPhone.trim(),
      entryHours: entryHours.trim(),
      clientName: clientName.trim(),
      relationshipStartDate: new Date().toISOString(),
    });

    if (!newBuilding) {
      alert('Error al crear el edificio');
      return;
    }

    // Create elevators for this building
    for (const elevator of elevators) {
      const newElevator = await dataLayer.createElevator({
        buildingId: newBuilding.id,
        number: parseInt(elevator.number),
        locationDescription: elevator.locationDescription.trim(),
        hasTwoDoors: elevator.hasTwoDoors,
        stops: parseInt(elevator.stops) || 0,
        capacity: parseInt(elevator.capacity) || 0,
        controlType: elevator.controlType.trim(),
        machineRoomLocation: elevator.machineRoomLocation.trim(),
        status: 'fit',
      });

      if (newElevator) {
        // Create history entries for this elevator
        for (const historyItem of elevator.history) {
          if (historyItem.date || historyItem.description) {
            await dataLayer.addElevatorHistory({
              elevatorId: newElevator.id,
              workOrderId: historyItem.workOrderId.trim(),
              date: historyItem.date || new Date().toISOString(),
              description: historyItem.description.trim(),
              technicianName: historyItem.technician.trim(),
            });
          }
        }
      }
    }

    alert('¡Edificio creado exitosamente!');
    navigate('/buildings');
  };

  const handleCancel = () => {
    navigate('/buildings');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={32} className="text-[#694e35]" />
        <div>
          <h2 className="text-3xl font-bold text-[#694e35]">Crear Edificio</h2>
          <p className="text-[#5e4c1e]">Completar la información del nuevo edificio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] p-6 space-y-6">
        {/* Building Information */}
        <div>
          <h3 className="text-xl font-bold text-[#694e35] mb-4">Información del Edificio</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Dirección <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                required
              />
            </div>

            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Barrio
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ej: Palermo"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>

            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Teléfono de contacto
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: 011-4567-8900"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>

            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Horarios de ingreso
              </label>
              <input
                type="text"
                value={entryHours}
                onChange={(e) => setEntryHours(e.target.value)}
                placeholder="Ej: Lun-Vie 9-18hs"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#694e35] font-bold mb-2">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>
          </div>
        </div>

        {/* Elevators Section (Optional) */}
        <div className="border-t-2 border-[#d4caaf] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#694e35]">Ascensores (Opcional)</h3>
            <button
              type="button"
              onClick={handleAddElevator}
              className="flex items-center gap-2 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
            >
              <Plus size={18} />
              Agregar ascensor
            </button>
          </div>

          {elevators.length === 0 ? (
            <p className="text-[#5e4c1e] text-sm">No hay ascensores agregados. Puede agregarlos ahora o más tarde.</p>
          ) : (
            <div className="space-y-4">
              {elevators.map((elevator, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#694e35]">Ascensor {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveElevator(index)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={16} />
                      Eliminar
                    </button>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-medium text-[#694e35] text-sm">Especificaciones Técnicas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Número de ascensor <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={elevator.number}
                          onChange={(e) => handleElevatorChange(index, 'number', e.target.value)}
                          placeholder="Ej: 1"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Ubicación/Descripción <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={elevator.locationDescription}
                          onChange={(e) => handleElevatorChange(index, 'locationDescription', e.target.value)}
                          placeholder="Ej: Frente al hall principal"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Paradas (cantidad de pisos)
                        </label>
                        <input
                          type="number"
                          value={elevator.stops}
                          onChange={(e) => handleElevatorChange(index, 'stops', e.target.value)}
                          placeholder="Ej: 8"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Capacidad (kg)
                        </label>
                        <input
                          type="number"
                          value={elevator.capacity}
                          onChange={(e) => handleElevatorChange(index, 'capacity', e.target.value)}
                          placeholder="Ej: 450"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Tipo de control
                        </label>
                        <input
                          type="text"
                          value={elevator.controlType}
                          onChange={(e) => handleElevatorChange(index, 'controlType', e.target.value)}
                          placeholder="Ej: Automático"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">
                          Sala de máquinas
                        </label>
                        <input
                          type="text"
                          value={elevator.machineRoomLocation}
                          onChange={(e) => handleElevatorChange(index, 'machineRoomLocation', e.target.value)}
                          placeholder="Ej: Azotea"
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-[#694e35] font-medium text-sm">
                          <input
                            type="checkbox"
                            checked={elevator.hasTwoDoors}
                            onChange={(e) => handleElevatorChange(index, 'hasTwoDoors', e.target.checked)}
                            className="w-4 h-4 border-2 border-[#d4caaf] rounded focus:ring-2 focus:ring-[#fcca53]"
                          />
                          Dos puertas
                        </label>
                      </div>
                    </div>

                    {/* Service History Section */}
                    <div className="border-t border-[#d4caaf] pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-[#694e35] text-sm">Historial de Servicio (Opcional)</h5>
                        <button
                          type="button"
                          onClick={() => handleAddHistory(index)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-[#d4caaf] text-[#694e35] rounded hover:bg-[#bda386] transition-colors"
                        >
                          <Plus size={14} />
                          Agregar historial
                        </button>
                      </div>
                      {elevator.history.length === 0 ? (
                        <p className="text-[#5e4c1e] text-xs">Sin historial. Puede agregarlo ahora o más tarde.</p>
                      ) : (
                        <div className="space-y-2">
                          {elevator.history.map((historyItem, historyIndex) => (
                            <div key={historyIndex} className="bg-[#f4ead0] p-3 rounded border border-[#d4caaf]">
                              <div className="flex justify-between mb-2">
                                <span className="text-xs font-medium text-[#694e35]">Entrada {historyIndex + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHistory(index, historyIndex)}
                                  className="text-xs text-red-700 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[#694e35] text-xs mb-1">Fecha</label>
                                  <input
                                    type="date"
                                    value={historyItem.date}
                                    onChange={(e) => handleHistoryChange(index, historyIndex, 'date', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#694e35] text-xs mb-1">Técnico</label>
                                  <input
                                    type="text"
                                    value={historyItem.technician}
                                    onChange={(e) => handleHistoryChange(index, historyIndex, 'technician', e.target.value)}
                                    placeholder="Nombre del técnico"
                                    className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-[#694e35] text-xs mb-1">Descripción</label>
                                  <input
                                    type="text"
                                    value={historyItem.description}
                                    onChange={(e) => handleHistoryChange(index, historyIndex, 'description', e.target.value)}
                                    placeholder="Descripción del servicio"
                                    className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#694e35] text-xs mb-1">ID de orden (opcional)</label>
                                  <input
                                    type="text"
                                    value={historyItem.workOrderId}
                                    onChange={(e) => handleHistoryChange(index, historyIndex, 'workOrderId', e.target.value)}
                                    placeholder="ID"
                                    className="w-full px-2 py-1 text-sm border border-[#d4caaf] rounded focus:outline-none focus:ring-1 focus:ring-[#fcca53]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4 border-t-2 border-[#d4caaf]">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-[#d4caaf] text-[#694e35] rounded-lg font-bold hover:bg-[#bda386] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
