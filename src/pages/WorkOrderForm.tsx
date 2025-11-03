import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { dataLayer, Building, Elevator, Equipment, EquipmentType } from '../lib/dataLayer';
import { ArrowLeft, Plus, Search } from 'lucide-react';

// Normaliza: minúsculas y sin acentos (p.ej. "Córdoba" -> "cordoba")
const normalize = (s?: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');

export default function WorkOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [claimType, setClaimType] = useState<'Semiannual Tests' | 'Monthly Maintenance' | 'Corrective'>('Monthly Maintenance');
  const [correctiveType, setCorrectiveType] = useState<'Minor Repair' | 'Refurbishment' | 'Installation'>('Minor Repair');
  const [buildingId, setBuildingId] = useState<string>('');
  const [elevatorId, setElevatorId] = useState<string>('');
  const [technicianId, setTechnicianId] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const [showNewBuildingForm, setShowNewBuildingForm] = useState(false);
  const [showNewElevatorForm, setShowNewElevatorForm] = useState(false);

  const [equipmentType, setEquipmentType] = useState<EquipmentType>('elevator');
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentLocation, setNewEquipmentLocation] = useState('');
  const [newEquipmentBrand, setNewEquipmentBrand] = useState('');
  const [newEquipmentModel, setNewEquipmentModel] = useState('');
  const [newEquipmentSerial, setNewEquipmentSerial] = useState('');
  const [newEquipmentCapacity, setNewEquipmentCapacity] = useState('');

  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [newBuildingNeighborhood, setNewBuildingNeighborhood] = useState('');
  const [newBuildingContactPhone, setNewBuildingContactPhone] = useState('');
  const [newBuildingEntryHours, setNewBuildingEntryHours] = useState('');
  const [newBuildingClientName, setNewBuildingClientName] = useState('');
  // 🔥 REMOVED: relationship start date state
  // const [newBuildingRelationshipStartDate, setNewBuildingRelationshipStartDate] = useState('');

  const [newElevatorNumber, setNewElevatorNumber] = useState<number>(1);
  const [newElevatorLocation, setNewElevatorLocation] = useState('');

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  // ⬇️ Binario: solo 'free' | 'busy'
  const [technicianStatuses, setTechnicianStatuses] = useState<Record<string, 'free' | 'busy'>>({});

  // -------------------------------
  // Helpers de zona horaria (BA ⇄ UTC)
  // -------------------------------

  // Convierte "YYYY-MM-DDTHH:mm" (datetime-local en hora BA) a ISO UTC (para timestamptz)
  const baLocalToUtcIso = (local: string): string => {
    if (!local) return '';
    const [ydm, hm] = local.split('T');
    const [y, m, d] = ydm.split('-').map(Number);
    const [hh, mm] = hm.split(':').map(Number);
    // Argentina UTC-3 (sin DST): guardamos en UTC sumando 3 horas
    const utc = new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0, 0));
    return utc.toISOString();
  };

  // Convierte un ISO UTC (ej: "2025-10-19T18:00:00.000Z") a "YYYY-MM-DDTHH:mm" en hora BA (para input datetime-local)
  const isoUtcToBaInput = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso); // instante real en UTC
    // Pasamos a BA (UTC-3): restamos 3 horas en ms
    const ba = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = ba.getUTCFullYear();
    const m = pad(ba.getUTCMonth() + 1);
    const day = pad(ba.getUTCDate());
    const hh = pad(ba.getUTCHours());
    const mm = pad(ba.getUTCMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };

  // --- Typeahead (Edificio) ---
  const [buildingQuery, setBuildingQuery] = useState<string>('');     // texto del input de búsqueda
  const [isBuildingOpen, setIsBuildingOpen] = useState<boolean>(false);

  // etiqueta para mostrar del edificio seleccionado
  const buildingLabel = (b?: Building | null) =>
    b ? `${b.address}${b.neighborhood ? ' — ' + b.neighborhood : ''}` : '';

  useEffect(() => {
    const loadData = async () => {
      const [buildingsList, techniciansList, allOrders] = await Promise.all([
        dataLayer.listBuildings(),
        dataLayer.listTechnicians(),
        dataLayer.listWorkOrders(), // lo usamos para calcular estado binario
      ]);
      setBuildings(buildingsList);
      setTechnicians(techniciansList);

      // ✅ Estado binario por técnico: rojo si tiene ≥1 OT In Progress
      const statusMap: Record<string, 'free' | 'busy'> = {};
      for (const tech of techniciansList) {
        const hasInProgress = allOrders.some(
          (o: any) => o.technicianId === tech.id && o.status === 'In Progress'
        );
        statusMap[tech.id] = hasInProgress ? 'busy' : 'free';
      }
      setTechnicianStatuses(statusMap);

      if (isEditMode && id) {
        const order = await dataLayer.getWorkOrder(id);
        if (order) {
          setClaimType(order.claimType);
          if (order.correctiveType) setCorrectiveType(order.correctiveType);
          setBuildingId(order.buildingId);
          setElevatorId(order.elevatorId);
          setTechnicianId(order.technicianId || '');
          // ✅ Prellenar input con hora BA a partir del ISO UTC guardado
          setDateTime(order.dateTime ? isoUtcToBaInput(order.dateTime) : '');
          setDescription(order.description);
          setPriority(order.priority);

          // precargar texto del combo con la etiqueta del edificio seleccionado
          const b = buildingsList.find(x => x.id === order.buildingId) || null;
          setBuildingQuery(buildingLabel(b));
        }
      }
    };
    loadData();
  }, [isEditMode, id]);

  useEffect(() => {
    const loadEquipments = async () => {
      if (buildingId) {
        const [elevatorsList, equipmentsList] = await Promise.all([
          dataLayer.listElevators(buildingId),
          dataLayer.listEquipments(buildingId)
        ]);
        setElevators(elevatorsList);
        setEquipments(equipmentsList.filter(e => e.type !== 'elevator'));
      } else {
        setElevators([]);
        setEquipments([]);
      }
    };
    loadEquipments();
  }, [buildingId]);

  const handleCreateBuilding = async () => {
    if (!newBuildingAddress) {
      alert('Por favor ingrese una dirección');
      return;
    }
    const newBuilding = await dataLayer.createBuilding({
      address: newBuildingAddress,
      neighborhood: newBuildingNeighborhood,
      contactPhone: newBuildingContactPhone,
      entryHours: newBuildingEntryHours,
      clientName: newBuildingClientName,
      relationshipStartDate: new Date().toISOString().split('T')[0],
    });
    if (newBuilding) {
      setBuildingId(newBuilding.id);
      setBuildings([...buildings, newBuilding]);
      setBuildingQuery(buildingLabel(newBuilding)); // reflejar en el input
    }
    setShowNewBuildingForm(false);
    setNewBuildingAddress('');
    setNewBuildingNeighborhood('');
    setNewBuildingContactPhone('');
    setNewBuildingEntryHours('');
    setNewBuildingClientName('');
    // 🔥 REMOVED: setNewBuildingRelationshipStartDate('');
  };

  const handleCreateEquipment = async () => {
    if (!buildingId) {
      alert('Por favor seleccione un edificio primero');
      return;
    }

    if (equipmentType === 'elevator') {
      if (!newElevatorLocation) {
        alert('Por favor ingrese la ubicación del ascensor');
        return;
      }
      const newElevator = await dataLayer.createElevator({
        buildingId,
        number: newElevatorNumber,
        locationDescription: newElevatorLocation,
        hasTwoDoors: false,
        status: 'fit',
        stops: 8,
        capacity: 450,
        machineRoomLocation: 'Azotea',
        controlType: 'Automático',
      });
      if (newElevator) {
        setElevatorId(newElevator.id);
        setElevators([...elevators, newElevator]);
      }
      setShowNewElevatorForm(false);
      setNewElevatorNumber(1);
      setNewElevatorLocation('');
    } else {
      if (!newEquipmentLocation) {
        alert('La ubicación es obligatoria');
        return;
      }
      const newEquipment = await dataLayer.createEquipment({
        buildingId,
        type: equipmentType,
        name: newEquipmentName.trim() || `${getEquipmentTypeLabel(equipmentType)} ${equipments.length + 1}`,
        locationDescription: newEquipmentLocation.trim(),
        brand: newEquipmentBrand.trim() || null,
        model: newEquipmentModel.trim() || null,
        serialNumber: newEquipmentSerial.trim() || null,
        capacity: newEquipmentCapacity.trim() ? parseFloat(newEquipmentCapacity) : null,
        status: 'fit',
      });
      if (newEquipment) {
        setEquipments([...equipments, newEquipment]);
        alert('Equipo creado exitosamente');
      }
      setShowNewElevatorForm(false);
      setNewEquipmentName('');
      setNewEquipmentLocation('');
      setNewEquipmentBrand('');
      setNewEquipmentModel('');
      setNewEquipmentSerial('');
      setNewEquipmentCapacity('');
    }
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!buildingId || !elevatorId || !description) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      if (isEditMode && id) {
        await dataLayer.updateWorkOrder(id, {
          claimType,
          correctiveType: claimType === 'Corrective' ? correctiveType : undefined,
          buildingId,
          elevatorId,
          technicianId: technicianId || undefined,
          // ✅ Guardar en UTC para que no se corra la hora
          dateTime: dateTime ? baLocalToUtcIso(dateTime) : undefined,
          description,
          priority,
        });
        navigate(`/orders/${id}`);
      } else {
        const newOrder = await dataLayer.createWorkOrder({
          claimType,
          correctiveType: claimType === 'Corrective' ? correctiveType : undefined,
          buildingId,
          elevatorId,
          technicianId: technicianId || undefined,
          contactName: '',  // si el esquema lo exige
          contactPhone: '',
          // ✅ Guardar en UTC para que no se corra la hora
          dateTime: dateTime ? baLocalToUtcIso(dateTime) : undefined,
          description,
          status: 'Pending',
          priority,
        });
        if (newOrder) {
          navigate(`/orders/${newOrder.id}`);
        } else {
          navigate('/orders');
        }
      }
    } catch (err) {
      console.error('Error al guardar la orden:', err);
      alert(`❌ Error al guardar la orden: ${err instanceof Error ? err.message : 'ver consola'}`);
    }
  };

  // --- Filtrado de edificios para el typeahead ---
  const filteredBuildings: Building[] = (() => {
    const q = normalize(buildingQuery);
    if (!q) return buildings;
    return buildings.filter(b =>
      normalize(b.address).includes(q) ||
      normalize(b.neighborhood).includes(q)
    );
  })();

  // edificio seleccionado (obj)
  const selectedBuilding = buildings.find(b => b.id === buildingId) || null;

  return (
    <div className="space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-[#694e35] hover:text-[#5e4c1e] font-medium focus:outline-none focus:ring-2 focus:ring-[#fcca53] rounded px-2 py-1"
      >
        <ArrowLeft size={20} />
        Volver a Órdenes
      </Link>

      <div className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] p-6">
        <h2 className="text-3xl font-bold text-[#694e35] mb-6">
          {isEditMode ? 'Editar Orden de Trabajo' : 'Crear Orden de Trabajo'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Tipo de Reclamo <span className="text-red-600">*</span>
              </label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
              >
                <option value="Semiannual Tests">Pruebas semestrales</option>
                <option value="Monthly Maintenance">Mantenimiento mensual</option>
                <option value="Corrective">Correctivo</option>
              </select>
            </div>

            {claimType === 'Corrective' && (
              <div>
                <label className="block text-[#694e35] font-bold mb-2">
                  Tipo de Correctivo <span className="text-red-600">*</span>
                </label>
                <select
                  value={correctiveType}
                  onChange={(e) => setCorrectiveType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
                >
                  <option value="Minor Repair">Reparación menor</option>
                  <option value="Refurbishment">Reacondicionamiento</option>
                  <option value="Installation">Instalación</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[#694e35] font-bold mb-2">
                Prioridad <span className="text-red-600">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
              >
                <option value="Low">Baja</option>
                <option value="Medium">Media</option>
                <option value="High">Alta</option>
              </select>
            </div>
          </div>

          <div className="border-t-2 border-[#d4caaf] pt-6">
            <h3 className="text-xl font-bold text-[#694e35] mb-4">Ubicación</h3>

            <div className="space-y-4">
              {/* ==== Edificio con Typeahead ==== */}
              <div className="relative">
                <label className="block text-[#694e35] font-bold mb-2">
                  Edificio <span className="text-red-600">*</span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e4c1e]" />
                    <input
                      type="text"
                      placeholder="Seleccione o busque un edificio"
                      value={isBuildingOpen ? buildingQuery : buildingLabel(selectedBuilding) || buildingQuery}
                      onChange={(e) => {
                        setBuildingQuery(e.target.value);
                        setIsBuildingOpen(true);
                        if (!e.target.value) {
                          setBuildingId('');
                          setElevatorId('');
                        }
                      }}
                      onFocus={() => setIsBuildingOpen(true)}
                      onBlur={() => setTimeout(() => setIsBuildingOpen(false), 120)}
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
                    />

                    {/* Dropdown de coincidencias */}
                    {isBuildingOpen && (
                      <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border-2 border-[#d4caaf] rounded-lg shadow">
                        {filteredBuildings.length === 0 ? (
                          <div className="px-3 py-2 text-[#5e4c1e] text-sm">Sin coincidencias</div>
                        ) : (
                          filteredBuildings.map((b) => (
                            <button
                              type="button"
                              key={b.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setBuildingId(b.id);
                                setElevatorId('');
                                setBuildingQuery(buildingLabel(b));
                                setIsBuildingOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#ffe5a5] ${
                                b.id === buildingId ? 'bg-[#fff6d6]' : ''
                              }`}
                            >
                              <div className="font-medium text-[#694e35]">{b.address}</div>
                              {b.neighborhood && (
                                <div className="text-[#5e4c1e] opacity-80">{b.neighborhood}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewBuildingForm(!showNewBuildingForm)}
                    className="px-4 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
                    title="Crear edificio"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {showNewBuildingForm && (
                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-[#d4caaf] space-y-3">
                    <h4 className="font-bold text-[#694e35]">Nuevo Edificio</h4>
                    <input
                      type="text"
                      placeholder="Dirección *"
                      value={newBuildingAddress}
                      onChange={(e) => setNewBuildingAddress(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                    />
                    <input
                      type="text"
                      placeholder="Barrio"
                      value={newBuildingNeighborhood}
                      onChange={(e) => setNewBuildingNeighborhood(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                    />
                    <input
                      type="text"
                      placeholder="Teléfono de contacto"
                      value={newBuildingContactPhone}
                      onChange={(e) => setNewBuildingContactPhone(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                    />
                    <input
                      type="text"
                      placeholder="Horario de ingreso (ej: Lun–Jue 9–13)"
                      value={newBuildingEntryHours}
                      onChange={(e) => setNewBuildingEntryHours(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                    />
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={newBuildingClientName}
                      onChange={(e) => setNewBuildingClientName(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                    />
                    {/* 🔥 REMOVED: input de Fecha de inicio de relación */}
                    <button
                      type="button"
                      onClick={handleCreateBuilding}
                      className="w-full px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
                    >
                      Crear Edificio
                    </button>
                  </div>
                )}
              </div>
              {/* ==== /Edificio ==== */}

              {buildingId && (
                <div>
                  <label className="block text-[#694e35] font-bold mb-2">
                    Equipos <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={elevatorId}
                      onChange={(e) => setElevatorId(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
                    >
                      <option value="">Seleccione un equipo</option>
                      {elevators.length > 0 && (
                        <optgroup label="Ascensores">
                          {elevators.map((elevator) => (
                            <option key={elevator.id} value={elevator.id}>
                              Ascensor #{elevator.number} — {elevator.locationDescription}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {equipments.length > 0 && (
                        <optgroup label="Otros equipos">
                          {equipments.map((equipment) => (
                            <option key={equipment.id} value={equipment.id}>
                              {getEquipmentTypeLabel(equipment.type)}: {equipment.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewElevatorForm(!showNewElevatorForm)}
                      className="px-4 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {showNewElevatorForm && (
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-[#d4caaf] space-y-3">
                      <h4 className="font-bold text-[#694e35]">Nuevo Equipo</h4>

                      <div>
                        <label className="block text-[#694e35] font-medium mb-1 text-sm">Tipo de equipo</label>
                        <select
                          value={equipmentType}
                          onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
                          className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
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

                      {equipmentType === 'elevator' ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Nombre (opcional, se genera automáticamente)"
                            value={newEquipmentName}
                            onChange={(e) => setNewEquipmentName(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                          <input
                            type="text"
                            placeholder="Ubicación/Descripción *"
                            value={newEquipmentLocation}
                            onChange={(e) => setNewEquipmentLocation(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                          <input
                            type="text"
                            placeholder="Marca (opcional)"
                            value={newEquipmentBrand}
                            onChange={(e) => setNewEquipmentBrand(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                          <input
                            type="text"
                            placeholder="Capacidad (opcional)"
                            value={newEquipmentCapacity}
                            onChange={(e) => setNewEquipmentCapacity(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                          />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handleCreateEquipment}
                        className="w-full px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
                      >
                        {equipmentType === 'elevator' ? 'Crear Ascensor' : 'Crear Equipo'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t-2 border-[#d4caaf] pt-6">
            <h3 className="text-xl font-bold text-[#694e35] mb-4">Asignación y Detalles</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[#694e35] font-bold mb-2">Técnico</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {technicians.map((technician) => {
                    const status = technicianStatuses[technician.id] || 'free';
                    // 🟢 libre / 🔴 ocupado (si tiene ≥1 OT In Progress)
                    const statusDot = status === 'busy' ? '🔴' : '🟢';
                    return (
                      <option key={technician.id} value={technician.id}>
                        {statusDot} {technician.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[#694e35] font-bold mb-2">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#694e35] font-bold mb-2">
              Descripción <span className="text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-[#d4caaf] rounded-lg text-[#694e35] focus:outline-none focus:ring-2 focus:ring-[#fcca53] focus:border-transparent"
              placeholder="Describa el problema o trabajo a realizar..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#694e35]"
            >
              {isEditMode ? 'Guardar Cambios' : 'Crear Orden de Trabajo'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="px-6 py-3 bg-[#d4caaf] text-[#694e35] rounded-lg font-bold hover:bg-[#bda386] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
