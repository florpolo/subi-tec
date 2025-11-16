import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import WorkOrdersList from './pages/WorkOrdersList';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderForm from './pages/WorkOrderForm';
import Buildings from './pages/Buildings';
import BuildingForm from './pages/BuildingForm';
import ElevatorDetail from './pages/ElevatorDetail';
import EquipmentDetail from './pages/EquipmentDetail';
import Technicians from './pages/Technicians';
import TechnicianForm from './pages/TechnicianForm';
import TechnicianDetail from './pages/TechnicianDetail';
import Engineers from './pages/Engineers';
import EngineerDetail from './pages/EngineerDetail';
import EngineerReports from './pages/EngineerReports';
import MyTasks from './pages/MyTasks';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TaskDetail from './pages/TaskDetail';


function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'office' | 'technician' | 'engineer' }) {
  const { user, loading, activeCompanyRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf6] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#d4caaf] border-t-[#fcca53]"></div>
          <p className="mt-4 text-[#694e35] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredRole && activeCompanyRole !== requiredRole) {
    const defaultRoute = activeCompanyRole === 'technician' ? '/my-tasks' : activeCompanyRole === 'engineer' ? '/engineer-reports' : '/orders';
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, activeCompanyRole } = useAuth();

  const defaultRoute = activeCompanyRole === 'technician' ? '/my-tasks' : activeCompanyRole === 'engineer' ? '/engineer-reports' : '/orders';

  return (
    <Routes>
      <Route path="/signin" element={user ? <Navigate to={defaultRoute} replace /> : <SignIn />} />
      <Route path="/signup" element={user ? <Navigate to={defaultRoute} replace /> : <SignUp />} />
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/dashboard" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/orders" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><WorkOrdersList /></Layout></ProtectedRoute>} />
      <Route path="/orders/new" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><WorkOrderForm /></Layout></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><WorkOrderDetail /></Layout></ProtectedRoute>} />
      <Route path="/orders/:id/edit" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><WorkOrderForm /></Layout></ProtectedRoute>} />
      <Route path="/buildings" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><Buildings /></Layout></ProtectedRoute>} />
      <Route path="/buildings/new" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><BuildingForm /></Layout></ProtectedRoute>} />
      <Route path="/buildings/:id/edit" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><BuildingForm /></Layout></ProtectedRoute>} />
      <Route path="/elevators/:id" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><ElevatorDetail /></Layout></ProtectedRoute>} />
      <Route path="/equipment/:id" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><EquipmentDetail /></Layout></ProtectedRoute>} />
      <Route path="/technicians" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><Technicians /></Layout></ProtectedRoute>} />
      <Route path="/technicians/new" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><TechnicianForm /></Layout></ProtectedRoute>} />
      <Route path="/technicians/:id" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><TechnicianDetail /></Layout></ProtectedRoute>} />
      <Route path="/engineers" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><Engineers /></Layout></ProtectedRoute>} />
      <Route path="/engineers/:id" element={<ProtectedRoute requiredRole="office"><Layout viewMode="office"><EngineerDetail /></Layout></ProtectedRoute>} />
      <Route path="/engineer-reports" element={<ProtectedRoute requiredRole="engineer"><Layout viewMode="engineer"><EngineerReports /></Layout></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute requiredRole="technician"><Layout viewMode="technician"><MyTasks /></Layout></ProtectedRoute>} />
      <Route path="/my-tasks/:id" element={<ProtectedRoute requiredRole="technician"><Layout viewMode="technician"><MyTasks /></Layout></ProtectedRoute>} />
      <Route path="/task/:id" element={<ProtectedRoute requiredRole="technician"><Layout viewMode="technician"><TaskDetail /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
