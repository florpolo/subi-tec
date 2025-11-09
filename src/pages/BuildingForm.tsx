import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dataLayer, EquipmentType } from '../lib/dataLayer';
import { Building2, Plus, X } from 'lucide-react';

interface HistoryItem {
  date: string;
  technician: string;
  description: string;
  workOrderId: string;
}

interface EquipmentFormData {
  type: EquipmentType;
  name: string;
  locationDescription: string;
  brand: string;
  model: string;
  serialNumber: string;
  capacity: string; // Changed to string to match input type
  // Elevator specific
  number: string;
  stops: string;
  controlType: string;
  machineRoomLocation: string;
  hasTwoDoors: boolean;
  history: HistoryItem[];
}

export default function BuildingForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // Building fields
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [entryHours, setEntryHours] = useState('');
  const [clientName, setClientName] = useState('');

  // Equipment (optional)
  const [equipments, setEquipments] = useState<Partial<EquipmentFormData>[]>([]);

  useEffect(() => {
    if (isEditMode && id) {
      dataLayer.getBuilding(id).then(building => {
        if (building) {
          setAddress(building.address || '');
          setNeighborhood(building.neighborhood || '');
          setContactPhone(building.contactPhone || '');
          setEntryHours(building.entryHours || '');
          setClientName(building.clientName || '');
        }
      });
    }
  }, [id, isEditMode]);

  const handleAddEquipment = () => {
    setEquipments([...equipments, {
      type: 'elevator',
      name: '',
      locationDescription: '',
      brand: '',
      model: '',
      serialNumber: '',
      capacity: '',
      number: '',
      stops: '',
      controlType: '',
      machineRoomLocation: '',
      hasTwoDoors: false,
      history: []
    }]);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipments(equipments.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof EquipmentFormData, value: any) => {
    const updated = [...equipments];
    updated[index][field] = value;
    setEquipments(updated);
  };

  const handleAddHistory = (equipmentIndex: number) => {
    const updated = [...equipments];
    if (!updated[equipmentIndex].history) {
      updated[equipmentIndex].history = [];
    }
    updated[equipmentIndex].history!.push({
      date: '',
      technician: '',
      description: '',
      workOrderId: ''
    });
    setEquipments(updated);
  };

  const handleRemoveHistory = (equipmentIndex: number, historyIndex: number) => {
    const updated = [...equipments];
    updated[equipmentIndex].history = updated[equipmentIndex].history!.filter((_, i) => i !== historyIndex);
    setEquipments(updated);
  };

  const handleHistoryChange = (equipmentIndex: number, historyIndex: number, field: keyof HistoryItem, value: string) => {
    const updated = [...equipments];
    updated[equipmentIndex].history![historyIndex][field] = value;
    setEquipments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      alert('La dirección es obligatoria');
      return;
    }

    for (let i = 0; i < equipments.length; i++) {
      const equipment = equipments[i];
      if (equipment.type === 'elevator') {
        if (!equipment.number?.trim() || !equipment.locationDescription?.trim()) {
          alert(`Ascensor ${i + 1}: número y ubicación son obligatorios`);
          return;
        }
      } else {
        if (!equipment.name?.trim() || !equipment.locationDescription?.trim()) {
          alert(`Equipo ${i + 1}: nombre y ubicación son obligatorios`);
          return;
        }
      }
    }

    let currentBuildingId = id;

    if (isEditMode) {
      await dataLayer.updateBuilding(id!, {
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        contactPhone: contactPhone.trim(),
        entryHours: entryHours.trim(),
        clientName: clientName.trim(),
      });
    } else {
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
      currentBuildingId = newBuilding.id;
    }

    if (!currentBuildingId) {
      alert('Error al obtener el ID del edificio');
      return;
    }

    for (const equipment of equipments) {
      let newEquipmentId: string | undefined;

      if (equipment.type === 'elevator') {
        const newElevator = await dataLayer.createElevator({
          buildingId: currentBuildingId,
          number: parseInt(equipment.number!),
          locationDescription: equipment.locationDescription!.trim(),
          hasTwoDoors: equipment.hasTwoDoors!,
          stops: parseInt(equipment.stops!) || 0,
          capacity: parseInt(equipment.capacity!) || 0,
          controlType: equipment.controlType!.trim(),
          machineRoomLocation: equipment.machineRoomLocation!.trim(),
          status: 'fit',
        });
        newEquipmentId = newElevator?.id;
      } else {
        const newEquipment = await dataLayer.createEquipment({
          buildingId: currentBuildingId,
          type: equipment.type!,
          name: equipment.name!.trim(),
          locationDescription: equipment.locationDescription!.trim(),
          brand: equipment.brand?.trim() || null,
          model: equipment.model?.trim() || null,
          serialNumber: equipment.serialNumber?.trim() || null,
          capacity: equipment.capacity?.trim() ? parseFloat(equipment.capacity) : null,
          status: 'fit',
        });
        newEquipmentId = newEquipment?.id;
      }

      if (newEquipmentId && equipment.history) {
        for (const historyItem of equipment.history) {
          if (historyItem.date || historyItem.description) {
            await dataLayer.addElevatorHistory({
              elevatorId: newEquipmentId, // Note: This assumes history is only for elevators. If other equipment types need history, this needs to be generalized.
              workOrderId: historyItem.workOrderId.trim(),
              date: historyItem.date || new Date().toISOString(),
              description: historyItem.description.trim(),
              technicianName: historyItem.technician.trim(),
            });
          }
        }
      }
    }

    alert(`¡Edificio ${isEditMode ? 'actualizado' : 'creado'} exitosamente!`);
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
          <h2 className="text-3xl font-bold text-[#694e35]">
            {isEditMode ? 'Editar Edificio' : 'Crear Edificio'}
          </h2>
          <p className="text-[#5e4c1e]">
            {isEditMode ? 'Actualizar la información del edificio y agregar nuevos equipos.' : 'Completar la información del nuevo edificio.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] p-6 space-y-6">
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
              <label className="block text-[#694e35] font-bold mb-2">Barrio</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ej: Palermo"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>
            <div>
              <label className="block text-[#694e35] font-bold mb-2">Teléfono de contacto</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: 011-4567-8900"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>
            <div>
              <label className="block text-[#694e35] font-bold mb-2">Horarios de ingreso</label>
              <input
                type="text"
                value={entryHours}
                onChange={(e) => setEntryHours(e.target.value)}
                placeholder="Ej: Lun-Vie 9-18hs"
                className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[#694e35] font-bold mb-2">Nombre del cliente</label>
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

        <div className="border-t-2 border-[#d4caaf] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#694e35]">
              {isEditMode ? 'Agregar Nuevos Equipos' : 'Equipos (Opcional)'}
            </h3>
            <button
              type="button"
              onClick={handleAddEquipment}
              className="flex items-center gap-2 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
            >
              <Plus size={18} />
              Agregar Equipo
            </button>
          </div>

          {equipments.length === 0 ? (
            <p className="text-[#5e4c1e] text-sm">No hay equipos nuevos para agregar.</p>
          ) : (
            <div className="space-y-4">
              {equipments.map((equipment, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border-2 border-[#d4caaf]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#694e35]">Equipo {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(index)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={16} />
                      Eliminar
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">Tipo de equipo</label>
                        <select
                          value={equipment.type}
                          onChange={(e) => handleEquipmentChange(index, 'type', e.target.value as EquipmentType)}
                          className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        >
                          <option value="elevator">Ascensor</option>
                          <option value="water_pump">Bomba de agua</option>
                          <option value="freight_elevator">Montacarga</option>
                          <option value="car_lift">Montacoche</option>
                          <option value="dumbwaiter">Montaplatos</option>
                          <option value="camillero">Camillero</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                    </div>

                    {equipment.type === 'elevator' ? (
                      <>
                        <h5 className="font-medium text-[#694e35] text-sm">Especificaciones Técnicas del Ascensor</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">
                              Número de ascensor <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="number"
                              value={equipment.number}
                              onChange={(e) => handleEquipmentChange(index, 'number', e.target.value)}
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
                              value={equipment.locationDescription}
                              onChange={(e) => handleEquipmentChange(index, 'locationDescription', e.target.value)}
                              placeholder="Ej: Frente al hall principal"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Paradas</label>
                            <input
                              type="number"
                              value={equipment.stops}
                              onChange={(e) => handleEquipmentChange(index, 'stops', e.target.value)}
                              placeholder="Ej: 8"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Capacidad (kg)</label>
                            <input
                              type="number"
                              value={equipment.capacity}
                              onChange={(e) => handleEquipmentChange(index, 'capacity', e.target.value)}
                              placeholder="Ej: 450"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Tipo de control</label>
                            <input
                              type="text"
                              value={equipment.controlType}
                              onChange={(e) => handleEquipmentChange(index, 'controlType', e.target.value)}
                              placeholder="Ej: Automático"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Sala de máquinas</label>
                            <input
                              type="text"
                              value={equipment.machineRoomLocation}
                              onChange={(e) => handleEquipmentChange(index, 'machineRoomLocation', e.target.value)}
                              placeholder="Ej: Azotea"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-[#694e35] font-medium text-sm">
                              <input
                                type="checkbox"
                                checked={equipment.hasTwoDoors}
                                onChange={(e) => handleEquipmentChange(index, 'hasTwoDoors', e.target.checked)}
                                className="w-4 h-4 border-2 border-[#d4caaf] rounded focus:ring-2 focus:ring-[#fcca53]"
                              />
                              Dos puertas
                            </label>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 className="font-medium text-[#694e35] text-sm">Datos del Equipo</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">
                              Nombre <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={equipment.name}
                              onChange={(e) => handleEquipmentChange(index, 'name', e.target.value)}
                              placeholder="Ej: Bomba 1 / Montacarga B"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">
                              Ubicación/Descripción <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={equipment.locationDescription}
                              onChange={(e) => handleEquipmentChange(index, 'locationDescription', e.target.value)}
                              placeholder="Ej: Subsuelo / Frente al hall"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Marca</label>
                            <input
                              type="text"
                              value={equipment.brand}
                              onChange={(e) => handleEquipmentChange(index, 'brand', e.target.value)}
                              placeholder="Ej: Siemens"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Modelo</label>
                            <input
                              type="text"
                              value={equipment.model}
                              onChange={(e) => handleEquipmentChange(index, 'model', e.target.value)}
                              placeholder="Ej: XYZ-2000"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">N.º de serie</label>
                            <input
                              type="text"
                              value={equipment.serialNumber}
                              onChange={(e) => handleEquipmentChange(index, 'serialNumber', e.target.value)}
                              placeholder="Ej: SN123456"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#694e35] font-medium mb-1 text-sm">Capacidad</label>
                            <input
                              type="text"
                              value={equipment.capacity}
                              onChange={(e) => handleEquipmentChange(index, 'capacity', e.target.value)}
                              placeholder="Ej: 1000 kg / 5 HP"
                              className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {equipment.type === 'elevator' && (
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
                        {(!equipment.history || equipment.history.length === 0) ? (
                          <p className="text-[#5e4c1e] text-xs">Sin historial. Puede agregarlo ahora o más tarde.</p>
                        ) : (
                          <div className="space-y-2">
                            {equipment.history.map((historyItem, historyIndex) => (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            {isEditMode ? 'Guardar Cambios' : 'Crear Edificio'}
          </button>
        </div>
      </form>
    </div>
  );
}
