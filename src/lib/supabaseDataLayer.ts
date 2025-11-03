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

/** ====== Utilidades ====== */
const toNull = (v: any) => (v === undefined || v === '' || v === 'undefined' ? null : v);

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

/** =======================================================
 *  Capa CRUD directa a tablas/buckets de Supabase
 *  (todas las funciones scoped por companyId)
 *  ======================================================= */
export const supabaseDataLayer = {
  /* ========== Buildings ========== */
  async listBuildings(companyId: string): Promise<Building[]> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Building[];
  },

  async getBuilding(id: string, companyId: string): Promise<Building | null> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Building) || null;
  },

  async createBuilding(
    building: Omit<Building, 'id' | 'created_at'>,
    companyId: string
  ): Promise<Building | null> {
    const payload = { ...building, company_id: companyId };
    const { data, error } = await supabase.from<Building>('buildings').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateBuilding(
    id: string,
    updates: Partial<Building>,
    companyId: string
  ): Promise<Building | null> {
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

  async createElevator(
    elevator: Omit<Elevator, 'id' | 'created_at'>,
    companyId: string
  ): Promise<Elevator | null> {
    const payload = { ...elevator, company_id: companyId };
    const { data, error } = await supabase.from<Elevator>('elevators').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateElevator(
    id: string,
    updates: Partial<Elevator>,
    companyId: string
  ): Promise<Elevator | null> {
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

  async createTechnician(
    technician: Omit<Technician, 'id' | 'created_at'>,
    companyId: string
  ): Promise<Technician | null> {
    const payload = { ...technician, company_id: companyId };
    const { data, error } = await supabase.from<Technician>('technicians').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateTechnician(
    id: string,
    updates: Partial<Technician>,
    companyId: string
  ): Promise<Technician | null> {
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

  /** ===== Semáforo unificado: solo 'free' (verde) o 'busy' (rojo) ===== */
  async getTechnicianStatus(
    technicianId: string,
    companyId: string
  ): Promise<'free' | 'busy'> {
    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .select('id')
      .eq('company_id', companyId)
      .eq('technician_id', technicianId)
      .eq('status', 'In Progress')
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? 'busy' : 'free';
  },

  /** (Opcional) Mapa de OTs en curso por técnico: { technician_id: count } */
  async countInProgressByTechnician(
    companyId: string
  ): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .select('technician_id')
      .eq('company_id', companyId)
      .eq('status', 'In Progress');

    if (error) throw error;

    const acc: Record<string, number> = {};
    for (const row of (data || [])) {
      const tid = row.technician_id as string | null;
      if (!tid) continue;
      acc[tid] = (acc[tid] ?? 0) + 1;
    }
    return acc;
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

  async createWorkOrder(
    order: Omit<WorkOrder, 'id' | 'created_at'>,
    companyId: string
  ): Promise<WorkOrder | null> {
    const payload: any = {
      ...order,
      company_id: companyId,
      elevator_id: toNull(order.elevator_id),
      equipment_id: toNull(order.equipment_id),
      technician_id: toNull(order.technician_id),
      date_time: toNull(order.date_time),
      start_time: toNull(order.start_time),
      finish_time: toNull(order.finish_time),
      comments: order.comments ?? null,
      parts_used: order.parts_used ?? null,
      photo_urls: order.photo_urls ?? null,
      signature_data_url: order.signature_data_url ?? null,
    };
    const { data, error } = await supabase.from<WorkOrder>('work_orders').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateWorkOrder(
    id: string,
    updates: Partial<WorkOrder>,
    companyId: string
  ): Promise<WorkOrder | null> {
    const sanitized: any = { ...updates };
    if ('elevator_id' in sanitized) sanitized.elevator_id = toNull(sanitized.elevator_id);
    if ('equipment_id' in sanitized) sanitized.equipment_id = toNull(sanitized.equipment_id);
    if ('technician_id' in sanitized) sanitized.technician_id = toNull(sanitized.technician_id);
    if ('date_time' in sanitized) sanitized.date_time = toNull(sanitized.date_time);
    if ('start_time' in sanitized) sanitized.start_time = toNull(sanitized.start_time);
    if ('finish_time' in sanitized) sanitized.finish_time = toNull(sanitized.finish_time);
    if ('comments' in sanitized) sanitized.comments = sanitized.comments ?? null;
    if ('parts_used' in sanitized) sanitized.parts_used = sanitized.parts_used ?? null;
    if ('photo_urls' in sanitized) sanitized.photo_urls = sanitized.photo_urls ?? null;
    if ('signature_data_url' in sanitized) sanitized.signature_data_url = sanitized.signature_data_url ?? null;

    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .update(sanitized)
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
//Remitos

  // +++ AGREGAR:
export async function getDefaultRemitoTemplate(companyId: string) {
  const { data, error } = await supabase
    .from("remito_templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRemitoTemplates(companyId: string) {
  const { data, error } = await supabase
    .from("remito_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getNextRemitoNo(companyId: string) {
  const { data, error } = await supabase.rpc("get_next_remito_no", {
    p_company_id: companyId,
  });
  if (error) throw error;
  return data as number;
}

// y abajo, en el export del objeto principal, incluir estas 3 funciones.



  
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

  async createEquipment(
    payload: Omit<Equipment, 'id' | 'created_at'>,
    companyId: string
  ): Promise<Equipment | null> {
    const row = { ...payload, company_id: companyId };
    const { data, error } = await supabase.from<Equipment>('equipments').insert(row).select().maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async updateEquipment(
    id: string,
    updates: Partial<Equipment>,
    companyId: string
  ): Promise<Equipment | null> {
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
    const { error } = await supabase
      .from<Equipment>('equipments')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);
    if (error) throw error;
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
};
