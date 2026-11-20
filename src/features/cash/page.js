import { activeCashSession } from "../../data.js?v=7";
import { createPaymentTotals } from "./totals.js";

export function renderCashPage(state, ui) {
  const { badge, button, clockTime, emptyState, esc, formatMoney, hasActiveRole, icon, pageHeading, orderDisplayId } = ui;
  const session = activeCashSession(state);
  if (!hasActiveRole("owner", "cashier")) {
    return `${pageHeading("CAJA", "Acceso restringido", "Esta sección está disponible para el administrador y el rol Caja.")}<div class="card">${emptyState("Esta sección no está disponible para tu perfil", "El balance de caja se reserva para el administrador y el rol Caja.", "wallet")}</div>`;
  }

  const cashActions = [
    hasActiveRole("owner") && state.cashSessions.length ? button("export-cash-excel", "Exportar Excel", { kind: "soft", icon: "download" }) : "",
  ].join("");
  const payments = session?.transactions || [];
  const totals = createPaymentTotals(payments, state.settings.paymentMethods);
  const allSales = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const cashSales = totals.Efectivo || 0;
  const expected = Number(session?.openingAmount || 0) + cashSales;
  const closedSessions = state.cashSessions.filter((cash) => Boolean(cash.closedAt)).sort((a, b) => b.closedAt.localeCompare(a.closedAt)).slice(0, 8);
  return `${pageHeading("BALANCE DIARIO", "Caja", "Apertura automática a las 00:01 y cierre a las 23:59, hora de Bolivia.", cashActions)}
    <div class="cash-overview">
      <div class="cash-status ${session ? "is-open" : "is-closed"}" role="status"><div class="cash-status-details"><span class="cash-status-icon">${icon("wallet")}</span><div><span class="cash-status-label">${session ? "OPERACIÓN ACTIVA" : "ESTADO DE CAJA"}</span><strong>${session ? "Caja abierta" : "Caja cerrada"}</strong><p>${session ? `Abierta a las ${clockTime(session.openedAt)} · fondo inicial ${formatMoney(session.openingAmount, state.settings.currency)}` : "La siguiente apertura será automática a las 00:01."}</p></div></div>${session ? badge("En curso", "preparing") : badge("Cerrada", "off")}</div>
      <aside class="cash-report-note"><span class="cash-report-icon">${icon("check")}</span><div><strong>Balance disponible en el panel</strong><p>Consulta el resumen aquí o descarga el Excel desde Ajustes. No se envían correos.</p></div></aside>
    </div>
    ${session ? `<div class="two-column" style="margin-top:14px">
      <section class="card panel"><div class="panel-title"><h2>Resumen del turno</h2><span class="small muted">${payments.length} ${payments.length === 1 ? "pago" : "pagos"}</span></div><div class="stat-row total"><span>Total generado</span><strong>${formatMoney(allSales, state.settings.currency)}</strong></div><div class="stat-row"><span>Efectivo</span><strong>${formatMoney(cashSales, state.settings.currency)}</strong></div><div class="stat-row"><span>QR</span><strong>${formatMoney(totals.QR || 0, state.settings.currency)}</strong></div><div class="stat-row"><span>Tarjeta</span><strong>${formatMoney(totals.Tarjeta || 0, state.settings.currency)}</strong></div>${Object.entries(totals).filter(([method, amount]) => !["Efectivo", "QR", "Tarjeta"].includes(method) && amount > 0).map(([method, amount]) => `<div class="stat-row"><span>${esc(method)}</span><strong>${formatMoney(amount, state.settings.currency)}</strong></div>`).join("")}<div class="stat-row"><span>Monto al abrir</span><strong>${formatMoney(session.openingAmount, state.settings.currency)}</strong></div><div class="stat-row total"><span>Efectivo esperado en caja</span><strong>${formatMoney(expected, state.settings.currency)}</strong></div></section>
      <section class="card panel"><div class="panel-title"><h2>Pagos del turno</h2></div>${payments.length ? `<div class="activity-list">${payments.slice().reverse().map((payment) => { const order = state.orders.find((item) => item.id === payment.orderId); return `<div class="activity-row"><span class="order-dot">${icon("card")}</span><span class="activity-main"><strong>${order ? orderDisplayId(order) : "Pedido archivado"}</strong><span>${esc(payment.method)} · ${clockTime(payment.paidAt)}</span></span><strong class="small">${formatMoney(payment.amount, state.settings.currency)}</strong></div>`; }).join("")}</div>` : emptyState("Todavía no hay pagos", "Los pagos aparecerán automáticamente al confirmar pedidos durante este turno.", "card")}</section>
    </div>` : `<div class="card panel" style="margin-top:14px">${emptyState("Caja cerrada", "La apertura automática está programada para las 00:01.", "wallet")}</div>`}
    <div class="section-heading"><h2>Cierres anteriores</h2></div>
    <div class="card">${closedSessions.length ? `<div class="table-wrap" style="border:0"><table class="data-table"><thead><tr><th>Turno</th><th>Total generado</th><th>Efectivo</th><th>QR</th><th>Tarjeta</th><th>Cierre</th></tr></thead><tbody>${closedSessions.map((closed) => { const closedPayments = createPaymentTotals(closed.transactions || [], state.settings.paymentMethods); const total = Object.values(closedPayments).reduce((sum, amount) => sum + amount, 0); return `<tr><td><strong>${esc(closed.date)}</strong><br><span class="small muted">Abrió ${formatMoney(closed.openingAmount, state.settings.currency)}</span></td><td>${formatMoney(total, state.settings.currency)}</td><td>${formatMoney(closedPayments.Efectivo || 0, state.settings.currency)}</td><td>${formatMoney(closedPayments.QR || 0, state.settings.currency)}</td><td>${formatMoney(closedPayments.Tarjeta || 0, state.settings.currency)}</td><td>${clockTime(closed.closedAt)}</td></tr>`; }).join("")}</tbody></table></div>` : emptyState("Aún no se han cerrado turnos", "Los cierres automáticos aparecerán aquí.", "wallet")}</div>`;
}
