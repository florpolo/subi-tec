import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataLayer } from '../lib/dataLayer';
import { Users } from 'lucide-react';

type Tab = 'datos' | 'rol' | 'especialidad' | 'contacto';

export default function TechnicianForm() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('datos');

  const [name, setName] = useState('');
  const [role, setRole] = useState<'Reclamista' | 'Engrasador'>('Reclamista');
  const [specialty, setSpecialty] = useState('');
  const [contact, setContact] = useState('');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'datos', label: 'Datos' },
    { id: 'rol', label: 'Rol' },
    { id: 'especialidad', label: 'Especialidad' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    await dataLayer.createTechnician({
      name: name.trim(),
      role,
      specialty: specialty.trim(),
      contact: contact.trim(),
    });

    alert('¡Técnico creado exitosamente!');
    navigate('/technicians');
  };

  const handleCancel = () => {
    navigate('/technicians');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users size={32} className="text-[#694e35]" />
        <div>
          <h2 className="text-3xl font-bold text-[#694e35]">Crear Técnico</h2>
          <p className="text-[#5e4c1e]">Completar la información del nuevo técnico</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#f4ead0] rounded-xl shadow-lg border-2 border-[#d4caaf] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b-2 border-[#d4caaf] bg-[#d4caaf]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-3 font-bold text-sm transition-colors focus:outline-none ${
                activeTab === tab.id
                  ? 'bg-[#f4ead0] text-[#694e35] border-b-4 border-[#fcca53]'
                  : 'text-[#694e35] hover:bg-[#bda386]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'datos' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#694e35] mb-4">Información Personal</h3>
              <div>
                <label className="block text-[#694e35] font-bold mb-2">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  required
                />
              </div>
            </div>
          )}

          {activeTab === 'rol' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#694e35] mb-4">Rol del Técnico</h3>
              <div>
                <label className="block text-[#694e35] font-bold mb-2">
                  Rol <span className="text-red-600">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'Reclamista' | 'Engrasador')}
                  className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                  required
                >
                  <option value="Reclamista">Reclamista</option>
                  <option value="Engrasador">Engrasador</option>
                </select>
                <p className="text-sm text-[#5e4c1e] mt-2">
                  {role === 'Reclamista'
                    ? 'Reclamista: Técnico especializado en atención de reclamos y reparaciones urgentes.'
                    : 'Engrasador: Técnico especializado en mantenimiento preventivo y lubricación.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'especialidad' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#694e35] mb-4">Especialidad</h3>
              <div>
                <label className="block text-[#694e35] font-bold mb-2">Especialidad</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Sistemas hidráulicos, Mantenimiento preventivo"
                  className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                />
                <p className="text-sm text-[#5e4c1e] mt-2">
                  Describe el área de especialización del técnico (ej: sistemas eléctricos, hidráulicos, etc.)
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contacto' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#694e35] mb-4">Información de Contacto</h3>
              <div>
                <label className="block text-[#694e35] font-bold mb-2">Contacto</label>
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Ej: 011-1234-5678"
                  className="w-full px-4 py-2 border-2 border-[#d4caaf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fcca53]"
                />
                <p className="text-sm text-[#5e4c1e] mt-2">
                  Número de teléfono o celular para comunicarse con el técnico
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end px-6 pb-6 pt-4 border-t-2 border-[#d4caaf]">
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
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
