import { useState, useEffect } from 'react';
import { dataLayer, EngineerReport } from '../lib/dataLayer';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus } from 'lucide-react';

export default function EngineerReports() {
  const { engineerId } = useAuth();
  const [reports, setReports] = useState<EngineerReport[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [address, setAddress] = useState('');
  const [comments, setComments] = useState('');

  const loadReports = async () => {
    if (!engineerId) return;
    const reportsList = await dataLayer.listEngineerReports(engineerId);
    setReports(reportsList);
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, [engineerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!engineerId) {
      alert('No se pudo identificar el ingeniero');
      return;
    }

    if (!address.trim()) {
      alert('La dirección es obligatoria');
      return;
    }

    await dataLayer.createEngineerReport({
      engineerId,
      address: address.trim(),
      comments: comments.trim() || null,
      isRead: false,
    });

    alert('¡Reporte creado exitosamente!');
    setAddress('');
    setComments('');
    setShowForm(false);
    await loadReports();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const baDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return baDate.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#694e35] mb-2">Mis Reportes</h2>
          <p className="text-[#5e4c1e]">Crear y visualizar reportes de ingeniería</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#694e35]"
        >
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Nuevo Reporte'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-[#d4caaf] p-6">
          <h3 className="text-xl font-bold text-[#694e35] mb-4">Crear Nuevo Reporte</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#694e35] font-medium mb-2">
                Dirección <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
                className="w-full px-4 py-3 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>

            <div>
              <label className="block text-[#694e35] font-medium mb-2">
                Comentarios
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Descripción opcional del reporte..."
                className="w-full px-4 py-3 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
              >
                Guardar Reporte
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setAddress('');
                  setComments('');
                }}
                className="px-6 py-3 bg-[#d4caaf] text-[#694e35] rounded-lg font-medium hover:bg-[#bda386] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-[#694e35] mb-4">
          Historial de Reportes ({reports.length})
        </h3>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
            <FileText size={48} className="mx-auto text-[#d4caaf] mb-4" />
            <p className="text-[#5e4c1e] text-lg mb-4">No hay reportes todavía</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block px-6 py-3 bg-[#fcca53] text-[#694e35] rounded-lg font-bold hover:bg-[#ffe5a5] transition-colors"
            >
              Crear tu primer reporte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-lg border-2 border-[#d4caaf] p-6 hover:border-[#fcca53] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-[#694e35] mb-1">{report.address}</h4>
                    <p className="text-sm text-[#5e4c1e]">
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                  {report.isRead && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Revisado
                    </span>
                  )}
                </div>

                {report.comments && (
                  <div className="mt-3 pt-3 border-t border-[#d4caaf]">
                    <p className="text-sm text-[#5e4c1e]">{report.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
