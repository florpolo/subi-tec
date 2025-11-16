
import { supabaseDataLayer } from './supabaseDataLayer';
import type {
  Building as SupabaseBuilding,
  Elevator as SupabaseElevator,
  Technician as SupabaseTechnician,
  WorkOrder as SupabaseWorkOrder,
  ElevatorHistory as SupabaseElevatorHistory,
  Equipment as SupabaseEquipment,
  EquipmentType as SupabaseEquipmentType,
  Engineer as SupabaseEngineer,
  EngineerReport as SupabaseEngineerReport,
  EngineerCompanyMembership as SupabaseEngineerCompanyMembership,
} from './supabaseDataLayer';

export interface Building {
  id: string;
  address: string;
  neighborhood: string;
  contactPhone: string;
  entryHours: string;
  clientName: string;
  relationshipStartDate: string;
}

export interface Elevator {
  id: string;
  buildingId: string;
  number: number;
  locationDescription: string;
  hasTwoDoors: boolean;
  status: 'fit' | 'fit-needs-improvements' | 'not-fit';
  stops: number;
  capacity: number;
  machineRoomLocation: string;
  controlType: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  contact: string;
  role: 'Reclamista' | 'Engrasador';
}

export interface WorkOrder {
  id: string;
  claimType: 'Reclamo' | 'Inspección' | 'Reparación presupuestada' | 'Reparación correctiva';
  correctiveType?: 'Minor Repair' | 'Refurbishment' | 'Installation';
  buildingId: string;
  elevatorId?: string;
  equipmentId?: string;
  technicianId?: string;
  contactName: string;
  contactPhone: string;
  dateTime?: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
  startTime?: string;
  finishTime?: string;
  comments?: string;
  partsUsed?: Array<{ name: string; quantity: number }>;
  photoUrls?: string[];
  signatureDataUrl?: string;
}

export interface ElevatorHistory {
  id: string;
  elevatorId: string;
  workOrderId: string;
  date: string;
  description: string;
  technicianName: string;
}

/** ===== Equipos (facade camelCase para la app) ===== */
export type EquipmentType =
  | 'elevator'          // Ascensor
  | 'water_pump'        // Bomba de agua
  | 'freight_elevator'  // Montacarga
  | 'car_lift'          // Montacoche
  | 'dumbwaiter'        // Montaplatos
  | 'camillero'         // Camillero
  | 'other';            // Otro

export interface Equipment {
  id: string;
  buildingId: string;
  type: EquipmentType;
  name: string;
  locationDescription: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  capacity?: number | null;
  status: 'fit' | 'out_of_service';
  createdAt?: string;
}

export interface Engineer {
  id: string;
  name: string;
  contact?: string | null;
  userId: string;
  createdAt?: string;
}

export interface EngineerCompanyMembership {
  id: string;
  engineerId: string;
  companyId: string;
  companyName: string;
  createdAt: string;
}

export interface EngineerReport {
  id: string;
  companyId: string;
  engineerId: string;
  address: string;
  comments?: string | null;
  isRead: boolean;
  createdAt: string;
}

/* ===== Mappers ===== */
function mapBuilding(b: SupabaseBuilding): Building {
  return {
    id: b.id,
    address: b.address,
    neighborhood: b.neighborhood,
    contactPhone: b.contact_phone,
    entryHours: b.entry_hours,
    clientName: b.client_name,
    relationshipStartDate: b.relationship_start_date,
  };
}

function mapElevator(e: SupabaseElevator): Elevator {
  return {
    id: e.id,
    buildingId: e.building_id,
    number: e.number,
    locationDescription: e.location_description,
    hasTwoDoors: e.has_two_doors,
    status: e.status,
    stops: e.stops,
    capacity: e.capacity,
    machineRoomLocation: e.machine_room_location,
    controlType: e.control_type,
  };
}

function mapTechnician(t: SupabaseTechnician): Technician {
  return {
    id: t.id,
    name: t.name,
    specialty: t.specialty,
    contact: t.contact,
    role: t.role,
  };
}

