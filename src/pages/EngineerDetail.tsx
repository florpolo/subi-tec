import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataLayer, Engineer, EngineerReport } from '../lib/dataLayer';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';

export default function EngineerDetail() {
  const { id } = useParams<{ id: string }>();
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [reports, setReports] = useState<EngineerReport[]>([]);

  const loadData = async () => {
    if (!id) return;
    const [engineerData, reportsData] = await Promise.all([
      dataLayer.getEngineer(id),
      dataLayer.listEngineerReports(id),
    ]);
    setEngineer(engineerData);
    setReports(reportsData);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleMarkAsRead = async (reportId: string) => {
    await dataLayer.updateEngineerReport(reportId, { isRead: true });
    await loadData();
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

  const unreadReports = reports.filter(r => !r.isRead);
  const readReports = reports.filter(r => r.isRead);

  if (!engineer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#5e4c1e]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/engineers"
        className="inline-flex items-center gap-2 text-[#694e35] hover:text-[#5e4c1e] font-medium focus:outline-none focus:ring-2 focus:ring-[#fcca53] rounded px-2 py-1"
      >
        <ArrowLeft size={20} />
        Volver a Ingenieros
      </Link>

      <div className="bg-white rounded-xl shadow-lg border-2 border-[#d4caaf] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#fcca53] rounded-full flex items-center justify-center">
            <FileText size={32} className="text-[#694e35]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#694e35]">{engineer.name}</h2>
            <p className="text-[#5e4c1e]">Ingeniero</p>
          </div>
        </div>

        {engineer.contact && (
          <div className="mt-4 pt-4 border-t border-[#d4caaf]">
            <p className="text-sm text-[#5e4c1e]">
              <span className="font-medium">Contacto:</span> {engineer.contact}
            </p>
          </div>
        )}
      </div>

      {unreadReports.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#694e35] mb-4">
            Reportes Nuevos ({unreadReports.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {unreadReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-lg border-2 border-red-300 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        NUEVO
                      </span>
                      <span className="text-sm text-[#5e4c1e]">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-[#694e35] mb-1">{report.address}</h4>
                    {report.comments && (
                      <p className="text-sm text-[#5e4c1e] mt-2">{report.comments}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#d4caaf]">
                  <button
                    onClick={() => handleMarkAsRead(report.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={18} />
                    Marcar como Revisado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {readReports.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#694e35] mb-4">
            Reportes Revisados ({readReports.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {readReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-lg border-2 border-[#d4caaf] p-6 opacity-75"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={18} className="text-green-600" />
                      <span className="text-sm text-[#5e4c1e]">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-[#694e35] mb-1">{report.address}</h4>
                    {report.comments && (
                      <p className="text-sm text-[#5e4c1e] mt-2">{report.comments}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reports.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
          <FileText size={48} className="mx-auto text-[#d4caaf] mb-4" />
          <p className="text-[#5e4c1e] text-lg">Este ingeniero no tiene reportes todavía</p>
        </div>
      )}
    </div>
  );
}
