// src/lib/supabaseDataLayer.ts
import { supabase } from './supabase';

/** ===== Tipos crudos (tal como están en Supabase) ===== */
export interface Building {
  id: string;
  company_id: string;
  address: string;
  neighborhood: string;
  contact_phone: string;
  entry_hours: string;
  client_name: string;
  relationship_start_date: string;
  created_at?: string;
}

export interface Elevator {
  id: string;
  company_id: string;
  building_id: string;
  number: number;
  location_description: string;
  has_two_doors: boolean;
  status: 'fit' | 'fit-needs-improvements' | 'not-fit';
  stops: number;
  capacity: number;
  machine_room_location: string;
  control_type: string;
  created_at?: string;
}

export interface Technician {
  id: string;
  company_id: string;
  user_id?: string;
  name: string;
  specialty: string;
  contact: string;
  role: 'Reclamista' | 'Engrasador';
  created_at?: string;
}

export interface WorkOrder {
  id: string;
  company_id: string;
  claim_type: 'Semiannual Tests' | 'Monthly Maintenance' | 'Corrective';
  corrective_type?: 'Minor Repair' | 'Refurbishment' | 'Installation';
  building_id: string;
  elevator_id?: string | null;
  equipment_id?: string | null;
  technician_id?: string | null;
  contact_name: string;
  contact_phone: string;
  date_time?: string | null;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
  start_time?: string | null;
  finish_time?: string | null;
  comments?: string | null;
  parts_used?: Array<{ name: string; quantity: number }> | null;
  photo_urls?: string[] | null;
  signature_data_url?: string | null;
}

export interface ElevatorHistory {
  id: string;
  company_id: string;
  elevator_id: string;
  work_order_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  technician_name: string;
  created_at?: string;
}

/** ===== Equipos ===== */
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
  company_id: string;
  building_id: string;
  type: EquipmentType;
  name: string;                 // p.ej. "Bomba 1", "Montacarga B"
  location_description: string; // ubicación / descripción
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: number | null;      // libre (kg/HP/lts)
  status: 'fit' | 'out_of_service';
  created_at?: string;
}

export interface Engineer {
  id: string;
  user_id: string;
  name: string;
  contact: string | null;
  created_at?: string;
}

export interface EngineerCompanyMembership {
  id: string;
  engineer_id: string;
  company_id: string;
  created_at: string;
}

export interface EngineerReport {
  id: string;
  company_id: string;
  engineer_id: string;
  address: string;
  comments: string | null;
  is_read: boolean;
  created_at: string;
}

/** ====== Utilidades ====== */
const toNull = (v: any) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '' || s === 'undefined' || s === 'null') return null;
  }
  return v;
};

