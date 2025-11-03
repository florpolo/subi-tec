import { useAuth } from '../contexts/AuthContext';
import { supabaseDataLayer } from '../lib/supabaseDataLayer';
import type {
  Building,
  Elevator,
  Technician,
  WorkOrder,
  ElevatorHistory,
} from '../lib/supabaseDataLayer';

export function useDataLayer() {
  const { activeCompanyId } = useAuth();

  if (!activeCompanyId) {
    throw new Error('No active company selected');
  }

  return {
    listBuildings: () => supabaseDataLayer.listBuildings(activeCompanyId),

    getBuilding: (id: string) => supabaseDataLayer.getBuilding(id, activeCompanyId),

    createBuilding: (building: Omit<Building, 'id' | 'company_id' | 'created_at'>) =>
      supabaseDataLayer.createBuilding(building as Omit<Building, 'id' | 'created_at'>, activeCompanyId),

    updateBuilding: (id: string, updates: Partial<Building>) =>
      supabaseDataLayer.updateBuilding(id, updates, activeCompanyId),

    listElevators: (buildingId?: string) =>
      supabaseDataLayer.listElevators(activeCompanyId, buildingId),

    getElevator: (id: string) => supabaseDataLayer.getElevator(id, activeCompanyId),

    createElevator: (elevator: Omit<Elevator, 'id' | 'company_id' | 'created_at'>) =>
      supabaseDataLayer.createElevator(elevator as Omit<Elevator, 'id' | 'created_at'>, activeCompanyId),

    updateElevator: (id: string, updates: Partial<Elevator>) =>
      supabaseDataLayer.updateElevator(id, updates, activeCompanyId),

    listTechnicians: () => supabaseDataLayer.listTechnicians(activeCompanyId),

    getTechnician: (id: string) => supabaseDataLayer.getTechnician(id, activeCompanyId),

    createTechnician: (technician: Omit<Technician, 'id' | 'company_id' | 'created_at'>) =>
      supabaseDataLayer.createTechnician(technician as Omit<Technician, 'id' | 'created_at'>, activeCompanyId),

    updateTechnician: (id: string, updates: Partial<Technician>) =>
      supabaseDataLayer.updateTechnician(id, updates, activeCompanyId),

    getTechnicianStatus: (technicianId: string) =>
      supabaseDataLayer.getTechnicianStatus(technicianId, activeCompanyId),

    listWorkOrders: (filters?: {
      status?: string;
      priority?: string;
      technician_id?: string;
      building_id?: string;
    }) => supabaseDataLayer.listWorkOrders(activeCompanyId, filters),

    getWorkOrder: (id: string) => supabaseDataLayer.getWorkOrder(id, activeCompanyId),

    createWorkOrder: (order: Omit<WorkOrder, 'id' | 'company_id' | 'created_at'>) =>
      supabaseDataLayer.createWorkOrder(order as Omit<WorkOrder, 'id' | 'created_at'>, activeCompanyId),

    updateWorkOrder: (id: string, updates: Partial<WorkOrder>) =>
      supabaseDataLayer.updateWorkOrder(id, updates, activeCompanyId),

    addElevatorHistory: (history: Omit<ElevatorHistory, 'id' | 'company_id' | 'created_at'>) =>
      supabaseDataLayer.addElevatorHistory(history as Omit<ElevatorHistory, 'id' | 'created_at'>, activeCompanyId),

    getElevatorHistory: (elevatorId: string) =>
      supabaseDataLayer.getElevatorHistory(elevatorId, activeCompanyId),

    uploadPhoto: (file: File, workOrderId: string) =>
      supabaseDataLayer.uploadPhoto(file, activeCompanyId, workOrderId),

    uploadSignature: (dataUrl: string, workOrderId: string) =>
      supabaseDataLayer.uploadSignature(dataUrl, activeCompanyId, workOrderId),
  };
}

export type { Building, Elevator, Technician, WorkOrder, ElevatorHistory };
