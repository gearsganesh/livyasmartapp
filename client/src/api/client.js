import { supabase } from './supabase.js';

const resourceTables = {
  patients: 'Patient',
  invoices: 'Invoice',
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
  invoices: ['invoiceNumber', 'status', 'notes'],
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
      return edgeFunction(body?.action || 'create', body || {});
    }
    if (method === 'PATCH' && segments.length === 4 && segments[3] === 'status') {
      return edgeFunction('status', { id: segments[2], ...(body || {}) });
    }
    if (method === 'PATCH' && segments.length === 3) {
      return edgeFunction(body?.action || 'update', { id: segments[2], ...(body || {}) });
    }
    if (method === 'POST' && segments.length === 4 && segments[3] === 'password') {
      return edgeFunction('reset_password', { id: segments[2], ...(body || {}) });
    }
    throw new Error('Unsupported user-management action.');
  }

  if (segments[0] === 'dashboard' && segments[1] === 'summary') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [patients, appointments, alerts, reviews, programs, orders, upcoming] = await Promise.all([
      supabase.from('Patient').select('id', { count: 'exact', head: true }),
      supabase.from('Appointment').select('id', { count: 'exact', head: true }).gte('startAt', today.toISOString()),
      supabase.from('VitalAlert').select('id', { count: 'exact', head: true }).in('status', ['OPEN', 'ACKNOWLEDGED']),
      supabase.from('AIReview').select('id', { count: 'exact', head: true }).in('status', ['DRAFT', 'PENDING', 'IN_PROGRESS']),
      supabase.from('Program').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('StoreOrder').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'CONFIRMED', 'FULFILLING']),
      supabase.from('Appointment')
        .select('id,title,startAt,status,patient:Patient(fullName),clinician:User!Appointment_clinicianId_fkey(fullName)')
        .gte('startAt', today.toISOString()).order('startAt').limit(5),
    ]);
    const failed = [patients, appointments, alerts, reviews, programs, orders, upcoming].find(result => result.error);
    if (failed) fail(failed.error);
    return {
      stats: {
        patients: patients.count || 0,
        appointments: appointments.count || 0,
        openAlerts: alerts.count || 0,
        pendingReviews: reviews.count || 0,
        activePrograms: programs.count || 0,
        openOrders: orders.count || 0,
      },
      recentAppointments: upcoming.data || [],
    };
  }

  if (segments[0] === 'appointments' && segments.length === 1 && method === 'POST') {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in is required to request an appointment.');
    const { data: profile, error: profileError } = await supabase.from('User')
      .select('id,role,isActive').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile || !profile.isActive) throw new Error('Your LIVYA account is not active.');
    const insertBody = { ...(body || {}), id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    if (profile.role === 'CLIENT') {
      const { data: patient, error: patientError } = await supabase.from('Patient')
        .select('id').eq('userId', authData.user.id).maybeSingle();
      if (patientError) fail(patientError);
      if (!patient) throw new Error('Your client account is not linked to a patient profile. Contact LIVYA staff.');
      insertBody.patientId = patient.id;
      insertBody.status = 'REQUESTED';
      insertBody.appointmentType = insertBody.appointmentType || 'Consultation';
      delete insertBody.clinicianId;
      delete insertBody.appointmentNumber;
    } else if (!['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'].includes(profile.role)) {
      throw new Error('Your role cannot create appointments.');
    }
    const { data, error } = await supabase.from('Appointment').insert(insertBody).select('*').single();
    if (error) fail(error);
    return { item: data };
  }

  if (segments[0] === 'lookups' && segments[1]) {
    const lookups = {
      patients: { table: 'Patient', select: 'id,fullName,patientCode,email,userId', order: 'fullName' },
      programs: { table: 'Program', select: 'id,name,category,status', order: 'name' },
      plans: { table: 'PatientPlan', select: 'id,patientId,status,startDate,endDate', order: 'createdAt' },
      prescriptions: { table: 'Prescription', select: 'id,patientId,status,issuedAt', order: 'issuedAt' },
      medicines: { table: 'Medicine', select: 'id,name,genericName,strength,isActive', order: 'name' },
      therapists: { table: 'Therapist', select: 'id,fullName,specializations,status', order: 'fullName' },
      therapies: { table: 'Therapy', select: 'id,name,category,status', order: 'name' },
      products: { table: 'StoreProduct', select: 'id,name,sku,status,price', order: 'name' },
      orders: { table: 'StoreOrder', select: 'id,orderNumber,status,patientId', order: 'createdAt' },
      orderItems: { table: 'StoreOrderItem', select: 'id,orderId,productName,quantity', order: 'createdAt' },
      labs: { table: 'LabPartner', select: 'id,name,status', order: 'name' },
      users: { table: 'User', select: 'id,fullName,email,role,isActive', order: 'fullName' },
      recipients: { table: 'User', select: 'id,fullName,email,role,isActive', order: 'fullName' },
      records: { table: 'ClinicalRecord', select: 'id,patientId,recordType,title,status,createdAt', order: 'createdAt' },
    };
    const config = lookups[segments[1]];
    if (!config) throw new Error('Unknown lookup list.');
    let request = supabase.from(config.table).select(config.select).order(config.order, { ascending: false, nullsFirst: false }).limit(500);
    if (['users', 'recipients'].includes(segments[1])) request = request.eq('isActive', true);
    if (['programs', 'medicines', 'therapists', 'therapies', 'products', 'labs'].includes(segments[1])) {
      if (segments[1] === 'medicines') request = request.eq('isActive', true);
      else request = request.neq('status', 'ARCHIVED');
    }
    const { data, error } = await request;
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
    const orderColumn = key === 'prescriptionItems' ? 'medicineName' : 'createdAt';
    request = request.order(orderColumn, { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await request;
    if (error) fail(error);
    return { items: data || [], total: count || 0, page, limit };
  }

  if (segments.length === 1 && method === 'POST') {
    const insertBody = { ...(body || {}), id: body?.id || crypto.randomUUID() };
    if (!['prescriptionItems', 'consumption', 'therapyAssignments', 'messages'].includes(key)) insertBody.updatedAt = new Date().toISOString();
    if (key === 'messages' && !insertBody.senderId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) fail(authError || new Error('Sign in is required.'));
      insertBody.senderId = user.id;
    }
    const { data, error } = await supabase.from(table).insert(insertBody).select('*').single();
    if (error) fail(error);
    return { item: data };
  }

  if (segments.length === 2 && method === 'PATCH') {
    const updateBody = { ...(body || {}) };
    if (!['prescriptionItems', 'consumption', 'therapyAssignments', 'messages'].includes(key)) updateBody.updatedAt = new Date().toISOString();
    const { data, error } = await supabase.from(table).update(updateBody).eq('id', segments[1]).select('*').single();
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