function dataUrlToBlob(dataUrl: string): Blob {
  // "data:image/png;base64,AAAA..."
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*);base64/)?.[1] || 'image/png';
  const bin = atob(b64 || '');
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/* ===== Data Layer (CRUD) ===== */
export const supabaseDataLayer = {
  /* ========== Buildings ========== */
  async listBuildings(companyId: string): Promise<Building[]> {
    const { data, error } = await supabase
      .from<Building>('buildings')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Building[];
  },

  async getBuilding(id: string, companyId: string): Promise<Building | null> {
    const { data, error } = await supabase
      .from<Building>('buildings')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createBuilding(building: Omit<Building, 'id' | 'created_at'>, companyId: string): Promise<Building | null> {
    const payload = { ...building, company_id: companyId };
    const { data, error } = await supabase.from<Building>('buildings').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateBuilding(id: string, updates: Partial<Building>, companyId: string): Promise<Building | null> {
    const { data, error } = await supabase
      .from<Building>('buildings')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  /* ========== Elevators ========== */
  async listElevators(companyId: string, buildingId?: string): Promise<Elevator[]> {
    let q = supabase.from<Elevator>('elevators').select('*').eq('company_id', companyId);
    if (buildingId) q = q.eq('building_id', buildingId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Elevator[];
  },

  async getElevator(id: string, companyId: string): Promise<Elevator | null> {
    const { data, error } = await supabase
      .from<Elevator>('elevators')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createElevator(elevator: Omit<Elevator, 'id' | 'created_at'>, companyId: string): Promise<Elevator | null> {
    const payload = { ...elevator, company_id: companyId };
    const { data, error } = await supabase.from<Elevator>('elevators').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateElevator(id: string, updates: Partial<Elevator>, companyId: string): Promise<Elevator | null> {
    const { data, error } = await supabase
      .from<Elevator>('elevators')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async deleteElevator(id: string, companyId: string): Promise<void> {
    const { error } = await supabase.from<Elevator>('elevators').delete().eq('company_id', companyId).eq('id', id);
    if (error) throw error;
  },

  /* ========== Technicians ========== */
  async listTechnicians(companyId: string): Promise<Technician[]> {
    const { data, error } = await supabase
      .from<Technician>('technicians')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Technician[];
  },

  async getTechnician(id: string, companyId: string): Promise<Technician | null> {
    const { data, error } = await supabase
      .from<Technician>('technicians')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createTechnician(technician: Omit<Technician, 'id' | 'created_at'>, companyId: string): Promise<Technician | null> {
    const payload = { ...technician, company_id: companyId };
    const { data, error } = await supabase.from<Technician>('technicians').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateTechnician(id: string, updates: Partial<Technician>, companyId: string): Promise<Technician | null> {
    const { data, error } = await supabase
      .from<Technician>('technicians')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  // Estado simple: 'free' | 'busy' (conservando tu lógica)
  async getTechnicianStatus(technicianId: string, companyId: string): Promise<'free' | 'busy'> {
    // Implementación de ejemplo: si tiene órdenes "In Progress" => 'busy'
    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .select('id')
      .eq('company_id', companyId)
      .eq('technician_id', technicianId)
      .eq('status', 'In Progress')
      .limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? 'busy' : 'free';
  },

  /* ========== Work Orders ========== */
  async listWorkOrders(
    companyId: string,
    filters?: {
      status?: string;
      priority?: string;
      technician_id?: string;
      building_id?: string;
      elevator_id?: string;
      equipment_id?: string;
    }
  ): Promise<WorkOrder[]> {
    let q = supabase.from<WorkOrder>('work_orders').select('*').eq('company_id', companyId);

    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.priority) q = q.eq('priority', filters.priority);
    if (filters?.technician_id !== undefined) q = q.eq('technician_id', filters.technician_id);
    if (filters?.building_id) q = q.eq('building_id', filters.building_id);
    if (filters?.elevator_id) q = q.eq('elevator_id', filters.elevator_id);
    if (filters?.equipment_id) q = q.eq('equipment_id', filters.equipment_id);

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as WorkOrder[];
  },

  async getWorkOrder(id: string, companyId: string): Promise<WorkOrder | null> {
    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  // >>>>>>> ÚNICO CAMBIO IMPORTANTE: sin spread, mapeo explícito + saneo de UUIDs/opcionales
async createWorkOrder(
  order: Omit<WorkOrder, 'id' | 'created_at'>,
  companyId: string
): Promise<WorkOrder | null> {
  // helper: permite leer snake o camel sin romper lo ya existente
  const get = (a: any, snake: string, camel: string) =>
    (a as any)[snake] ?? (a as any)[camel];

  // Armado explícito del payload (sin spread para no colar "undefined")
  const payload: any = {
    company_id: companyId,

    claim_type:         get(order, 'claim_type', 'claimType'),
    corrective_type:    toNull(get(order, 'corrective_type', 'correctiveType')),

    // OJO: acá sí camel correcto
    building_id:        get(order, 'building_id', 'buildingId'),

    // Saneamos SIEMPRE los UUID opcionales
    elevator_id:        toNull(get(order, 'elevator_id', 'elevatorId')),
    equipment_id:       toNull(get(order, 'equipment_id', 'equipmentId')),
    technician_id:      toNull(get(order, 'technician_id', 'technicianId')),

    contact_name:       get(order, 'contact_name', 'contactName') ?? '',
    contact_phone:      get(order, 'contact_phone', 'contactPhone') ?? '',

    date_time:          toNull(get(order, 'date_time', 'dateTime')),
    description:        get(order, 'description', 'description') ?? '',
    status:             get(order, 'status', 'status') ?? 'Pending',
    priority:           get(order, 'priority', 'priority') ?? 'Low',

    start_time:         toNull(get(order, 'start_time', 'startTime')),
    finish_time:        toNull(get(order, 'finish_time', 'finishTime')),

    comments:           get(order, 'comments', 'comments') ?? null,
    parts_used:         get(order, 'parts_used', 'partsUsed') ?? null,
    photo_urls:         get(order, 'photo_urls', 'photoUrls') ?? null,
    signature_data_url: get(order, 'signature_data_url', 'signatureDataUrl') ?? null,
  };

  // Guardas defensivas antes del insert
  if (!payload.building_id) {
    throw new Error('building_id es requerido para crear la orden');
  }
  if (!payload.elevator_id && !payload.equipment_id) {
    throw new Error('Debés asignar un ascensor o un equipo a la orden');
  }

  const { data, error } = await supabase
    .from<WorkOrder>('work_orders')
    .insert(payload)       // objeto único ok
    .select()
    .maybeSingle();

  if (error) throw error;
  return data || null;
},

async updateWorkOrder(id: string, updates: Partial<WorkOrder>, companyId: string): Promise<WorkOrder | null> {
  const { data, error } = await supabase
    .from<WorkOrder>('work_orders')
    .update(updates)
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data || null;
},


  /* ========== Elevator History ========== */
  async addElevatorHistory(
    history: Omit<ElevatorHistory, 'id' | 'company_id' | 'created_at'>,
    companyId: string
  ): Promise<ElevatorHistory | null> {
    const payload = { ...history, company_id: companyId };
    const { data, error } = await supabase.from<ElevatorHistory>('elevator_history').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async getElevatorHistory(elevatorId: string, companyId: string): Promise<ElevatorHistory[]> {
    const { data, error } = await supabase
      .from<ElevatorHistory>('elevator_history')
      .select('*')
      .eq('company_id', companyId)
      .eq('elevator_id', elevatorId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as ElevatorHistory[];
  },

  /* ========== Uploads ========== */
  async uploadPhoto(file: File, companyId: string, workOrderId: string): Promise<string | null> {
    const bucket = 'work-order-photos';
    const path = `${companyId}/${workOrderId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      console.error('uploadPhoto error', error);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  },

  async uploadSignature(dataUrl: string, companyId: string, workOrderId: string): Promise<string | null> {
    const bucket = 'work-order-signatures';
    const path = `${companyId}/${workOrderId}/signature_${Date.now()}.png`;
    const blob = dataUrlToBlob(dataUrl);
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png',
    });
    if (error) {
      console.error('uploadSignature error', error);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  },

  async uploadRemitoPdf(file: Blob, companyId: string, workOrderId: string, remitoNumber: string): Promise<string | null> {
    const bucket = 'remitos';
    const path = `${companyId}/${workOrderId}/remito_${remitoNumber}.pdf`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });
    if (error) {
      console.error('uploadRemitoPdf error', error);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  },

  async getNextRemitoNumber(companyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_next_remito_no', { p_company_id: companyId });
    if (error) throw error;
    return data as string;
  },

  async upsertRemitoRecord(companyId: string, workOrderId: string, remitoNumber: string, fileUrl: string): Promise<void> {
    const { error } = await supabase
      .from('remitos')
      .upsert({
        company_id: companyId,
        work_order_id: workOrderId,
        remito_number: remitoNumber,
        file_url: fileUrl,
      }, { onConflict: 'work_order_id' });
    if (error) throw error;
  },

  /* ========== Equipments (CRUD) ========== */
  async listEquipments(companyId: string, buildingId?: string): Promise<Equipment[]> {
    let q = supabase.from<Equipment>('equipments').select('*').eq('company_id', companyId);
    if (buildingId) q = q.eq('building_id', buildingId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Equipment[];
  },

  async getEquipment(id: string, companyId: string): Promise<Equipment | null> {
    const { data, error } = await supabase
      .from<Equipment>('equipments')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createEquipment(equipment: Omit<Equipment, 'id' | 'created_at'>, companyId: string): Promise<Equipment | null> {
    const payload = { ...equipment, company_id: companyId };
    const { data, error } = await supabase.from<Equipment>('equipments').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateEquipment(id: string, updates: Partial<Equipment>, companyId: string): Promise<Equipment | null> {
    const { data, error } = await supabase
      .from<Equipment>('equipments')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async deleteEquipment(id: string, companyId: string): Promise<void> {
    const { error } = await supabase.from<Equipment>('equipments').delete().eq('company_id', companyId).eq('id', id);
    if (error) throw error;
  },

  /* ========== Engineers ========== */
  async listEngineers(companyId: string): Promise<Engineer[]> {
    const { data, error } = await supabase
      .from('engineer_company_memberships')
      .select('engineer:engineers(*)')
      .eq('company_id', companyId);
    if (error) throw error;
    return (data || []).map((row: any) => row.engineer).filter(Boolean) as Engineer[];
  },

  async getEngineer(id: string): Promise<Engineer | null> {
    const { data, error } = await supabase
      .from<Engineer>('engineers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async getEngineerByUserId(userId: string): Promise<Engineer | null> {
    const { data, error } = await supabase
      .from<Engineer>('engineers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createEngineer(
    engineer: Omit<Engineer, 'id' | 'created_at'>
  ): Promise<Engineer | null> {
    const { data, error } = await supabase.from<Engineer>('engineers').insert(engineer).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateEngineer(
    id: string,
    updates: Partial<Engineer>
  ): Promise<Engineer | null> {
    const { data, error } = await supabase
      .from<Engineer>('engineers')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  /* ========== Engineer Company Memberships ========== */
  async listEngineerMemberships(engineerId: string): Promise<EngineerCompanyMembership[]> {
    const { data, error } = await supabase
      .from<EngineerCompanyMembership>('engineer_company_memberships')
      .select('*')
      .eq('engineer_id', engineerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as EngineerCompanyMembership[];
  },

  async createEngineerMembership(
    engineerId: string,
    joinCode: string
  ): Promise<EngineerCompanyMembership | null> {
    const { data: codeData, error: codeError } = await supabase
      .from('company_join_codes')
      .select('company_id')
      .eq('code', joinCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) throw codeError;
    if (!codeData) throw new Error('Invalid or inactive join code');

    const { data, error } = await supabase
      .from<EngineerCompanyMembership>('engineer_company_memberships')
      .insert({
        engineer_id: engineerId,
        company_id: codeData.company_id,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async removeEngineerMembership(membershipId: string): Promise<void> {
    const { error } = await supabase
      .from('engineer_company_memberships')
      .delete()
      .eq('id', membershipId);
    if (error) throw error;
  },

  async getEngineerCompanies(engineerId: string): Promise<Array<{ id: string; company_id: string; company_name: string }>> {
    const { data, error } = await supabase
      .from('engineer_company_memberships')
      .select('id, company_id, company:companies(name)')
      .eq('engineer_id', engineerId);

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      company_name: row.company?.name || 'Unknown',
    }));
  },

  /* ========== Engineer Reports ========== */
  async listEngineerReports(companyId: string, engineerId?: string): Promise<EngineerReport[]> {
    let q = supabase.from<EngineerReport>('engineer_reports').select('*').eq('company_id', companyId);
    if (engineerId) q = q.eq('engineer_id', engineerId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as EngineerReport[];
  },

  async getEngineerReport(id: string, companyId: string): Promise<EngineerReport | null> {
    const { data, error } = await supabase
      .from<EngineerReport>('engineer_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async createEngineerReport(
    report: Omit<EngineerReport, 'id' | 'created_at'>,
    companyId: string
  ): Promise<EngineerReport | null> {
    const payload = { ...report, company_id: companyId };
    const { data, error } = await supabase.from<EngineerReport>('engineer_reports').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateEngineerReport(
    id: string,
    updates: Partial<EngineerReport>,
    companyId: string
  ): Promise<EngineerReport | null> {
    const { data, error } = await supabase
      .from<EngineerReport>('engineer_reports')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async countUnreadReportsByEngineer(companyId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from<EngineerReport>('engineer_reports')
      .select('engineer_id')
      .eq('company_id', companyId)
      .eq('is_read', false);

    if (error) throw error;

    const acc: Record<string, number> = {};
    for (const row of (data || [])) {
      const eid = row.engineer_id as string;
      acc[eid] = (acc[eid] ?? 0) + 1;
    }
    return acc;
  },
};

export type {
  Building as _Building,
  Elevator as _Elevator,
  Technician as _Technician,
  WorkOrder as _WorkOrder,
  ElevatorHistory as _ElevatorHistory,
  Equipment as _Equipment,
  EquipmentType as _EquipmentType,
  Engineer as _Engineer,
  EngineerReport as _EngineerReport,
  EngineerCompanyMembership as _EngineerCompanyMembership,
};
