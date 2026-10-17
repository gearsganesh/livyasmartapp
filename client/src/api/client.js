import { supabase } from './supabase.js';

const resourceTables = {
  patients: 'Patient',
  appointments: 'Appointment',
  alerts: 'VitalAlert',
  records: 'ClinicalRecord',
  prescriptions: 'Prescription',
  prescriptionItems: 'PrescriptionItem',
  medicines: 'Medicine',
  nutrition: 'NutritionAssessment',
  programs: 'Program',
  plans: 'PatientPlan',
  consumption: 'PlanConsumption',
  aiReviews: 'AIReview',
  therapies: 'Therapy',
  therapists: 'Therapist',
  therapyAssignments: 'TherapistAssignment',
  products: 'StoreProduct',
  orderItems: 'StoreOrderItem',
  orders: 'StoreOrder',
  labs: 'LabPartner',
  labBookings: 'LabBooking',
  permissions: 'RolePermission',
  sops: 'SOP',
  messages: 'Message',
};

const searchableFields = {
  patients: ['fullName', 'patientCode', 'email', 'phone'],
  appointments: ['title', 'appointmentType', 'location'],
  alerts: ['title', 'metric', 'observedValue'],
  records: ['title', 'recordType'],
  prescriptions: ['instructions'],
  prescriptionItems: ['medicineName'],
  medicines: ['name', 'genericName', 'sku'],
  nutrition: ['dietaryPreferences', 'goals'],
  programs: ['name', 'category', 'description'],
  plans: ['notes'],
  consumption: ['itemName', 'unit'],
  aiReviews: ['reviewType', 'inputSummary'],
  therapies: ['name', 'category'],
  therapists: ['fullName', 'email', 'phone'],
  therapyAssignments: ['notes'],
  products: ['name', 'sku', 'category'],
  orderItems: ['productName'],
  orders: ['orderNumber', 'status'],
  labs: ['name', 'contactName', 'email'],
  labBookings: ['bookingNumber', 'testName'],
  permissions: ['role', 'resource'],
  sops: ['title', 'category'],
  messages: ['subject', 'body'],
};

function fail(error) {
  const err = new Error(error?.message || 'The request could not be completed.');
  err.status = error?.status;
  err.fields = error?.fields;
  throw err;
}

async function edgeFunction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  if (error) fail(error);
  if (data?.error) fail(data);
  return data;
}

export async function api(path, { method = 'GET', body } = {}) {
  const url = new URL(path, 'https://livya.invalid');
  const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
  const segments = pathname.split('/').filter(Boolean);
  const query = url.searchParams;

  if (segments[0] === 'auth' && segments[1] === 'users') {
    if (method === 'GET' && segments.length === 2) {
      return edgeFunction('list', { limit: Number(query.get('limit') || 100) });
    }
    if (method === 'POST' && segments.length === 2) {
      return edgeFunction('create', body || {});
    }
    if (method === 'PATCH' && segments.length === 4 && segments[3] === 'status') {
      return edgeFunction('status', { id: segments[2], ...(body || {}) });
    }
    throw new Error('Unsupported user-management action.');
  }

  if (segments[0] === 'lookups' && segments[1] === 'patients') {
    const { data, error } = await supabase
      .from('Patient')
      .select('id,fullName,patientCode')
      .order('fullName')
      .limit(500);
    if (error) fail(error);
    return { items: data || [], total: (data || []).length };
  }

  if (segments[0] === 'audit') {
    const limit = Math.min(100, Math.max(1, Number(query.get('limit') || 100)));
    const { data, error } = await supabase
      .from('AuditLog')
      .select('id,actorId,action,resource,resourceId,createdAt,actor:User!AuditLog_actorId_fkey(fullName,email)')
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (error) fail(error);
    return { items: data || [], total: (data || []).length };
  }

  const key = segments[0];
  const table = resourceTables[key];
  if (!table) throw new Error('Unknown LIVYA resource.');

  if (segments.length === 1 && method === 'GET') {
    const page = Math.max(1, Number(query.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(query.get('limit') || 25)));
    let request = supabase.from(table).select('*', { count: 'exact' });
    const q = query.get('q')?.trim();
    if (q) {
      const fields = searchableFields[key] || [];
      if (fields.length) request = request.or(fields.map(field => `${field}.ilike.%${q.replace(/[,%()]/g, ' ')}%`).join(','));
    }
    const status = query.get('status');
    if (status) request = request.eq('status', status);
    request = request.order('createdAt', { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await request;
    if (error) fail(error);
    return { items: data || [], total: count || 0, page, limit };
  }

  if (segments.length === 1 && method === 'POST') {
    const { data, error } = await supabase.from(table).insert(body || {}).select('*').single();
    if (error) fail(error);
    return { item: data };
  }

  if (segments.length === 2 && method === 'PATCH') {
    const { data, error } = await supabase.from(table).update(body || {}).eq('id', segments[1]).select('*').single();
    if (error) fail(error);
    return { item: data };
  }

  if (segments.length === 2 && method === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', segments[1]);
    if (error) fail(error);
    return null;
  }

  throw new Error('Unsupported LIVYA resource operation.');
}

export const authApi = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) fail(error);
    const { data: profile, error: profileError } = await supabase
      .from('User')
      .select('id,email,fullName,role,isActive,createdAt')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) fail(profileError);
    if (!profile || !profile.isActive) {
      await supabase.auth.signOut();
      throw new Error('This account is not enabled for LIVYA. Contact your administrator.');
    }
    return { user: profile };
  },
  register: async () => {
    throw new Error('Registration is restricted. Contact your administrator.');
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) fail(error);
    return null;
  },
  me: async () => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) fail(error);
    if (!authUser) throw new Error('Not signed in.');
    const { data, error: profileError } = await supabase
      .from('User')
      .select('id,email,fullName,role,isActive,createdAt')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profileError) fail(profileError);
    if (!data || !data.isActive) {
      await supabase.auth.signOut();
      throw new Error('This account is not enabled for LIVYA. Contact your administrator.');
    }
    return { user: data };
  },
};
