import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Key, UserCircle, AlertCircle } from 'lucide-react';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState<'office' | 'technician' | 'engineer'>('technician');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Technician-specific fields
  const [technicianName, setTechnicianName] = useState('');
  const [technicianRole, setTechnicianRole] = useState<'Reclamista' | 'Engrasador'>('Reclamista');
  const [technicianSpecialty, setTechnicianSpecialty] = useState('');
  const [technicianContact, setTechnicianContact] = useState('');

  // Engineer-specific fields
  const [engineerName, setEngineerName] = useState('');
  const [engineerContact, setEngineerContact] = useState('');

  const validateJoinCode = async (code: string): Promise<{ valid: boolean; companyId?: string; error?: string }> => {
    const { data, error } = await supabase
      .from('company_join_codes')
      .select('company_id, is_active, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      return { valid: false, error: 'Error validating join code' };
    }

    if (!data) {
      return { valid: false, error: 'Invalid join code' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'This join code is no longer active' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'This join code has expired' };
    }

    return { valid: true, companyId: data.company_id };
  };

  const createMembership = async (userId: string, companyId: string, userRole: 'office' | 'technician') => {
    const { error } = await supabase
      .from('company_members')
      .insert({
        user_id: userId,
        company_id: companyId,
        role: userRole,
      });

    if (error) throw error;
  };

  const createTechnicianProfile = async (userId: string, companyId: string) => {
    const { error } = await supabase
      .from('technicians')
      .insert({
        user_id: userId,
        company_id: companyId,
        name: technicianName,
        role: technicianRole,
        specialty: technicianSpecialty,
        contact: technicianContact,
      });

    if (error) throw error;
  };

  const createEngineerProfile = async (userId: string, companyId: string) => {
    const { error } = await supabase
      .from('engineers')
      .insert({
        user_id: userId,
        company_id: companyId,
        name: engineerName,
        contact: engineerContact,
      });

    if (error) throw error;
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate technician fields if role is technician
      if (role === 'technician') {
        if (!technicianName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        if (!technicianSpecialty.trim()) {
          throw new Error('Por favor ingresa tu especialidad');
        }
        if (!technicianContact.trim()) {
          throw new Error('Por favor ingresa tu información de contacto');
        }
      }

      // Validate engineer fields if role is engineer
      if (role === 'engineer') {
        if (!engineerName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        if (!engineerContact.trim()) {
          throw new Error('Por favor ingresa tu información de contacto');
        }
      }

      const codeValidation = await validateJoinCode(joinCode);
      if (!codeValidation.valid) {
        throw new Error(codeValidation.error);
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            join_code: joinCode,
            role: role,
            company_id: codeValidation.companyId,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error('Failed to create user');
      }

      // Create company membership for office and technician roles (engineers don't use company_members)
      if (role === 'office' || role === 'technician') {
        await createMembership(signUpData.user.id, codeValidation.companyId!, role);
      }

      // If technician role, create technician profile
      if (role === 'technician') {
        await createTechnicianProfile(signUpData.user.id, codeValidation.companyId!);
      }

      // If engineer role, create engineer profile
      if (role === 'engineer') {
        await createEngineerProfile(signUpData.user.id, codeValidation.companyId!);
      }

      // Sign out the user so they have to sign in manually
      // This ensures the company membership is loaded correctly on sign in
      await supabase.auth.signOut();

      alert('Usuario creado exitosamente! Por favor inicia sesión.');
      navigate('/signin');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-gray-300">
          <div className="flex flex-col items-center mb-8">
            <img src="/SUBITEC_02 (1).svg" alt="Subitec Logo" className="h-16 w-auto mb-4" />
          </div>

          <h2 className="text-2xl font-bold text-[#520f0f] mb-6 text-center">
            Registrarse
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#520f0f] mb-2">
                Código de Empresa *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase"
                  placeholder="ABC123XYZ"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Obtén este código de tu administrador
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#520f0f] mb-2">
                Tu Rol *
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'office' | 'technician' | 'engineer')}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="technician">Técnico</option>
                  <option value="engineer">Ingeniero</option>
                  <option value="office">Oficina</option>
                </select>
              </div>
            </div>

            {/* Technician-specific fields */}
            {role === 'technician' && (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <h3 className="text-sm font-bold text-[#520f0f] mb-3">Información del Técnico</h3>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="ej., Juan Pérez"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Tipo de Técnico *
                    </label>
                    <select
                      value={technicianRole}
                      onChange={(e) => setTechnicianRole(e.target.value as 'Reclamista' | 'Engrasador')}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="Reclamista">Reclamista</option>
                      <option value="Engrasador">Engrasador</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Especialidad *
                    </label>
                    <input
                      type="text"
                      value={technicianSpecialty}
                      onChange={(e) => setTechnicianSpecialty(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="ej., Mantenimiento de Ascensores"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Contacto (Teléfono/Móvil) *
                    </label>
                    <input
                      type="text"
                      value={technicianContact}
                      onChange={(e) => setTechnicianContact(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="ej., +54 11 1234-5678"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Engineer-specific fields */}
            {role === 'engineer' && (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <h3 className="text-sm font-bold text-[#520f0f] mb-3">Información del Ingeniero</h3>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={engineerName}
                      onChange={(e) => setEngineerName(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="ej., María González"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#520f0f] mb-2">
                      Contacto (Teléfono/Móvil) *
                    </label>
                    <input
                      type="text"
                      value={engineerContact}
                      onChange={(e) => setEngineerContact(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="ej., +54 11 1234-5678"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#520f0f] mb-2">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#520f0f] mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Mínimo 6 caracteres
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/signin"
                className="text-[#520f0f] font-bold hover:text-yellow-600 transition-colors"
              >
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
