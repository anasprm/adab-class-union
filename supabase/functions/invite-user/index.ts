import { createClient } from "npm:@supabase/supabase-js@2";

const portalSiteUrl = Deno.env.get("PORTAL_SITE_URL") || "https://adab-class-union.vercel.app";
const allowedOrigins = new Set([
  portalSiteUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000"
]);

function corsHeadersFor(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : portalSiteUrl,
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
  wing: 8
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

function generateSecureToken(prefix = "inv_"): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}${hex}`;
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

  // 0. Create an account directly with a username and password.
  if (action === "create-account") {
    const username = typeof payload.username === "string" ? payload.username.trim().toLowerCase() : "";
    const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    const wingId = typeof payload.wing_id === "string" && payload.wing_id ? payload.wing_id : null;

    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
      return json({ error: "Use 3–30 lowercase letters, numbers, dots, underscores, or hyphens for the username." }, request, 400);
    }
    if (displayName.length < 1 || displayName.length > 80) {
      return json({ error: "Enter a display name of 1–80 characters." }, request, 400);
    }
    if (password.length < 8 || password.length > 72) {
      return json({ error: "Choose a password between 8 and 72 characters." }, request, 400);
    }
    if (!Object.hasOwn(roleLimits, role)) {
      return json({ error: "Choose one of the assignable account roles." }, request, 400);
    }
    if ((role === "wing") !== Boolean(wingId)) {
      return json({ error: "Choose a wing for wing accounts only." }, request, 400);
    }
    if (wingId) {
      const { data: wing, error } = await adminClient.from("portal_wings").select("id").eq("id", wingId).maybeSingle();
      if (error || !wing) return json({ error: "Choose an existing wing." }, request, 400);
    }

    const { data: existingUsername, error: usernameError } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (usernameError) {
      console.error("Could not check the username.", usernameError.message);
      return json({ error: "Could not verify the account roster." }, request, 500);
    }
    if (existingUsername) return json({ error: `The username "${username}" is already taken.` }, request, 409);

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

    const loginEmail = `${username}@adab.local`;
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName }
    });
    if (createError || !created.user) {
      console.error("Could not create the auth user.", createError?.message);
      return json({ error: createError?.message || "The account could not be created." }, request, 400);
    }

    const { error: profileInsertError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      email: loginEmail,
      username,
      display_name: displayName,
      role,
      wing_id: wingId,
      is_active: true
    });
    if (profileInsertError) {
      console.error("Could not create the portal profile.", profileInsertError.message);
      await adminClient.auth.admin.deleteUser(created.user.id).catch(() => {});
      return json({ error: profileInsertError.message || "The portal profile could not be created." }, request, 400);
    }

    return json({
      message: `Account "@${username}" created as ${role}. Share the username and password with the account holder.`,
      username,
      password,
      role,
      display_name: displayName
    }, request, 201);
  }

  // 0b. Set a new password directly for an account.
  if (action === "set-password") {
    const userId = typeof payload.user_id === "string" ? payload.user_id : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!userId) return json({ error: "Choose an account first." }, request, 400);
    if (password.length < 8 || password.length > 72) {
      return json({ error: "Choose a password between 8 and 72 characters." }, request, 400);
    }
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (updateError) {
      console.error("Could not update the password.", updateError.message);
      return json({ error: updateError.message || "The password could not be updated." }, request, 400);
    }
    return json({ message: "The account password has been updated." }, request);
  }

  // 1. Create User Invitation & Generate Single-Use Token
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

    const token = generateSecureToken();
    const inviteLink = `${portalSiteUrl}/#invite?token=${encodeURIComponent(token)}`;

    // Record invitation in portal_invites
    const { error: tokenError } = await adminClient.from("portal_invites").insert({
      email,
      role,
      wing_id: wingId,
      display_name: displayName,
      token,
      created_by: callerData.user.id
    });
    if (tokenError) {
      console.warn("Could not record portal invite token into database table:", tokenError.message);
    }

    // Attempt official Supabase invite by email if SMTP is configured
    let emailSent = false;
    try {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName, invited_role: role, invited_wing: wingId },
        redirectTo: inviteLink
      });
      if (!inviteError) emailSent = true;
      else console.info("Email dispatch note (manual link provided):", inviteError.message);
    } catch (e) {
      console.info("Notice: SMTP not sending automatically, returning generated link:", e);
    }

    return json({
      message: emailSent ? `Invitation sent to ${email}.` : `Invitation created. Share the onboarding link directly.`,
      invite_token: token,
      invite_link: inviteLink,
      email,
      role,
      display_name: displayName
    }, request, 201);
  }

  // 2. Update User Account Access & Role
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

  // 3. Force Password Reset Link
  if (action === "force-password-reset") {
    const email = isEmail(payload.email) ? payload.email.trim().toLowerCase() : "";
    if (!email) return json({ error: "Valid account email required." }, request, 400);

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${portalSiteUrl}/#login` }
    });

    if (linkError) {
      console.error("Could not generate recovery link:", linkError.message);
      return json({ error: linkError.message || "Could not generate password reset link." }, request, 400);
    }

    return json({
      message: `Password reset link generated for ${email}.`,
      action_link: linkData.properties?.action_link || `${portalSiteUrl}/#login`
    }, request);
  }

  // 4. Revoke Account Access / Delete Account
  if (action === "revoke-access") {
    const userId = typeof payload.user_id === "string" ? payload.user_id : "";
    if (!userId || userId === callerData.user.id) {
      return json({ error: "Cannot revoke developer root account." }, request, 400);
    }

    const { error: suspendError } = await adminClient
      .from("profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (suspendError) return json({ error: "Could not revoke access." }, request, 500);

    return json({ message: "User access revoked and account suspended." }, request);
  }

  return json({ error: "Unknown account-management action." }, request, 400);
});
