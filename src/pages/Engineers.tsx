import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataLayer, Engineer } from '../lib/dataLayer';
import { User, FileText } from 'lucide-react';

export default function Engineers() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const [engineersList, counts] = await Promise.all([
      dataLayer.listEngineers(),
      dataLayer.countUnreadReportsByEngineer(),
    ]);
    setEngineers(engineersList);
    setUnreadCounts(counts);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#694e35] mb-2">Ingenieros</h2>
          <p className="text-[#5e4c1e]">Gestionar ingenieros y sus reportes</p>
        </div>
      </div>

      {engineers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-8 text-center">
          <User size={48} className="mx-auto text-[#d4caaf] mb-4" />
          <p className="text-[#5e4c1e] text-lg mb-4">No hay ingenieros todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {engineers.map((engineer) => {
            const unreadCount = unreadCounts[engineer.id] || 0;

            return (
              <Link
                key={engineer.id}
                to={`/engineers/${engineer.id}`}
                className="bg-white rounded-xl shadow-lg border-2 border-[#d4caaf] hover:border-[#fcca53] transition-colors p-6 focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#fcca53] rounded-full flex items-center justify-center">
                      <User size={24} className="text-[#694e35]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#694e35]">{engineer.name}</h3>
                      <p className="text-sm text-[#5e4c1e]">Ingeniero</p>
                    </div>
                  </div>
                </div>

                {engineer.contact && (
                  <div className="mb-4 text-sm text-[#5e4c1e]">
                    <span className="font-medium">Contacto:</span> {engineer.contact}
                  </div>
                )}

                <div className="pt-4 border-t border-[#d4caaf] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5e4c1e]">
                    <FileText size={18} />
                    <span className="text-sm">Reportes</span>
                  </div>
                  {unreadCount > 0 ? (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Sin reportes nuevos
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
