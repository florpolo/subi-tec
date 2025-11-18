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
  technician_signature_data_url?: string | null;
  client_dni?: string | null;
  client_aclaracion?: string | null;
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
  | 'elevator'
  | 'water_pump'
  | 'freight_elevator'
  | 'car_lift'
  | 'dumbwaiter'
  | 'camillero'
  | 'other';

export interface Equipment {
  id: string;
  company_id: string;
  building_id: string;
  type: EquipmentType;
  name: string;
  location_description: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: number | null;
  status: 'fit' | 'out_of_service';
  created_at?: string;
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

  // Estado simple: 'free' | 'busy'
  async getTechnicianStatus(technicianId: string, companyId: string): Promise<'free' | 'busy'> {
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

  // >>>>>>> createWorkOrder con mapeo explícito + saneo de opcionales
  async createWorkOrder(
    order: Omit<WorkOrder, 'id' | 'created_at'>,
    companyId: string
  ): Promise<WorkOrder | null> {
    // helper: lee snake o camel
    const get = (a: any, snake: string, camel: string) =>
      (a as any)[snake] ?? (a as any)[camel];

    const payload: any = {
      company_id: companyId,

      claim_type:         get(order, 'claim_type', 'claimType'),
      corrective_type:    toNull(get(order, 'corrective_type', 'correctiveType')),

      building_id:        get(order, 'building_id', 'buildingId'),

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

    if (!payload.building_id) {
      throw new Error('building_id es requerido para crear la orden');
    }
    if (!payload.elevator_id && !payload.equipment_id) {
      throw new Error('Debés asignar un ascensor o un equipo a la orden');
    }

    const { data, error } = await supabase
      .from<WorkOrder>('work_orders')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async updateWorkOrder(
    id: string,
    updates: Partial<WorkOrder>,
    companyId: string
  ): Promise<WorkOrder | null> {
    // Saneamos opcionales para no enviar "undefined" a columnas UUID/timestamp
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
    const { data, error } = await supabase
      .from<ElevatorHistory>('elevator_history')
      .insert(payload)
      .select()
      .maybeSingle();
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
};
