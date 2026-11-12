import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createDailyCashWorkbook } from "../../../src/features/cash/export.js";

const dateInLaPaz = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

function previousDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Método no permitido." }, { status: 405 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return Response.json({ error: "Solicitud no autorizada." }, { status: 401 });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("REPORT_FROM_EMAIL");
  if (!projectUrl || !serviceRoleKey || !resendApiKey || !sender) {
    console.error("Falta configurar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY o REPORT_FROM_EMAIL.");
    return Response.json({ error: "El envío de balances no está configurado." }, { status: 500 });
  }

  const reportDate = previousDate(dateInLaPaz(new Date()));
  const client = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let reportClaimed = false;

  try {
    const { data: claimed, error: claimError } = await client.rpc("il_mundo_claim_daily_report", {
      p_report_date: reportDate,
    });
    if (claimError) throw claimError;
    if (!claimed) return Response.json({ sent: false, reason: "El balance ya se envió o está en proceso." });
    reportClaimed = true;

    const { error: closeError } = await client.rpc("il_mundo_auto_close_cash", {
      p_report_date: reportDate,
    });
    if (closeError) throw closeError;

    const [
      { data: stateRow, error: stateError },
      { data: cashRow, error: cashError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      client.from("il_mundo_state").select("data").eq("id", 1).single(),
      client.from("il_mundo_cash_state").select("data").eq("id", 1).single(),
      client.from("il_mundo_profiles").select("user_id, display_name, role"),
    ]);
    if (stateError) throw stateError;
    if (cashError) throw cashError;
    if (profilesError) throw profilesError;
    if (!profiles?.length) throw new Error("No hay cuentas de administrador para recibir el balance.");

    const adminIds = new Set(profiles.filter((profile) => profile.role === "admin").map((profile) => profile.user_id));
    const adminEmails = new Set<string>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const user of data.users) {
        if (adminIds.has(user.id) && user.email) adminEmails.add(user.email);
      }
      if (data.users.length < 1000) break;
    }
    if (!adminEmails.size) throw new Error("No se encontraron correos para las cuentas de administrador.");

    const team = profiles.map((profile) => ({
      id: profile.user_id,
      name: profile.display_name,
      role: profile.role === "admin" ? "owner" : profile.role === "cashier" ? "cashier" : "worker",
    }));
    const state = {
      ...stateRow.data,
      cashSessions: cashRow.data.cashSessions || [],
      team,
    };
    const workbook = createDailyCashWorkbook(state, reportDate);
    const filename = `${reportDate}.xlsx`;
    const recipients = [...adminEmails];
    for (let offset = 0; offset < recipients.length; offset += 50) {
      const batch = recipients.slice(offset, offset + 50);
      const batchNumber = Math.floor(offset / 50) + 1;
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `il-mundo-daily-balance-${reportDate}-${batchNumber}`,
        },
        body: JSON.stringify({
          from: sender,
          to: batch,
          subject: `Balance de caja ${reportDate} · ${state.settings?.businessName || "Il Mundo"}`,
          text: `Adjuntamos el balance de caja del ${reportDate}. El archivo no se almacena en Supabase.`,
          attachments: [{
            filename,
            content: toBase64(workbook),
          }],
        }),
      });
      if (!emailResponse.ok) {
        const responseBody = await emailResponse.text();
        throw new Error(`Resend rechazó el correo (${emailResponse.status}): ${responseBody}`);
      }
    }

    const { error: completeError } = await client.rpc("il_mundo_complete_daily_report", {
      p_report_date: reportDate,
    });
    if (completeError) throw completeError;
    return Response.json({ sent: true, reportDate, recipients: adminEmails.size });
  } catch (error) {
    console.error(`No se pudo enviar el balance de ${reportDate}.`, error);
    if (reportClaimed) {
      const { error: failError } = await client.rpc("il_mundo_fail_daily_report", {
        p_report_date: reportDate,
        p_error: errorMessage(error),
      });
      if (failError) console.error("No se pudo registrar el fallo del balance.", failError);
    }
    return Response.json({ error: "No se pudo enviar el balance diario." }, { status: 500 });
  }
});
