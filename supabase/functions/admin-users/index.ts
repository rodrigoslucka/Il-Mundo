import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método no permitido." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Inicia sesión para continuar." }, 401);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !publicKey || !serviceKey) {
    console.error("Falta la configuración privada de Supabase Functions.");
    return respond({ error: "El servicio de administración no está configurado." }, 500);
  }

  const userClient = createClient(projectUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return respond({ error: "La sesión no es válida." }, 401);

  const { data: actor, error: actorError } = await serviceClient
    .from("il_mundo_profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (actorError || actor?.role !== "admin") return respond({ error: "Solo un administrador puede gestionar cuentas." }, 403);

  let body: { action?: string; email?: string; name?: string; password?: string; role?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return respond({ error: "La solicitud no contiene JSON válido." }, 400);
  }

  if (body.action === "list") {
    const users = await listAllUsers(serviceClient);
    if (!users) return respond({ error: "No se pudo consultar la lista de cuentas." }, 400);
    const pending = users.filter((user) =>
      Boolean(user.invited_at) && !user.email_confirmed_at
    );
    if (!pending.length) return respond({ pendingAccounts: [] });

    const pendingIds = pending.map((user) => user.id);
    const { data: profiles, error: profilesError } = await serviceClient
      .from("il_mundo_profiles")
      .select("user_id, display_name, role")
      .in("user_id", pendingIds);
    if (profilesError) return respond({ error: profilesError.message }, 400);
    const profilesById = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
    return respond({
      pendingAccounts: pending.map((user) => {
        const profile = profilesById.get(user.id);
        return {
          id: user.id,
          email: user.email || "",
          name: profile?.display_name || user.user_metadata?.display_name || user.email || "",
          role: ["admin", "cashier", "worker"].includes(profile?.role) ? profile.role : "worker",
          invitedAt: user.invited_at,
        };
      }),
    });
  }

  if (body.action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = body.role;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 60 || password.length < 8 || password.length > 128 || !["admin", "cashier", "worker"].includes(role || "")) {
      return respond({ error: "Revisa el correo, el nombre, la contraseña y el rol." }, 400);
    }
    const existingUsers = await listAllUsers(serviceClient);
    if (!existingUsers) return respond({ error: "No se pudo comprobar si el correo ya tiene una cuenta." }, 400);
    const existing = existingUsers.find((user) => String(user.email || "").trim().toLowerCase() === email);
    if (existing) return respond({ error: "Ya existe una cuenta con ese correo. Cámbiale la contraseña desde el panel." }, 409);

    const creationToken = crypto.randomUUID();
    const expiredBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { error: expiredTokensError } = await serviceClient
      .from("il_mundo_admin_user_creation_tokens")
      .delete()
      .lt("created_at", expiredBefore);
    if (expiredTokensError) {
      console.error("No se pudieron limpiar las autorizaciones de creación vencidas.", expiredTokensError);
      return respond({ error: "No se pudo preparar la creación de la cuenta." }, 500);
    }

    const { error: creationTokenError } = await serviceClient
      .from("il_mundo_admin_user_creation_tokens")
      .insert({ token: creationToken, email });
    if (creationTokenError) {
      console.error("No se pudo preparar la autorización de creación de cuenta.", creationTokenError);
      return respond({ error: "No se pudo preparar la creación de la cuenta." }, 500);
    }

    let creationResult: Awaited<ReturnType<typeof serviceClient.auth.admin.createUser>>;
    try {
      creationResult = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { il_mundo_admin_created: true },
        user_metadata: { display_name: name, il_mundo_admin_creation_token: creationToken },
      });
    } finally {
      const { error: creationTokenCleanupError } = await serviceClient
        .from("il_mundo_admin_user_creation_tokens")
        .delete()
        .eq("token", creationToken);
      if (creationTokenCleanupError) {
        console.error("No se pudo limpiar la autorización de creación de cuenta.", creationTokenCleanupError);
      }
    }
    const { data, error } = creationResult;
    if (error) return respond({ error: error.message }, 400);
    const { error: profileError } = await serviceClient
      .from("il_mundo_profiles")
      .update({ display_name: name, role })
      .eq("user_id", data.user.id);
    if (profileError) {
      console.error("Se creó la cuenta pero no se pudo asignar el rol.", profileError);
      const { error: rollbackError } = await serviceClient.auth.admin.deleteUser(data.user.id);
      if (rollbackError) console.error("No se pudo revertir la cuenta creada.", rollbackError);
      return respond({ error: "No se pudo guardar el perfil de la cuenta. Inténtalo de nuevo desde el panel." }, 500);
    }
    return respond({ created: true });
  }

  if (body.action === "set-password") {
    const userId = String(body.userId || "");
    const password = String(body.password || "");
    if (!userId || password.length < 8 || password.length > 128) {
      return respond({ error: "Selecciona una cuenta y una contraseña de entre 8 y 128 caracteres." }, 400);
    }
    const { data: target, error: targetError } = await serviceClient.auth.admin.getUserById(userId);
    if (targetError || !target.user) return respond({ error: "No se encontró la cuenta." }, 404);
    const { error } = await serviceClient.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) return respond({ error: error.message }, 400);
    return respond({ updated: true });
  }

  if (body.action === "role") {
    if (!body.userId || !["admin", "cashier", "worker"].includes(body.role || "")) {
      return respond({ error: "Selecciona una cuenta y un rol válido." }, 400);
    }
    const { data: target, error: targetError } = await serviceClient
      .from("il_mundo_profiles")
      .select("role")
      .eq("user_id", body.userId)
      .single();
    if (targetError) return respond({ error: "No se encontró la cuenta." }, 404);
    if (target.role === "admin" && body.role !== "admin") {
      const { count, error: countError } = await serviceClient
        .from("il_mundo_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return respond({ error: "No se pudo comprobar el último administrador." }, 500);
      if ((count || 0) <= 1) return respond({ error: "Debe quedar al menos un administrador." }, 400);
    }
    const { error } = await serviceClient
      .from("il_mundo_profiles")
      .update({ role: body.role })
      .eq("user_id", body.userId);
    if (error) return respond({ error: error.message }, 400);
    return respond({ updated: true });
  }

  if (body.action === "remove") {
    if (!body.userId || body.userId === userData.user.id) return respond({ error: "No puedes eliminar tu propia cuenta desde esta pantalla." }, 400);
    const { data: target, error: targetError } = await serviceClient
      .from("il_mundo_profiles")
      .select("role")
      .eq("user_id", body.userId)
      .single();
    if (targetError) return respond({ error: "No se encontró la cuenta." }, 404);
    if (target.role === "admin") {
      const { count, error: countError } = await serviceClient
        .from("il_mundo_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return respond({ error: "No se pudo comprobar el último administrador." }, 500);
      if ((count || 0) <= 1) return respond({ error: "Debe quedar al menos un administrador." }, 400);
    }
    const { error } = await serviceClient.auth.admin.deleteUser(body.userId);
    if (error) return respond({ error: error.message }, 400);
    return respond({ removed: true });
  }

  return respond({ error: "Acción no reconocida." }, 400);
});

type AdminUser = {
  id: string;
  email?: string;
  invited_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function listAllUsers(client: ReturnType<typeof createClient>): Promise<AdminUser[] | null> {
  const users: AdminUser[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const pageUsers = ((data as { users?: AdminUser[] } | null)?.users || []);
    users.push(...pageUsers);
    if (pageUsers.length < perPage) return users;
    page += 1;
  }
}

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
