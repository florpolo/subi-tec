import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  dataLayer,
  WorkOrder,
  Building,
  Elevator,
  Technician,
  ElevatorHistory
} from '../lib/dataLayer';
import { ArrowLeft, FileText, Paperclip, Package, History, Edit } from 'lucide-react';
import DownloadWorkOrderPDF from '../components/downloadpdf';
import RemitoRenderer from '../components/RemitoRenderer';

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [elevator, setElevator] = useState<Elevator | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [elevatorHistory, setElevatorHistory] = useState<ElevatorHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attachments' | 'parts' | 'history'>('overview');
  const [error, setError] = useState<string | null>(null);

  // ⬇️ Estados para el remito
  const [showRemito, setShowRemito] = useState(false);
  const [remitoTemplate, setRemitoTemplate] = useState<any | null>(null);
  const [remitoNumber, setRemitoNumber] = useState<string | null>(null);
  const [loadingRemito, setLoadingRemito] = useState(false);
  const [remitoError, setRemitoError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      if (!id) return;

      const foundOrder = await dataLayer.getWorkOrder(id);
      if (!foundOrder) {
        navigate('/orders');
        return;
      }
      setOrder(foundOrder);

      const [buildingData, elevatorData, historyData] = await Promise.all([
        dataLayer.getBuilding(foundOrder.buildingId),
        dataLayer.getElevator(foundOrder.elevatorId),
        dataLayer.getElevatorHistory(foundOrder.elevatorId)
      ]);

      setBuilding(buildingData || null);
      setElevator(elevatorData || null);
      setElevatorHistory(historyData || []);

      if (foundOrder.technicianId) {
        const techData = await dataLayer.getTechnician(foundOrder.technicianId);
        setTechnician(techData || null);
      }
    } catch (e: any) {
      console.error('WorkOrderDetail loadData error:', e);
      setError(e?.message ?? String(e));
    }
  };

  // ⬇️ Acción "Generar remito": busca template + número y abre el modal
  const handleOpenRemito = async () => {
    if (!order) return;
    try {
      setRemitoError(null);
      setLoadingRemito(true);

      // 1) Plantilla por defecto de la empresa activa
      const tpl = await dataLayer.getDefaultRemitoTemplate();
      if (!tpl) {
        throw new Error('No hay plantilla de remito configurada para esta empresa.');
      }

      // 2) Parsear fields si vinieron como string
      const fields = typeof tpl.fields === 'string' ? JSON.parse(tpl.fields) : tpl.fields;

      // 3) Obtener número secuencial
      const n = await dataLayer.getNextRemitoNo();
      const padded = String(n).padStart(8, '0');

      // 4) Guardar en estado y abrir modal
      setRemitoTemplate({ image_url: tpl.image_url, fields, name: tpl.name ?? 'Remito' });
      setRemitoNumber(padded);
      setShowRemito(true);
    } catch (e: any) {
      console.error('Remito error:', e);
      setRemitoError(e?.message ?? String(e));
    } finally {
      setLoadingRemito(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (error) {
    return (
      <div className="p-6">
        <Link to="/orders" className="inline-flex items-center gap-2 text-[#694e35] underline">
          <ArrowLeft size={20} /> Volver a Órdenes
        </Link>
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="font-bold mb-1">Error cargando la orden</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

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
            {/* 1) Información del Reclamo + 2) Ubicación + 3) Asignación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Reclamo */}
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

              {/* Ubicación */}
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
                    <span className="text-[#5e4c1e]">Ascensor:</span>{' '}
                    <Link
                      to={`/elevators/${elevator?.id}`}
                      className="font-medium text-[#694e35] hover:text-[#fcca53] underline"
                    >
                      {elevator
                        ? `${elevator.number} - ${elevator.locationDescription}`
                        : 'Desconocido'}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Asignación */}
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

            {/* Repuestos usados (debajo de Asignación) */}
            <div className="mt-2 rounded-xl border border-yellow-200 bg-yellow-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-[#694e35]">Repuestos usados</h3>
              </div>

              {order?.partsUsed?.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#694e35]">
                        <th className="py-2 pr-3">Nombre del repuesto</th>
                        <th className="py-2 pr-3">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#d4caaf]">
                      {order.partsUsed.map((part, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-3 text-[#694e35] font-medium">{part?.name ?? ''}</td>
                          <td className="py-2 pr-3 text-[#694e35]">{part?.quantity ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[#5e4c1e]">No se utilizaron repuestos</p>
              )}
            </div>

            {/* Comentarios */}
            {order.comments && (
              <div>
                <h3 className="font-bold text-[#694e35] mb-3">Comentarios</h3>
                <p className="text-[#5e4c1e] bg-white p-4 rounded-lg border border-[#d4caaf]">
                  {order.comments}
                </p>
              </div>
            )}

            {/* Firma del Cliente */}
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

            {/* Botones al final del resumen */}
            <div className="pt-2 flex flex-wrap gap-3">
              <DownloadWorkOrderPDF
                order={order}
                building={building}
                elevator={elevator}
                technician={technician}
                companyName="SubiTec"
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 font-bold text-[#520f0f] hover:bg-yellow-400"
                label="Descargar PDF"
              />

              <button
                onClick={handleOpenRemito}
                disabled={loadingRemito}
                className="inline-flex items-center gap-2 rounded-lg bg-[#fcca53] px-4 py-2 font-bold text-[#694e35] hover:bg-[#ffe5a5] disabled:opacity-60"
              >
                {loadingRemito ? 'Generando remito...' : 'Generar Remito'}
              </button>

              {remitoError && (
                <span className="text-red-700 text-sm">{remitoError}</span>
              )}
            </div>

            {/* Modal Remito */}
            {showRemito && remitoTemplate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-4xl rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-[#694e35]">
                      {remitoTemplate?.name ?? 'Remito'}
                      {remitoNumber ? ` · Nº ${remitoNumber}` : ''}
                    </h3>
                    <button
                      onClick={() => setShowRemito(false)}
                      className="rounded px-3 py-1 border border-[#d4caaf] hover:bg-[#f4ead0]"
                    >
                      Cerrar
                    </button>
                  </div>

                  <RemitoRenderer
                    order={order}
                    building={building ?? undefined}
                    template={remitoTemplate}
                    remitoNumber={remitoNumber ?? undefined}
                  />
                </div>
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
        {/* ===== Fin contenido por tab ===== */}
      </div>
    </div>   {/* <-- ESTE </div> FALTABA (cierra el contenedor externo) */}
  );
}
