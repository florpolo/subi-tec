import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Plus, X } from 'lucide-react';

interface Company {
  id: string;
  company_id: string;
  company_name: string;
}

export default function EngineerDashboard() {
  const { engineerId, engineerMemberships, activeCompanyId, setActiveCompany } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningCompany, setJoiningCompany] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (engineerId) {
      loadCompanies();
    }
  }, [engineerId]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('engineer_company_memberships')
        .select('id, company_id, company:companies(name)')
        .eq('engineer_id', engineerId!);

      if (error) throw error;

      const companiesData = (data || []).map((row: any) => ({
        id: row.id,
        company_id: row.company_id,
        company_name: row.company?.name || 'Unknown',
      }));

      setCompanies(companiesData);
    } catch (err: any) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!joinCode.trim()) {
      setJoinError('Por favor ingresa un código de ingreso');
      return;
    }

    try {
      setJoiningCompany(true);
      setJoinError('');

      const { data: codeData, error: codeError } = await supabase
        .from('company_join_codes')
        .select('company_id')
        .eq('code', joinCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (codeError) throw codeError;
      if (!codeData) {
        throw new Error('Código de ingreso inválido o inactivo');
      }

      const { error: membershipError } = await supabase
        .from('engineer_company_memberships')
        .insert({
          engineer_id: engineerId!,
          company_id: codeData.company_id,
        });

      if (membershipError) {
        if (membershipError.code === '23505') {
          throw new Error('Ya estás asociado a esta compañía');
        }
        throw membershipError;
      }

      setShowJoinModal(false);
      setJoinCode('');
      await loadCompanies();
      alert('Te has unido a la compañía exitosamente');
    } catch (err: any) {
      setJoinError(err.message || 'Error al unirse a la compañía');
    } finally {
      setJoiningCompany(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setActiveCompany(companyId);
    navigate('/engineer-reports');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#520f0f]">Mis Compañías</h1>
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#520f0f] text-white rounded-lg hover:bg-[#6b1414] transition-colors"
        >
          <Plus size={20} />
          Unirse a Compañía
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No estás asociado a ninguna compañía
          </h2>
          <p className="text-gray-500 mb-6">
            Usa un código de ingreso para unirte a una compañía
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-6 py-3 bg-[#520f0f] text-white rounded-lg hover:bg-[#6b1414] transition-colors"
          >
            Unirse a Compañía
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                company.company_id === activeCompanyId
                  ? 'border-[#520f0f] bg-red-50'
                  : 'border-gray-300 hover:border-[#520f0f] hover:bg-gray-50'
              }`}
              onClick={() => handleSelectCompany(company.company_id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <Building2
                    size={32}
                    className={company.company_id === activeCompanyId ? 'text-[#520f0f]' : 'text-gray-600'}
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mt-2">{company.company_name}</h3>
                  {company.company_id === activeCompanyId && (
                    <span className="text-sm text-[#520f0f] font-medium mt-1 inline-block">
                      Compañía Activa
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Company Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#520f0f]">Unirse a Compañía</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Ingreso
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Ingresa el código"
                disabled={joiningCompany}
              />
              {joinError && <p className="text-red-600 text-sm mt-2">{joinError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError('');
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={joiningCompany}
              >
                Cancelar
              </button>
              <button
                onClick={handleJoinCompany}
                className="flex-1 px-4 py-2 bg-[#520f0f] text-white rounded-lg hover:bg-[#6b1414] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={joiningCompany}
              >
                {joiningCompany ? 'Uniéndose...' : 'Unirse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
