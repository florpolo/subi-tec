import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, Building, Elevator, Equipment, EquipmentType } from '../lib/dataLayer';
import { Building2, Plus, Edit, X } from 'lucide-react';
import usePreserveScroll from '../hooks/usePreserveScroll';

export default function Buildings() {
  const [searchQuery, setSearchQuery] = useState<string>(() => sessionStorage.getItem('buildings_searchQuery') || '');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editEntryHours, setEditEntryHours] = useState('');
  const [editClientName, setEditClientName] = useState('');

  // State for new elevator form
  const [showNewElevatorForm, setShowNewElevatorForm] = useState<string | null>(null); // Stores buildingId for which to show form
  const [newElevatorNumber, setNewElevatorNumber] = useState<number>(1);
  const [newElevatorLocation, setNewElevatorLocation] = useState('');
  const [newElevatorPlateNumber, setNewElevatorPlateNumber] = useState('');

  const filteredAndSortedBuildings = useMemo(() => {
    return buildings
      .filter(b =>
        b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.address.localeCompare(b.address));
  }, [buildings, searchQuery]);

  usePreserveScroll('buildingsListScroll', [filteredAndSortedBuildings]);

  useEffect(() => {
    sessionStorage.setItem('buildings_searchQuery', searchQuery);
  }, [searchQuery]);

  const loadData = async () => {
    const [buildingsList, elevatorsList, equipmentsList] = await Promise.all([
      dataLayer.listBuildings(),
      dataLayer.listElevators(),
      dataLayer.listEquipments(),
    ]);
    setBuildings(buildingsList);
    setElevators(elevatorsList);
    setEquipments(equipmentsList);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const getBuildingElevators = (buildingId: string) => {
    return elevators.filter((e) => e.buildingId === buildingId);
  };

  const getBuildingEquipments = (buildingId: string) => {
    return equipments.filter((e) => e.buildingId === buildingId && e.type !== 'elevator');
  };

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

  const handleEditBuilding = (building: Building) => {
    setEditingBuildingId(building.id);
    setEditAddress(building.address || '');
    setEditNeighborhood(building.neighborhood || '');
    setEditContactPhone(building.contactPhone || '');
    setEditEntryHours(building.entryHours || '');
    setEditClientName(building.clientName || '');
  };

  const handleCancelEdit = () => {
    setEditingBuildingId(null);
    setEditAddress('');
    setEditNeighborhood('');
    setEditContactPhone('');
    setEditEntryHours('');
    setEditClientName('');
  };

  const handleSaveBuilding = async (buildingId: string) => {
    if (!editAddress.trim()) {
      alert('La dirección es obligatoria');
      return;
    }

    await dataLayer.updateBuilding(buildingId, {
      address: editAddress.trim(),
      neighborhood: editNeighborhood.trim(),
      contactPhone: editContactPhone.trim(),
      entryHours: editEntryHours.trim(),
      clientName: editClientName.trim(),
    });

    alert('¡Edificio actualizado exitosamente!');
    setEditingBuildingId(null);
    await loadData();
  };

  const handleCreateElevator = async (buildingId: string) => {
    if (!newElevatorLocation.trim()) {
      alert('Por favor ingrese la ubicación del ascensor');
      return;
    }
    const newElevator = await dataLayer.createElevator({
      buildingId,
      number: newElevatorNumber,
      locationDescription: newElevatorLocation.trim(),
      hasTwoDoors: false,
      status: 'fit',
      stops: 8,
      capacity: 450,
      machineRoomLocation: 'Azotea',
      controlType: 'Automático',
      plateNumber: newElevatorPlateNumber.trim(),
    });
    if (newElevator) {
      alert('Ascensor creado exitosamente!');
      setShowNewElevatorForm(null);
      setNewElevatorNumber(1);
      setNewElevatorLocation('');
      setNewElevatorPlateNumber('');
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#694e35] mb-2">Edificios</h2>
          <p className="text-[#5e4c1e]">Gestionar edificios y sus equipos</p>
        </div>
        <Link
          to="/buildings/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
        >
          <Plus size={20} />
          Crear edificio
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por dirección o barrio..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
        />
      </div>

      {filteredAndSortedBuildings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
          <p className="text-[#5e4c1e] text-lg mb-4">
            {searchQuery ? 'No se encontraron edificios.' : 'No hay edificios todavía'}
          </p>
          {!searchQuery && (
            <Link
              to="/buildings/new"
              className="inline-block px-6 py-3 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors"
            >
              Crear tu primer edificio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredAndSortedBuildings.map((building) => {
            const buildingElevators = getBuildingElevators(building.id);

            return (
              <div
                key={building.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden"
              >
                <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-300">
                  <div className="flex items-center gap-3">
                    <Building2 size={28} className="text-[#694e35]" />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#694e35]">{building.address}</h3>
                      <p className="text-sm text-[#5e4c1e]">{building.neighborhood}</p>
                    </div>
                    {editingBuildingId !== building.id && (
                      <button
                        onClick={() => handleEditBuilding(building)}
                        className="flex items-center gap-2 px-3 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {editingBuildingId === building.id ? (
                    <div className="space-y-4">
                      <h4 className="font-bold text-[#694e35]">Editar información del edificio</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#694e35] font-medium mb-1 text-sm">
                            Dirección <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#694e35] font-medium mb-1 text-sm">Barrio</label>
                          <input
                            type="text"
                            value={editNeighborhood}
                            onChange={(e) => setEditNeighborhood(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#694e35] font-medium mb-1 text-sm">
                            Teléfono de contacto
                          </label>
                          <input
                            type="text"
                            value={editContactPhone}
                            onChange={(e) => setEditContactPhone(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#694e35] font-medium mb-1 text-sm">Horarios de ingreso</label>
                          <input
                            type="text"
                            value={editEntryHours}
                            onChange={(e) => setEditEntryHours(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[#694e35] font-medium mb-1 text-sm">Nombre del cliente</label>
                          <input
                            type="text"
                            value={editClientName}
                            onChange={(e) => setEditClientName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end pt-4 border-t-2 border-[#d4caaf]">
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-[#d4caaf] text-[#694e35] rounded-lg font-medium hover:bg-[#bda386] transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveBuilding(building.id)}
                          className="px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-[#694e35] mb-2">Información de contacto</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-[#5e4c1e]">Teléfono:</span>{' '}
                            <span className="font-medium text-[#694e35]">
                              {building.contactPhone || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5e4c1e]">Horario de ingreso:</span>{' '}
                            <span className="font-medium text-[#694e35]">
                              {building.entryHours || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#694e35] mb-2">Información del cliente</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-[#5e4c1e]">Nombre del cliente:</span>{' '}
                            <span className="font-medium text-[#694e35]">
                              {building.clientName || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5e4c1e]">Inicio de relación:</span>{' '}
                            <span className="font-medium text-[#694e35]">
                              {building.relationshipStartDate
                                ? new Date(building.relationshipStartDate).toLocaleDateString('es-AR')
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#694e35]">Ascensores ({getBuildingElevators(building.id).length})</h4>
                      <button
                        type="button"
                        onClick={() => setShowNewElevatorForm(building.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-[#fcca53] text-[#694e35] rounded-lg font-medium hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
                      >
                        <Plus size={16} />
                        Agregar ascensor
                      </button>
                    </div>

                    {showNewElevatorForm === building.id && (
                      <div className="mt-4 p-4 bg-white rounded-lg border-2 border-[#d4caaf] space-y-3">
                        <h4 className="font-bold text-[#694e35]">Nuevo Ascensor</h4>
                        <input
                          type="number"
                          placeholder="Número *"
                          value={newElevatorNumber}
                          onChange={(e) => setNewElevatorNumber(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                        <input
                          type="text"
                          placeholder="Ubicación (ej: a la izquierda de la entrada) *"
                          value={newElevatorLocation}
                          onChange={(e) => setNewElevatorLocation(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                        <input
                          type="text"
                          placeholder="Número de patente"
                          value={newElevatorPlateNumber}
                          onChange={(e) => setNewElevatorPlateNumber(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewElevatorForm(null)}
                            className="flex-1 px-4 py-2 bg-[#d4caaf] text-[#694e35] rounded-lg font-medium hover:bg-[#bda386] transition-colors"
                          >
                            <X size={16} className="inline-block mr-1" />
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateElevator(building.id)}
                            className="flex-1 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
                          >
                            <Plus size={16} className="inline-block mr-1" />
                            Crear Ascensor
                          </button>
                        </div>
                      </div>
                    )}

                    {getBuildingElevators(building.id).length === 0 ? (
                      <p className="text-[#5e4c1e] text-sm">No hay ascensores en este edificio</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {buildingElevators.map((elevator) => (
                          <Link
                            key={elevator.id}
                            to={`/elevators/${elevator.id}`}
                            className="bg-white p-4 rounded-lg border-2 border-[#d4caaf] hover:border-[#fcca53] transition-colors focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-2xl font-bold text-[#694e35]">#{elevator.number}</span>
                            </div>
                            <p className="text-sm text-[#5e4c1e] mb-2">{elevator.locationDescription}</p>
                            <div className="text-xs text-[#5e4c1e] space-y-1">
                              <div>Paradas: {elevator.stops}</div>
                              <div>Capacidad: {elevator.capacity}kg</div>
                              <div>Control: {elevator.controlType}</div>
                              {elevator.plateNumber && <div>Número de patente: {elevator.plateNumber}</div>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-[#694e35] mb-3">Otros equipos ({getBuildingEquipments(building.id).length})</h4>
                    {getBuildingEquipments(building.id).length === 0 ? (
                      <p className="text-[#5e4c1e] text-sm">No hay otros equipos en este edificio</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getBuildingEquipments(building.id).map((equipment) => (
                          <Link
                            key={equipment.id}
                            to={`/equipment/${equipment.id}`}
                            className="bg-white p-4 rounded-lg border-2 border-[#d4caaf] hover:border-[#fcca53] transition-colors focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-sm font-bold text-[#fcca53] uppercase">{getEquipmentTypeLabel(equipment.type)}</span>
                            </div>
                            <p className="text-lg font-bold text-[#694e35] mb-1">{equipment.name}</p>
                            <p className="text-sm text-[#5e4c1e] mb-2">{equipment.locationDescription}</p>
                            <div className="text-xs text-[#5e4c1e] space-y-1">
                              {equipment.brand && <div>Marca: {equipment.brand}</div>}
                              {equipment.model && <div>Modelo: {equipment.model}</div>}
                              {equipment.serialNumber && <div>Serie: {equipment.serialNumber}</div>}
                              {equipment.capacity && <div>Capacidad: {equipment.capacity}</div>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
