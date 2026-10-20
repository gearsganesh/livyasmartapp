import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN") || "https://app.livyacurehub.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(401, { error: "Sign in is required." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) return reply(401, { error: "Your session is invalid or expired." });

  const { data: currentRole, error: roleError } = await callerClient.rpc("livya_current_role");
  if (roleError || !currentRole) return reply(401, { error: "Your session has expired. Sign in again." });

  const { data: caller, error: callerError } = await adminClient
    .from("User").select("id,email,fullName,role,isActive,mustChangePassword")
    .eq("id", authData.user.id).maybeSingle();
  if (callerError || !caller || !caller.isActive) {
    return reply(403, { error: "This account is not enabled for LIVYA." });
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return reply(400, { error: "Invalid JSON request." }); }

  if (input.action === "password_changed") {
    if (input.userId && input.userId !== authData.user.id) return reply(403, { error: "You can only update your own account." });
    const { error } = await adminClient.from("User").update({ mustChangePassword: false, updatedAt: new Date().toISOString() }).eq("id", authData.user.id);
    if (error) return reply(500, { error: "Password changed, but account setup could not be completed. Contact an administrator." });
    await adminClient.from("AuditLog").insert({ id: crypto.randomUUID(), actorId: authData.user.id, action: "PASSWORD_CHANGED", resource: "User", resourceId: authData.user.id });
    return reply(200, { success: true });
  }

  if (!["SUPERADMIN", "ADMIN"].includes(caller.role)) {
    return reply(403, { error: "You do not have permission to manage users." });
  }

  if (input.action === "list") {
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 100));
    const { data, error } = await adminClient.from("User")
      .select("id,email,fullName,role,isActive,mustChangePassword,createdAt")
      .order("createdAt", { ascending: false }).limit(limit);
    if (error) return reply(500, { error: "Unable to load users." });
    return reply(200, { items: data || [], total: (data || []).length });
  }

  if (input.action === "create_client_account") {
    if (caller.role !== "SUPERADMIN") return reply(403, { error: "Only a superadmin can enable client login." });
    const patientId = typeof input.patientId === "string" ? input.patientId : "";
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) return reply(400, { error: "Select a valid patient record." });
    const { data: patient, error: patientError } = await adminClient.from("Patient")
      .select("id,patientCode,fullName,email,userId").eq("id", patientId).maybeSingle();
    if (patientError || !patient) return reply(404, { error: "Patient record not found." });
    if (patient.userId) return reply(409, { error: "This patient is already linked to a login account." });
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : String(patient.email || "").trim().toLowerCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return reply(400, { error: "Add a valid email address to this patient record first." });
    if (patient.email && String(patient.email).trim().toLowerCase() !== email) return reply(400, { error: "The login email must match the patient's email. Update the patient record first if needed." });

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password: "123456", email_confirm: true, user_metadata: { full_name: patient.fullName, patient_code: patient.patientCode },
    });
    if (createError || !created.user) return reply(createError?.message?.toLowerCase().includes("already") ? 409 : 400, {
      error: createError?.message?.toLowerCase().includes("already") ? "An account with this email already exists. Ask the superadmin to review and link the existing account." : "Unable to create the client authentication account.",
    });

    const { data: profile, error: profileError } = await adminClient.from("User").insert({
      id: created.user.id, email, fullName: patient.fullName, role: "CLIENT", isActive: true,
      passwordHash: null, mustChangePassword: true, updatedAt: new Date().toISOString(),
    }).select("id,email,fullName,role,isActive,mustChangePassword,createdAt").single();
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return reply(500, { error: "Client profile creation failed; the authentication account was rolled back." });
    }

    const { data: linked, error: linkError } = await adminClient.from("Patient")
      .update({ userId: created.user.id, email, updatedAt: new Date().toISOString() })
      .eq("id", patientId).is("userId", null).select("id").maybeSingle();
    if (linkError || !linked) {
      await adminClient.from("User").delete().eq("id", created.user.id);
      await adminClient.auth.admin.deleteUser(created.user.id);
      return reply(409, { error: "The patient was linked by another action. No client account was kept; refresh and try again." });
    }
    await adminClient.from("AuditLog").insert({ id: crypto.randomUUID(), actorId: caller.id, action: "CLIENT_LOGIN_CREATED", resource: "Patient", resourceId: patientId });
    return reply(201, { item: profile, patient: { id: patient.id, patientCode: patient.patientCode, fullName: patient.fullName }, temporaryPassword: "123456", mustChangePassword: true });
  }

  if (input.action === "reset_password") {
    if (caller.role !== "SUPERADMIN") return reply(403, { error: "Only a superadmin can reset passwords." });
    const id = typeof input.id === "string" ? input.id : "";
    const { data: target, error: targetError } = await adminClient.from("User").select("id,role").eq("id", id).maybeSingle();
    if (targetError || !target) return reply(404, { error: "User not found." });
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, { password: "123456" });
    if (authUpdateError) return reply(400, { error: "Unable to reset this password." });
    const { error: profileUpdateError } = await adminClient.from("User").update({ mustChangePassword: true, updatedAt: new Date().toISOString() }).eq("id", id);
    if (profileUpdateError) return reply(500, { error: "Password was reset, but the forced-change flag could not be set. Contact support immediately." });
    await adminClient.from("AuditLog").insert({ id: crypto.randomUUID(), actorId: caller.id, action: "USER_PASSWORD_RESET", resource: "User", resourceId: id });
    return reply(200, { success: true, temporaryPassword: "123456", mustChangePassword: true });
  }

  if (input.action === "update") {
    if (caller.role !== "SUPERADMIN") return reply(403, { error: "Only a superadmin can edit user details." });
    const id = typeof input.id === "string" ? input.id : "";
    const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const role = typeof input.role === "string" ? input.role : "";
    if (!id || fullName.length < 2 || fullName.length > 160 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
      !["SUPERADMIN","ADMIN","CLINICIAN","NUTRITIONIST","THERAPIST","STAFF","CLIENT","LAB_PARTNER"].includes(role)) {
      return reply(400, { error: "Enter a valid name, email and role." });
    }
    if (id === caller.id && role !== "SUPERADMIN") return reply(400, { error: "You cannot remove your own superadmin role." });
    const { data: target, error: targetError } = await adminClient.from("User").select("id,role,email").eq("id", id).maybeSingle();
    if (targetError || !target) return reply(404, { error: "User not found." });
    if (target.role === "SUPERADMIN" && role !== "SUPERADMIN") {
      const { count } = await adminClient.from("User").select("id", { count: "exact", head: true }).eq("role","SUPERADMIN").eq("isActive",true);
      if ((count || 0) <= 1) return reply(400, { error: "At least one active superadmin must remain." });
    }
    if (role === "CLIENT") {
      const { data: linkedPatient } = await adminClient.from("Patient").select("id").eq("userId", id).maybeSingle();
      if (!linkedPatient) return reply(400, { error: "A client role must be linked to a patient record. Use Enable client login from User access." });
    }
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, { email, email_confirm: true, user_metadata: { full_name: fullName } });
    if (authUpdateError) return reply(400, { error: authUpdateError.message.toLowerCase().includes("already") ? "That email is already in use." : "Unable to update the authentication account." });
    const { data: updated, error: updateError } = await adminClient.from("User").update({ email, fullName, role, updatedAt: new Date().toISOString() })
      .eq("id", id).select("id,email,fullName,role,isActive,mustChangePassword,createdAt").single();
    if (updateError) return reply(500, { error: "Authentication details were updated, but the profile could not be saved. Contact support." });
    await adminClient.from("Patient").update({ email, fullName, updatedAt: new Date().toISOString() }).eq("userId", id);
    await adminClient.from("AuditLog").insert({ id: crypto.randomUUID(), actorId: caller.id, action: "USER_UPDATED", resource: "User", resourceId: id });
    return reply(200, { item: updated });
  }

  if (input.action === "create") {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const role = typeof input.role === "string" ? input.role : "";
    const allowedRoles = caller.role === "SUPERADMIN"
      ? ["ADMIN", "CLINICIAN", "NUTRITIONIST", "THERAPIST", "STAFF", "LAB_PARTNER"]
      : ["CLINICIAN", "NUTRITIONIST", "THERAPIST", "STAFF", "LAB_PARTNER"];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 ||
        fullName.length > 160 || password.length < 8 || password.length > 128 ||
        !allowedRoles.includes(role)) {
      return reply(400, { error: "Enter a valid email, name, a password of at least 8 characters, and an allowed role." });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) {
      return reply(createError?.message?.toLowerCase().includes("already") ? 409 : 400, {
        error: createError?.message?.toLowerCase().includes("already")
          ? "An account with this email already exists." : "Unable to create the authentication account.",
      });
    }

    const { data: profile, error: profileError } = await adminClient.from("User").insert({
      id: created.user.id, email, fullName, role, isActive: true,
      passwordHash: null, updatedAt: new Date().toISOString(),
    }).select("id,email,fullName,role,isActive,createdAt").single();

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return reply(500, { error: "Profile creation failed; the authentication account was rolled back." });
    }

    await adminClient.from("AuditLog").insert({
      id: crypto.randomUUID(), actorId: caller.id, action: "USER_CREATED", resource: "User", resourceId: profile.id,
    });
    return reply(201, { item: profile });
  }

  if (input.action === "status") {
    const id = typeof input.id === "string" ? input.id : "";
    const isActive = input.isActive;
    if (!id || typeof isActive !== "boolean") return reply(400, { error: "A user ID and active status are required." });
    if (id === caller.id && !isActive) return reply(400, { error: "You cannot deactivate your own account." });

    const { data: target, error: targetError } = await adminClient.from("User")
      .select("id,role,isActive").eq("id", id).maybeSingle();
    if (targetError || !target) return reply(404, { error: "User not found." });
    if (caller.role !== "SUPERADMIN" && ["ADMIN", "SUPERADMIN"].includes(target.role)) {
      return reply(403, { error: "Only a superadmin can modify an administrator account." });
    }
    if (target.role === "SUPERADMIN" && !isActive) {
      const { count } = await adminClient.from("User").select("id", { count: "exact", head: true })
        .eq("role", "SUPERADMIN").eq("isActive", true);
      if ((count || 0) <= 1) return reply(400, { error: "At least one active superadmin must remain." });
    }

    const { error: updateError } = await adminClient.from("User")
      .update({ isActive, updatedAt: new Date().toISOString() }).eq("id", id);
    if (updateError) return reply(500, { error: "Unable to update account status." });
    await adminClient.auth.admin.updateUserById(id, { ban_duration: isActive ? "none" : "876000h" });
    await adminClient.from("AuditLog").insert({
      id: crypto.randomUUID(), actorId: caller.id, action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      resource: "User", resourceId: id,
    });
    return reply(200, { success: true });
  }

  return reply(400, { error: "Unknown user-management action." });
});
