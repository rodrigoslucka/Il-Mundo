import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

function throwIfError(error, operation) {
  if (!error) return;
  console.error(`${operation} falló en Supabase.`, error);
  throw new Error(error.message || `No se pudo completar: ${operation}.`);
}

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error, "Verificar la sesión");
  return data.user;
}

export async function getWorkspaceProfile(userId) {
  const { data, error } = await supabase
    .from("il_mundo_profiles")
    .select("user_id, display_name, role")
    .eq("user_id", userId)
    .single();
  throwIfError(error, "Cargar el perfil");
  return data;
}

export async function loadWorkspace(initialState, userId, role) {
  const profile = await getWorkspaceProfile(userId);
  if (profile.role !== role) throw new Error("El rol de la cuenta cambió. Inicia sesión de nuevo.");

  let { data: row, error } = await supabase
    .from("il_mundo_state")
    .select("data, revision")
    .eq("id", 1)
    .maybeSingle();
  throwIfError(error, "Cargar los datos compartidos");

  if (!row && role === "admin") {
    const { data, error: bootstrapError } = await supabase.rpc("il_mundo_bootstrap", {
      p_state: initialState,
      p_cash_state: { cashSessions: initialState.cashSessions || [] },
    });
    throwIfError(bootstrapError, "Inicializar el espacio compartido");
    const bootstrapped = data?.[0];
    if (bootstrapped) row = { data: bootstrapped.state, revision: bootstrapped.revision };
  }
  if (!row) throw new Error("Un administrador debe inicializar primero el espacio compartido.");

  let cashState = { cashSessions: [] };
  if (role === "admin") {
    const { data, error: cashError } = await supabase
      .from("il_mundo_cash_state")
      .select("data")
      .eq("id", 1)
      .single();
    throwIfError(cashError, "Cargar la caja");
    cashState = data.data;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("il_mundo_profiles")
    .select("user_id, display_name, role")
    .order("created_at", { ascending: true });
  throwIfError(profilesError, "Cargar las cuentas del equipo");

  return {
    revision: row.revision,
    profile,
    state: {
    ...row.data,
    cashSessions: cashState.cashSessions || [],
    team: profiles.map((member) => ({
      id: member.user_id,
      name: member.display_name,
      role: member.role === "admin" ? "owner" : "worker",
    })),
    activeRole: role === "admin" ? "owner" : "worker",
    activeMemberId: profile.user_id,
    },
  };
}

export async function saveWorkspace(state, revision, role) {
  const { data, error } = await supabase.rpc("il_mundo_save", {
    p_state: state,
    p_cash_state: { cashSessions: role === "admin" ? state.cashSessions : [] },
    p_expected_revision: revision,
  });
  throwIfError(error, "Sincronizar los cambios");
  const row = data?.[0];
  if (!row) throw new Error("Supabase no confirmó el guardado.");
  return row;
}

export async function refreshWorkspace(initialState, userId, role) {
  return loadWorkspace(initialState, userId, role);
}

export async function inviteOrManageStaff(action, details) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, ...details },
  });
  throwIfError(error, "Administrar las cuentas");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function subscribeWorkspace(onChange, onStatus) {
  const channel = supabase
    .channel("il-mundo-workspace")
    .on("postgres_changes", { event: "*", schema: "public", table: "il_mundo_state", filter: "id=eq.1" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "il_mundo_cash_state", filter: "id=eq.1" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "il_mundo_profiles" }, onChange)
    .subscribe(onStatus);
  return () => supabase.removeChannel(channel);
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  throwIfError(error, "Iniciar sesión");
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error, "Cerrar sesión");
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname}`,
  });
  throwIfError(error, "Solicitar el restablecimiento de contraseña");
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  throwIfError(error, "Actualizar la contraseña");
}
