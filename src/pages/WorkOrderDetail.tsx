import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  dataLayer,
  WorkOrder,
  Building,
  Elevator,
  Technician,
  ElevatorHistory,
  Equipment
} from '../lib/dataLayer';
import { ArrowLeft, FileText, Paperclip, Package, History, Edit, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { renderRemitoPdf } from '../components/RemitoRenderer';
import { supabaseDataLayer } from '../lib/supabaseDataLayer';
import { useAuth } from '../contexts/AuthContext'; // Assuming useAuth exists

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, companyId } = useAuth(); // Get user and companyId from AuthContext

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [elevator, setElevator] = useState<Elevator | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [elevatorHistory, setElevatorHistory] = useState<ElevatorHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attachments' | 'parts' | 'history'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [loadingRemito, setLoadingRemito] = useState(false);
  const [completingTask, setCompletingTask] = useState(false); // New state for completing task

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (!id || id === 'undefined') return;

      const foundOrder = await dataLayer.getWorkOrder(id);
      if (!foundOrder) {
        navigate('/orders');
        return;
      }
      setOrder(foundOrder);

      const buildingData = await dataLayer.getBuilding(foundOrder.buildingId);
      setBuilding(buildingData || null);

      if (foundOrder.elevatorId) {
        const [elevatorData, historyData] = await Promise.all([
          dataLayer.getElevator(foundOrder.elevatorId),
          dataLayer.getElevatorHistory(foundOrder.elevatorId)
        ]);
        setElevator(elevatorData || null);
        setElevatorHistory(historyData || []);
      } else if (foundOrder.equipmentId) {
        const equipmentData = await dataLayer.getEquipment(foundOrder.equipmentId);
        setEquipment(equipmentData || null);
        // TODO: Decide if equipments have a history to be loaded
      }

      if (foundOrder.technicianId) {
        const techData = await dataLayer.getTechnician(foundOrder.technicianId);
        setTechnician(techData || null);
      }
    } catch (e: unknown) {
      console.error('WorkOrderDetail loadData error:', e);
      setError((e as Error)?.message ?? String(e));
    }
  }, [id, navigate]);

  const handleDownloadRemito = async () => {
    if (!order || !companyId) return;
    setLoadingRemito(true);
    try {
      // 1) Guard clauses
      if (order.status !== 'Completed') throw new Error('Only completed orders can generate a remito.');
      if (!order.finishTime) throw new Error('Missing finish date/time.');
      if (!order.buildingId) throw new Error('Missing building.');
  
      // 2) Fetch building for address
      const building = await supabaseDataLayer.getBuilding(order.buildingId, companyId);
      if (!building?.address) throw new Error('Building address not found.');
  
      // 3) Get next number (atomic)
      const remitoNumber = await supabaseDataLayer.getNextRemitoNumber(companyId);
  
      // 4) Compose payload for rendering
      const payload = {
        number8d: remitoNumber,
        fechaDDMMYYYY: new Date(order.finishTime).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        domicilio: building.address,
        descripcion: (order.comments ?? '').trim(),
        firmaDataUrl: order.signatureDataUrl ?? undefined,
      };
  
      // 6) Render PDF in the browser
      const pdfBlob = await renderRemitoPdf(payload);

      // NEW: Upload the PDF to Supabase Storage
      const publicUrl = await supabaseDataLayer.uploadRemitoPdf(pdfBlob, companyId, order.id, remitoNumber);
      if (!publicUrl) {
        throw new Error('Failed to upload remito PDF.');
      }

      // 8) Persist audit record (one per work order) with the public URL
      await supabaseDataLayer.upsertRemitoRecord(companyId, order.id, remitoNumber, publicUrl);

      // 7) Trigger download (using the public URL)
      const a = document.createElement('a');
      a.href = publicUrl;
      a.download = `remito_${remitoNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

    } catch (err) {
      alert((err as Error).message || 'Error generating remito.');
    } finally {
      setLoadingRemito(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!order || !companyId || !user?.id) {
      alert('Missing order, company ID, or user information.');
      return;
    }

    if (order.status === 'Completed') {
      alert('Esta orden de trabajo ya está completada.');
      return;
    }

    if (order.technicianId && technician && technician.user_id && technician.user_id !== user.id) {
        alert('No estás autorizado para completar esta orden de trabajo.');
        return;
    }

    if (!order.signatureDataUrl) {
      alert('La firma del cliente es requerida para completar esta orden de trabajo.');
      return;
    }

    if (!window.confirm('¿Marcar esta orden de trabajo como Completada?')) {
      return;
    }

    setCompletingTask(true);
    const originalOrder = { ...order };

    try {
      setOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        status: 'Completed',
        finishTime: new Date().toISOString(),
      } : null);

      const updatedOrder = await supabaseDataLayer.completeWorkOrder(
        order.id,
        companyId,
        {
          comments: order.comments,
          partsUsed: order.partsUsed,
          photoUrls: order.photoUrls,
          signatureDataUrl: order.signatureDataUrl,
        }
      );

      if (updatedOrder) {
        setOrder(updatedOrder); 
        alert('¡Orden de trabajo marcada como Completada!');
      } else {
        throw new Error('Failed to receive updated work order from server.');
      }

    } catch (err) {
      console.error('Error completing task:', err);
      setOrder(originalOrder);
      alert((err as Error).message || 'Error al completar la tarea. Inténtalo de nuevo.');
    } finally {
      setCompletingTask(false);
    }
  };


  useEffect(() => {
    loadData();
  }, [id, loadData]);

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[#5e4c1e] text-lg">Cargando...</p>
      </div>
    );
  }


  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'Completada';
      case 'In Progress':
        return 'En curso';
      case 'Pending':
        return 'Por hacer';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-red-600 border-red-600';
      case 'Medium':
        return 'text-yellow-700 border-yellow-700';
      case 'Low':
        return 'text-green-600 border-green-600';
      default:
        return 'text-[#5e4c1e] border-[#d4caaf]';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'Alta';
      case 'Medium':
        return 'Media';
      case 'Low':
        return 'Baja';
      default:
        return priority;
    }
  };

  const getClaimTypeLabel = (claimType: string) => {
    switch (claimType) {
      case 'Semiannual Tests':
        return 'Pruebas semestrales';
      case 'Monthly Maintenance':
        return 'Mantenimiento mensual';
      case 'Corrective':
        return 'Correctivo';
      default:
        return claimType;
    }
  };

  const getCorrectiveTypeLabel = (correctiveType?: string) => {
    if (!correctiveType) return '';
    switch (correctiveType) {
      case 'Minor Repair':
        return 'Reparación menor';
      case 'Refurbishment':
        return 'Reacondicionamiento';
      case 'Installation':
        return 'Instalación';
      default:
        return correctiveType;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: FileText },
    { id: 'attachments', label: 'Adjuntos', icon: Paperclip },
    { id: 'parts', label: 'Repuestos', icon: Package },
    { id: 'history', label: 'Historial del Ascensor', icon: History }
  ] as const;

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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#694e35] mb-2">Orden de Trabajo</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-2 py-0.5 text-xs font-medium border ${getPriorityColor(
                  order.priority
                )} rounded`}
              >
                {getPriorityLabel(order.priority)}
              </span>
              <span className="text-sm text-[#5e4c1e]">Estado: {getStatusLabel(order.status)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/orders/${order.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-[#520f0f] rounded-lg font-medium hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
            >
              <Edit size={18} />
              Editar
            </Link>            
            {order.status !== 'Completed' && ( // Only show if not completed
                <button
                  onClick={handleCompleteTask}
                  disabled={completingTask}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-600 disabled:opacity-60"
                >
                  <CheckCircle size={18} />
                  {completingTask ? 'Completando...' : 'Completar Tarea'}
                </button>
            )}

            {order.status === 'Completed' && (
                <button
                  onClick={handleDownloadRemito}
                  disabled={loadingRemito}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#fcca53] px-4 py-2 font-bold text-[#694e35] hover:bg-[#ffe5a5] disabled:opacity-60"
                >
                  {loadingRemito ? 'Generando remito...' : 'Descargar Remito'}
                </button>
              )}
            </div>
          </div>

        {/* Tabs */}
        <div className="border-b border-[#d4caaf] mb-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-yellow-500 text-[#520f0f]'
                      : 'border-transparent text-gray-600 hover:text-[#520f0f]'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>



        {/* ===== Contenido por tab ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Información del Reclamo</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[#5e4c1e]">Tipo:</span>{' '}
                    <span className="font-medium text-[#694e35]">
                      {getClaimTypeLabel(order.claimType)}
                    </span>
                  </div>

                  {order.correctiveType && (
                    <div>
                      <span className="text-[#5e4c1e]">Tipo de Correctivo:</span>{' '}
                      <span className="font-medium text-[#694e35]">
                        {getCorrectiveTypeLabel(order.correctiveType)}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[#5e4c1e]">Descripción:</span>{' '}
                    <span className="font-medium text-[#694e35]">{order.description}</span>
                  </div>

                  {order.dateTime && (
                    <div>
                      <span className="text-[#5e4c1e]">Programada:</span>{' '}
                      <span className="font-medium text-[#694e35]">
                        {new Date(order.dateTime).toLocaleString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[#5e4c1e]">Creada:</span>{' '}
                    <span className="font-medium text-[#694e35]">
                      {new Date(order.createdAt).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Ubicación</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[#5e4c1e]">Edificio:</span>{' '}
                    <span className="font-medium text-[#694e35]">
                      {building?.address || 'Desconocido'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5e4c1e]">Barrio:</span>{' '}
                    <span className="font-medium text-[#694e35]">
                      {building?.neighborhood || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5e4c1e]">{equipment ? 'Equipo:' : 'Ascensor:'}</span>{' '}
                    {elevator && (
                      <Link
                        to={`/elevators/${elevator.id}`}
                        className="font-medium text-[#694e35] hover:text-[#fcca53] underline"
                      >
                        {`${elevator.number} - ${elevator.locationDescription}`}
                      </Link>
                    )}
                    {equipment && (
                      <Link
                        to={`/equipment/${equipment.id}`}
                        className="font-medium text-[#694e35] hover:text-[#fcca53] underline"
                      >
                        {`${equipment.name} - ${equipment.locationDescription}`}
                      </Link>
                    )}
                    {!elevator && !equipment && (
                      <span className="font-medium text-[#694e35]">Desconocido</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Asignación</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[#5e4c1e]">Técnico:</span>{' '}
                    <span className="font-medium text-[#694e35]">
                      {technician?.name || 'Sin asignar'}
                    </span>
                  </div>
                  {order.startTime && (
                    <div>
                      <span className="text-[#5e4c1e]">Iniciada:</span>{' '}
                      <span className="font-medium text-[#694e35]">
                        {new Date(order.startTime).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  {order.finishTime && (
                    <div>
                      <span className="text-[#5e4c1e]">Finalizada:</span>{' '}
                      <span className="font-medium text-[#694e35]">
                        {new Date(order.finishTime).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {order.comments && (
              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Comentarios</h3>
                <p className="text-[#5e4c1e] bg-white p-4 rounded-lg border border-[#d4caaf]">
                  {order.comments}
                </p>
              </div>
            )}

            {order.signatureDataUrl && (
              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Firma del Cliente</h3>
                <img
                  src={order.signatureDataUrl}
                  alt="Firma del cliente"
                  className="border-2 border-[#d4caaf] rounded-lg bg-white max-w-md"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#694e35]">Fotos</h3>
            {order.photoUrls && order.photoUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {order.photoUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Adjunto ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-[#d4caaf]"
                  />
                ))}
              </div>
            ) : (
              <p className="text-[#5e4c1e]">No hay fotos adjuntas</p>
            )}
          </div>
        )}

        {activeTab === 'parts' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#694e35]">Repuestos Utilizados</h3>
            {order.partsUsed && order.partsUsed.length > 0 ? (
              <table className="w-full">
                <thead className="bg-[#d4caaf]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#694e35] font-bold">Nombre del Repuesto</th>
                    <th className="px-4 py-3 text-left text-[#694e35] font-bold">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#d4caaf]">
                  {order.partsUsed.map((part, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-[#694e35]">{part.name}</td>
                      <td className="px-4 py-3 text-[#694e35]">{part.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[#5e4c1e]">No se utilizaron repuestos</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#694e35]">Historial del Ascensor #{elevator?.number}</h3>
            {elevatorHistory.length > 0 ? (
              <div className="space-y-3">
                {elevatorHistory.map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-lg border border-[#d4caaf]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-[#694e35]">{entry.technicianName}</span>
                      <span className="text-sm text-[#5e4c1e]">
                        {new Date(entry.date).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
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
            ) : (
              <p className="text-[#5e4c1e]">No hay entradas en el historial</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}