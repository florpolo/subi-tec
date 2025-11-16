import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  FileText,
  Building2,
  Users,
  ClipboardList,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  viewMode?: 'office' | 'technician' | 'engineer';
}

export default function Layout({ children, viewMode = 'office' }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const location = useLocation();
  const { activeCompanyId, companyMemberships, setActiveCompany, signOut } = useAuth();

  const officeLinks = [
    { to: '/orders', icon: FileText, label: 'Órdenes' },
    { to: '/buildings', icon: Building2, label: 'Edificios' },
    { to: '/technicians', icon: Users, label: 'Técnicos' },
    { to: '/engineers', icon: Users, label: 'Ingenieros' },
  ];
  const technicianLinks = [{ to: '/my-tasks', icon: ClipboardList, label: 'Mis Tareas' }];
  const engineerLinks = [
    { to: '/engineer-dashboard', icon: Building2, label: 'Mis Compañías' },
    { to: '/engineer-reports', icon: FileText, label: 'Reportes' },
  ];
  const links = viewMode === 'office' ? officeLinks : viewMode === 'technician' ? technicianLinks : engineerLinks;

  const isActive = (path: string) => {
    if (path === '/orders' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const activeCompany = companyMemberships.find((m) => m.company_id === activeCompanyId);
  const companyName = activeCompany?.company?.name || 'No Company';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-[#fffbf6]">
      {/* TOP BAR (beige) */}
      <header className="bg-[#d4caaf] text-[#520f0f] sticky top-0 z-40 shadow-lg border-b-4 border-[#520f0f]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-[#e8dfc5] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#520f0f]/40"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to={viewMode === 'office' ? '/orders' : viewMode === 'technician' ? '/my-tasks' : '/engineer-dashboard'} className="flex items-center gap-3">
              {/* logo */}
              <img src="/SUBITEC-LOGO-02 (1).svg" alt="Subitec Logo" className="h-14 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-bold text-lg hidden sm:block">{companyName}</div>

            {companyMemberships.length > 1 && (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-[#c9be9f] hover:bg-[#e8dfc5] rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#520f0f]/30"
                >
                  <span className="max-w-[150px] truncate">{companyName}</span>
                  <ChevronDown size={16} />
                </button>
                {companyMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-gray-300 z-50">
                    <div className="py-2">
                      {companyMemberships.map((membership) => (
                        <button
                          key={membership.company_id}
                          onClick={() => {
                            setActiveCompany(membership.company_id);
                            setCompanyMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                            membership.company_id === activeCompanyId ? 'bg-yellow-100' : ''
                          }`}
                        >
                          <div className="font-medium text-[#520f0f]">{membership.company?.name}</div>
                          <div className="text-xs text-gray-600 capitalize">{membership.role}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-[#e8dfc5] rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#520f0f]/30"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR en beige #d4caaf */}
        <aside
          className={`fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] z-30
          w-64 bg-[#d4caaf] text-[#520f0f] border-r-2 border-[#c9be9f]
          shadow-xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          <nav className="p-4 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500
                    ${active ? 'bg-yellow-500 text-[#520f0f] shadow-md' : 'text-[#520f0f] hover:bg-[#e8dfc5]'}`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {viewMode === 'office' && (
            <div className="p-4 border-t border-[#c9be9f]">
              <Link
                to="/orders/new"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500 text-[#520f0f] rounded-lg font-bold hover:bg-yellow-400 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#520f0f]"
              >
                <FileText size={20} />
                Crear Orden
              </Link>
            </div>
          )}

          {/* Controles móviles (compañía + logout) */}
          <div className="p-4 border-t border-[#c9be9f] space-y-2">
            <div className="mb-3 sm:hidden">
              <p className="text-xs font-medium text-[#520f0f] mb-2">{companyName}</p>
            </div>
            {companyMemberships.length > 1 && (
              <div className="mb-3 sm:hidden">
                <p className="text-xs font-medium text-[#520f0f] mb-2">Empresa Activa</p>
                <select
                  value={activeCompanyId || ''}
                  onChange={(e) => setActiveCompany(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#c9be9f] rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm bg-white text-[#520f0f]"
                >
                  {companyMemberships.map((membership) => (
                    <option key={membership.company_id} value={membership.company_id}>
                      {membership.company?.name} ({membership.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 sm:hidden"
            >
              <LogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* CONTENIDO */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