function mapWorkOrder(w: SupabaseWorkOrder): WorkOrder {
  return {
    id: w.id,
    claimType: w.claim_type as 'Reclamo' | 'Inspección' | 'Reparación presupuestada' | 'Reparación correctiva',
    correctiveType: w.corrective_type as 'Minor Repair' | 'Refurbishment' | 'Installation' | undefined,
    buildingId: w.building_id,
    elevatorId: w.elevator_id ?? undefined,
    equipmentId: (w as any).equipment_id ?? undefined,
    technicianId: w.technician_id ?? undefined,
    contactName: w.contact_name,
    contactPhone: w.contact_phone,
    dateTime: w.date_time ?? undefined,
    description: w.description,
    status: w.status,
    priority: w.priority,
    createdAt: w.created_at,
    startTime: w.start_time ?? undefined,
    finishTime: w.finish_time ?? undefined,
    comments: w.comments ?? undefined,
    partsUsed: w.parts_used ?? undefined,
    photoUrls: w.photo_urls ?? undefined,
    signatureDataUrl: w.signature_data_url ?? undefined,
  };
}

function mapElevatorHistory(h: SupabaseElevatorHistory): ElevatorHistory {
  return {
    id: h.id,
    elevatorId: h.elevator_id,
    workOrderId: h.work_order_id,
    date: h.date,
    description: h.description,
    technicianName: h.technician_name,
  };
}

function mapEquipment(e: SupabaseEquipment): Equipment {
  return {
    id: e.id,
    buildingId: e.building_id,
    type: e.type as EquipmentType,
    name: e.name,
    locationDescription: e.location_description,
    brand: e.brand,
    model: e.model,
    serialNumber: e.serial_number,
    capacity: e.capacity,
    status: e.status,
    createdAt: e.created_at,
  };
}

function mapEngineer(e: SupabaseEngineer): Engineer {
  return {
    id: e.id,
    name: e.name,
    contact: e.contact,
    userId: e.user_id,
    createdAt: e.created_at,
  };
}

