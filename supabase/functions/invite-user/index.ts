import { createClient } from "npm:@supabase/supabase-js@2";

const portalSiteUrl = Deno.env.get("PORTAL_SITE_URL") || "https://adab-class-union.vercel.app";
const allowedOrigins = new Set([
  portalSiteUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function corsHeadersFor(request: Request) {
  const origin = request.headers.get("Origin") || "";
  return {
  "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : portalSiteUrl,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
  };
}

const roleLimits: Record<string, number> = {
  teacher: 1,
  committee: 1,
  treasurer: 1,
  student: 15,
  wing: 7
};

const json = (body: unknown, request: Request, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(request), "Content-Type": "application/json" }
  });

function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(request) });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, request, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in as a developer first." }, request, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Invite function is missing Supabase server environment variables.");
    return json({ error: "Account invitations are not configured on the server." }, request, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Your session is invalid. Sign in again." }, request, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role,is_active")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not verify developer role.", profileError.message);
    return json({ error: "Could not verify your account permissions." }, request, 500);
  }
  if (!callerProfile?.is_active || callerProfile.role !== "developer") {
    return json({ error: "Only the active developer can manage accounts." }, request, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, request, 400);
  }

  const action = payload.action;
  if (action === "invite") {
    const email = isEmail(payload.email) ? payload.email.trim().toLowerCase() : "";
    const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    const wingId = typeof payload.wing_id === "string" ? payload.wing_id : null;

    if (!email || displayName.length < 1 || displayName.length > 80) {
      return json({ error: "Enter a valid email address and a name of 1–80 characters." }, request, 400);
    }
    if (!Object.hasOwn(roleLimits, role)) {
      return json({ error: "The selected role cannot be invited." }, request, 400);
    }
    if ((role === "wing") !== Boolean(wingId)) {
      return json({ error: "Choose a wing for wing accounts only." }, request, 400);
    }
    if (wingId) {
      const { data: wing, error } = await adminClient.from("portal_wings").select("id").eq("id", wingId).maybeSingle();
      if (error || !wing) return json({ error: "Choose an existing wing." }, request, 400);
    }

    const { data: existing, error: existingError } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existingError) {
      console.error("Could not check for an existing profile.", existingError.message);
      return json({ error: "Could not verify the account roster." }, request, 500);
    }
    if (existing) return json({ error: "That email already has a portal account." }, request, 409);

    const { count, error: countError } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", role)
      .eq("is_active", true);
    if (countError) {
      console.error("Could not check role capacity.", countError.message);
      return json({ error: "Could not verify available account slots." }, request, 500);
    }
    if ((count || 0) >= roleLimits[role]) {
      return json({ error: `All ${roleLimits[role]} ${role} account slot(s) are in use.` }, request, 409);
    }

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName },
      redirectTo: `${portalSiteUrl}/#login`
    });
    if (inviteError || !invited.user) {
      console.error("Supabase could not send the account invitation.", inviteError?.message);
      return json({ error: inviteError?.message || "The invitation could not be created." }, request, 400);
    }

    const { error: insertError } = await adminClient.from("profiles").insert({
      id: invited.user.id,
      email,
      display_name: displayName,
      role,
      wing_id: wingId
    });
    if (insertError) {
      console.error("Could not assign the invited account its role.", insertError.message);
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invited.user.id);
      if (cleanupError) console.error("Could not remove the incomplete invited account.", cleanupError.message);
      return json({ error: "The invitation was sent, but the role could not be assigned. Check the roster before retrying." }, request, 500);
    }

    return json({ message: `Invitation sent to ${email}.`, user_id: invited.user.id }, request, 201);
  }

  if (action === "update-user") {
    const userId = typeof payload.user_id === "string" ? payload.user_id : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    const isActive = payload.is_active;
    const wingId = typeof payload.wing_id === "string" ? payload.wing_id : null;
    if (!userId || !Object.hasOwn(roleLimits, role) || typeof isActive !== "boolean") {
      return json({ error: "Choose a valid account, role, and active status." }, request, 400);
    }
    if ((role === "wing") !== Boolean(wingId)) {
      return json({ error: "Choose a wing for wing accounts only." }, request, 400);
    }
    if (userId === callerData.user.id) return json({ error: "You cannot change your own developer access." }, request, 400);

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id,role")
      .eq("id", userId)
      .maybeSingle();
    if (targetError || !target) return json({ error: "The selected account was not found." }, request, 404);
    if (target.role === "developer") return json({ error: "Developer access cannot be reassigned from this screen." }, request, 403);

    if (isActive) {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", role)
        .eq("is_active", true)
        .neq("id", userId);
      if (countError) return json({ error: "Could not verify available account slots." }, request, 500);
      if ((count || 0) >= roleLimits[role]) return json({ error: `All ${roleLimits[role]} ${role} account slot(s) are in use.` }, request, 409);
      if (wingId) {
        const { data: wing, error } = await adminClient.from("portal_wings").select("id").eq("id", wingId).maybeSingle();
        if (error || !wing) return json({ error: "Choose an existing wing." }, request, 400);
      }
    }

    const { error: updateError } = await adminClient.from("profiles")
      .update({ role, is_active: isActive, wing_id: wingId, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updateError) {
      console.error("Could not update the account role.", updateError.message);
      return json({ error: "The account could not be updated." }, request, 500);
    }
    return json({ message: "Account access updated." }, request);
  }

  return json({ error: "Unknown account-management action." }, request, 400);
});