function mapEngineerReport(r: SupabaseEngineerReport): EngineerReport {
  return {
    id: r.id,
    companyId: r.company_id,
    engineerId: r.engineer_id,
    address: r.address,
    comments: r.comments,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

/* ===== Facade ===== */
export function createDataLayer(companyId: string) {
  return {
    /* ===== Buildings ===== */
    listBuildings: async (): Promise<Building[]> => {
      const buildings = await supabaseDataLayer.listBuildings(companyId);
      return buildings.map(mapBuilding);
    },

    getBuilding: async (id: string): Promise<Building | null> => {
      const building = await supabaseDataLayer.getBuilding(id, companyId);
      return building ? mapBuilding(building) : null;
    },

    createBuilding: async (building: Omit<Building, 'id'>): Promise<Building | null> => {
      const result = await supabaseDataLayer.createBuilding(
        {
          company_id: companyId,
          address: building.address,
          neighborhood: building.neighborhood,
          contact_phone: building.contactPhone,
          entry_hours: building.entryHours,
          client_name: building.clientName,
          relationship_start_date: building.relationshipStartDate,
        } as any,
        companyId
      );
      return result ? mapBuilding(result) : null;
    },

    updateBuilding: async (id: string, updates: Partial<Building>): Promise<Building | null> => {
      const mappedUpdates: any = {};
      if (updates.address !== undefined) mappedUpdates.address = updates.address;
      if (updates.neighborhood !== undefined) mappedUpdates.neighborhood = updates.neighborhood;
      if (updates.contactPhone !== undefined) mappedUpdates.contact_phone = updates.contactPhone;
      if (updates.entryHours !== undefined) mappedUpdates.entry_hours = updates.entryHours;
      if (updates.clientName !== undefined) mappedUpdates.client_name = updates.clientName;
      if (updates.relationshipStartDate !== undefined) mappedUpdates.relationship_start_date = updates.relationshipStartDate;

      const result = await supabaseDataLayer.updateBuilding(id, mappedUpdates, companyId);
      return result ? mapBuilding(result) : null;
    },

    /* ===== Elevators ===== */
    listElevators: async (buildingId?: string): Promise<Elevator[]> => {
      const elevators = await supabaseDataLayer.listElevators(companyId, buildingId);
      return elevators.map(mapElevator);
    },

    getElevator: async (id: string): Promise<Elevator | null> => {
      const elevator = await supabaseDataLayer.getElevator(id, companyId);
      return elevator ? mapElevator(elevator) : null;
    },

    createElevator: async (elevator: Omit<Elevator, 'id'>): Promise<Elevator | null> => {
      const result = await supabaseDataLayer.createElevator(
        {
          company_id: companyId,
          building_id: elevator.buildingId,
          number: elevator.number,
          location_description: elevator.locationDescription,
          has_two_doors: elevator.hasTwoDoors,
          status: elevator.status,
          stops: elevator.stops,
          capacity: elevator.capacity,
          machine_room_location: elevator.machineRoomLocation,
          control_type: elevator.controlType,
        } as any,
        companyId
      );
      return result ? mapElevator(result) : null;
    },

    updateElevator: async (id: string, updates: Partial<Elevator>): Promise<Elevator | null> => {
      const mappedUpdates: any = {};
      if (updates.buildingId !== undefined) mappedUpdates.building_id = updates.buildingId;
      if (updates.number !== undefined) mappedUpdates.number = updates.number;
      if (updates.locationDescription !== undefined) mappedUpdates.location_description = updates.locationDescription;
      if (updates.hasTwoDoors !== undefined) mappedUpdates.has_two_doors = updates.hasTwoDoors;
      if (updates.status !== undefined) mappedUpdates.status = updates.status;
      if (updates.stops !== undefined) mappedUpdates.stops = updates.stops;
      if (updates.capacity !== undefined) mappedUpdates.capacity = updates.capacity;
      if (updates.machineRoomLocation !== undefined) mappedUpdates.machine_room_location = updates.machineRoomLocation;
      if (updates.controlType !== undefined) mappedUpdates.control_type = updates.controlType;

      const result = await supabaseDataLayer.updateElevator(id, mappedUpdates, companyId);
      return result ? mapElevator(result) : null;
    },

    /* ===== Technicians ===== */
    listTechnicians: async (): Promise<Technician[]> => {
      const technicians = await supabaseDataLayer.listTechnicians(companyId);
      return technicians.map(mapTechnician);
    },

    getTechnician: async (id: string): Promise<Technician | null> => {
      const technician = await supabaseDataLayer.getTechnician(id, companyId);
      return technician ? mapTechnician(technician) : null;
    },

    createTechnician: async (technician: Omit<Technician, 'id'>): Promise<Technician | null> => {
      const result = await supabaseDataLayer.createTechnician(
        {
          company_id: companyId,
          name: technician.name,
          specialty: technician.specialty,
          contact: technician.contact,
          role: technician.role,
        } as any,
        companyId
      );
      return result ? mapTechnician(result) : null;
    },

    updateTechnician: async (id: string, updates: Partial<Technician>): Promise<Technician | null> => {
      const result = await supabaseDataLayer.updateTechnician(id, updates as any, companyId);
      return result ? mapTechnician(result) : null;
    },

    getTechnicianStatus: async (technicianId: string): Promise<'free' | 'in-progress' | 'busy'> => {
      // Nota: supabaseDataLayer devuelve 'free' | 'busy'. Mantenemos la firma previa.
      const status = await supabaseDataLayer.getTechnicianStatus(technicianId, companyId);
      return status; // 'free' | 'busy'
    },

    /* ===== Work Orders ===== */
    listWorkOrders: async (filters?: {
      status?: string;
      priority?: string;
      technicianId?: string;
      buildingId?: string;
      elevatorId?: string;
      equipmentId?: string;
    }): Promise<WorkOrder[]> => {
      const mappedFilters = filters ? {
        status: filters.status,
        priority: filters.priority,
        technician_id: filters.technicianId,
        building_id: filters.buildingId,
        elevator_id: filters.elevatorId,
        equipment_id: filters.equipmentId,
      } : undefined;

      const orders = await supabaseDataLayer.listWorkOrders(companyId, mappedFilters as any);
      return orders.map(mapWorkOrder);
    },

    getWorkOrder: async (id: string): Promise<WorkOrder | null> => {
      const order = await supabaseDataLayer.getWorkOrder(id, companyId);
      return order ? mapWorkOrder(order) : null;
    },

    createWorkOrder: async (order: Omit<WorkOrder, 'id' | 'createdAt'>): Promise<WorkOrder | null> => {
      const mappedOrder = {
        company_id: companyId,
        claim_type: (() => {
          switch (order.claimType) {
            case 'Reclamo': return 'Corrective';
            case 'Inspección': return 'Semiannual Tests';
            case 'Reparación presupuestada': return 'Corrective';
            case 'Reparación correctiva': return 'Corrective';
            default: return 'Corrective';
          }
        })(),
        corrective_type: order.correctiveType,
        building_id: order.buildingId,
        elevator_id: order.elevatorId,
        equipment_id: order.equipmentId,
        technician_id: order.technicianId,
        contact_name: order.contactName,
        contact_phone: order.contactPhone,
        date_time: order.dateTime,
        description: order.description,
        status: order.status,
        priority: order.priority,
        start_time: order.startTime,
        finish_time: order.finishTime,
        comments: order.comments,
        parts_used: order.partsUsed,
        photo_urls: order.photoUrls,
        signature_data_url: order.signatureDataUrl,
      };

      const result = await supabaseDataLayer.createWorkOrder(mappedOrder as any, companyId);
      return result ? mapWorkOrder(result) : null;
    },

    updateWorkOrder: async (id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | null> => {
      const mappedUpdates: any = {};
      if (updates.claimType !== undefined) {
        switch (updates.claimType) {
          case 'Reclamo': mappedUpdates.claim_type = 'Corrective'; break;
          case 'Inspección': mappedUpdates.claim_type = 'Semiannual Tests'; break;
          case 'Reparación presupuestada': mappedUpdates.claim_type = 'Corrective'; break;
          case 'Reparación correctiva': mappedUpdates.claim_type = 'Corrective'; break;
          default: mappedUpdates.claim_type = 'Corrective'; break;
        }
      }
      if (updates.correctiveType !== undefined) mappedUpdates.corrective_type = updates.correctiveType;
      if (updates.buildingId !== undefined) mappedUpdates.building_id = updates.buildingId;
      if (updates.elevatorId !== undefined) mappedUpdates.elevator_id = updates.elevatorId ?? null;
      if (updates.equipmentId !== undefined) mappedUpdates.equipment_id = updates.equipmentId ?? null;
      if (updates.technicianId !== undefined) mappedUpdates.technician_id = updates.technicianId;
      if (updates.contactName !== undefined) mappedUpdates.contact_name = updates.contactName;
      if (updates.contactPhone !== undefined) mappedUpdates.contact_phone = updates.contactPhone;
      if (updates.dateTime !== undefined) mappedUpdates.date_time = updates.dateTime;
      if (updates.description !== undefined) mappedUpdates.description = updates.description;
      if (updates.status !== undefined) mappedUpdates.status = updates.status;
      if (updates.priority !== undefined) mappedUpdates.priority = updates.priority;
      if (updates.startTime !== undefined) mappedUpdates.start_time = updates.startTime;
      if (updates.finishTime !== undefined) mappedUpdates.finish_time = updates.finishTime;
      if (updates.comments !== undefined) mappedUpdates.comments = updates.comments;
      if (updates.partsUsed !== undefined) mappedUpdates.parts_used = updates.partsUsed;
      if (updates.photoUrls !== undefined) mappedUpdates.photo_urls = updates.photoUrls;
      if (updates.signatureDataUrl !== undefined) mappedUpdates.signature_data_url = updates.signatureDataUrl;

      const result = await supabaseDataLayer.updateWorkOrder(id, mappedUpdates, companyId);
      return result ? mapWorkOrder(result) : null;
    },

    addElevatorHistory: async (history: Omit<ElevatorHistory, 'id'>): Promise<ElevatorHistory | null> => {
      const result = await supabaseDataLayer.addElevatorHistory(
        {
          elevator_id: history.elevatorId,
          work_order_id: history.workOrderId,
          date: history.date,
          description: history.description,
          technician_name: history.technicianName,
        } as any,
        companyId
      );
      return result ? mapElevatorHistory(result) : null;
    },

    getElevatorHistory: async (elevatorId: string): Promise<ElevatorHistory[]> => {
      const history = await supabaseDataLayer.getElevatorHistory(elevatorId, companyId);
      return history.map(mapElevatorHistory);
    },

    uploadPhoto: async (file: File, workOrderId: string): Promise<string | null> => {
      return await supabaseDataLayer.uploadPhoto(file, companyId, workOrderId);
    },

    uploadSignature: async (dataUrl: string, workOrderId: string): Promise<string | null> => {
      return await supabaseDataLayer.uploadSignature(dataUrl, companyId, workOrderId);
    },
// Remitos (plantillas y numerador)
getDefaultRemitoTemplate: () => supabaseDataLayer.getDefaultRemitoTemplate(companyId),
listRemitoTemplates: () => supabaseDataLayer.listRemitoTemplates(companyId),
getNextRemitoNo: () => supabaseDataLayer.getNextRemitoNo(companyId),

    /* ===== Equipos ===== */
    listEquipments: async (buildingId?: string): Promise<Equipment[]> => {
      const rows = await supabaseDataLayer.listEquipments(companyId, buildingId);
      return rows.map(mapEquipment);
    },

    getEquipment: async (id: string): Promise<Equipment | null> => {
      const row = await supabaseDataLayer.getEquipment(id, companyId);
      return row ? mapEquipment(row) : null;
    },

    createEquipment: async (e: Omit<Equipment, 'id' | 'createdAt'>): Promise<Equipment | null> => {
      const result = await supabaseDataLayer.createEquipment(
        {
          company_id: companyId,
          building_id: e.buildingId,
          type: e.type as SupabaseEquipmentType,
          name: e.name,
          location_description: e.locationDescription,
          brand: e.brand ?? null,
          model: e.model ?? null,
          serial_number: e.serialNumber ?? null,
          capacity: e.capacity ?? null,
          status: e.status ?? 'fit',
        } as any,
        companyId
      );
      return result ? mapEquipment(result) : null;
    },

    updateEquipment: async (id: string, updates: Partial<Equipment>): Promise<Equipment | null> => {
      const mapped: Partial<SupabaseEquipment> = {};
      if (updates.buildingId !== undefined) (mapped as any).building_id = updates.buildingId;
      if (updates.type !== undefined) (mapped as any).type = updates.type as any;
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.locationDescription !== undefined) (mapped as any).location_description = updates.locationDescription;
      if (updates.brand !== undefined) mapped.brand = updates.brand ?? null;
      if (updates.model !== undefined) mapped.model = updates.model ?? null;
      if (updates.serialNumber !== undefined) (mapped as any).serial_number = updates.serialNumber ?? null;
      if (updates.capacity !== undefined) mapped.capacity = updates.capacity ?? null;
      if (updates.status !== undefined) mapped.status = updates.status;

      const res = await supabaseDataLayer.updateEquipment(id, mapped as any, companyId);
      return res ? mapEquipment(res) : null;
    },

    deleteEquipment: async (id: string): Promise<void> => {
      await supabaseDataLayer.deleteEquipment(id, companyId);
    },

    /* ===== Engineers ===== */
    listEngineers: async (): Promise<Engineer[]> => {
      const engineers = await supabaseDataLayer.listEngineers(companyId);
      return engineers.map(mapEngineer);
    },

    getEngineer: async (id: string): Promise<Engineer | null> => {
      const engineer = await supabaseDataLayer.getEngineer(id);
      return engineer ? mapEngineer(engineer) : null;
    },

    getEngineerByUserId: async (userId: string): Promise<Engineer | null> => {
      const engineer = await supabaseDataLayer.getEngineerByUserId(userId);
      return engineer ? mapEngineer(engineer) : null;
    },

    createEngineer: async (engineer: Omit<Engineer, 'id' | 'createdAt'>): Promise<Engineer | null> => {
      const result = await supabaseDataLayer.createEngineer({
        name: engineer.name,
        contact: engineer.contact ?? null,
        user_id: engineer.userId,
      } as any);
      return result ? mapEngineer(result) : null;
    },

    updateEngineer: async (id: string, updates: Partial<Engineer>): Promise<Engineer | null> => {
      const mapped: any = {};
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.contact !== undefined) mapped.contact = updates.contact;
      const result = await supabaseDataLayer.updateEngineer(id, mapped);
      return result ? mapEngineer(result) : null;
    },

    /* ===== Engineer Company Memberships ===== */
    listEngineerMemberships: async (engineerId: string): Promise<EngineerCompanyMembership[]> => {
      const memberships = await supabaseDataLayer.getEngineerCompanies(engineerId);
      return memberships.map(m => ({
        id: m.id,
        engineerId: engineerId,
        companyId: m.company_id,
        companyName: m.company_name,
        createdAt: '',
      }));
    },

    joinCompanyWithCode: async (engineerId: string, joinCode: string): Promise<EngineerCompanyMembership | null> => {
      const result = await supabaseDataLayer.createEngineerMembership(engineerId, joinCode);
      if (!result) return null;
      return {
        id: result.id,
        engineerId: result.engineer_id,
        companyId: result.company_id,
        companyName: '',
        createdAt: result.created_at,
      };
    },

    removeEngineerMembership: async (membershipId: string): Promise<void> => {
      await supabaseDataLayer.removeEngineerMembership(membershipId);
    },

    /* ===== Engineer Reports ===== */
    listEngineerReports: async (engineerId?: string): Promise<EngineerReport[]> => {
      const reports = await supabaseDataLayer.listEngineerReports(companyId, engineerId);
      return reports.map(mapEngineerReport);
    },

    getEngineerReport: async (id: string): Promise<EngineerReport | null> => {
      const report = await supabaseDataLayer.getEngineerReport(id, companyId);
      return report ? mapEngineerReport(report) : null;
    },

    createEngineerReport: async (report: Omit<EngineerReport, 'id' | 'createdAt'>): Promise<EngineerReport | null> => {
      const result = await supabaseDataLayer.createEngineerReport(
        {
          company_id: report.companyId,
          engineer_id: report.engineerId,
          address: report.address,
          comments: report.comments ?? null,
          is_read: report.isRead ?? false,
        } as any,
        report.companyId
      );
      return result ? mapEngineerReport(result) : null;
    },

    updateEngineerReport: async (id: string, updates: Partial<EngineerReport>): Promise<EngineerReport | null> => {
      const mapped: any = {};
      if (updates.engineerId !== undefined) mapped.engineer_id = updates.engineerId;
      if (updates.address !== undefined) mapped.address = updates.address;
      if (updates.comments !== undefined) mapped.comments = updates.comments;
      if (updates.isRead !== undefined) mapped.is_read = updates.isRead;

      const result = await supabaseDataLayer.updateEngineerReport(id, mapped, companyId);
      return result ? mapEngineerReport(result) : null;
    },

    countUnreadReportsByEngineer: async (): Promise<Record<string, number>> => {
      return await supabaseDataLayer.countUnreadReportsByEngineer(companyId);
    },
  };
}

// Export a synchronous wrapper that throws if no company is selected
export let currentCompanyId: string | null = null;

export function setCurrentCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export const dataLayer = new Proxy({} as ReturnType<typeof createDataLayer>, {
  get(target, prop) {
    if (!currentCompanyId) {
      throw new Error('No company ID set. Cannot access dataLayer.');
    }
    const layer = createDataLayer(currentCompanyId);
    return layer[prop as keyof typeof layer];
  },
});