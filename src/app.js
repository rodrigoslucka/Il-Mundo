import {
  activeCashSession,
  createInitialState,
  formatMoney,
  loadState,
  NAVIGATION,
  orderTotal,
  ROLES,
  saveState,
  todayKey,
  validateState,
} from "./data.js?v=6";
import { createCashWorkbook, cashWorkbookFilename } from "./features/cash/export.js";
import { createPaymentTotals } from "./features/cash/totals.js";
import { renderCashPage } from "./features/cash/page.js";

const app = document.querySelector("#app");
const iconPaths = {
  home: '<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/>',
  receipt: '<path d="M4 3h16v18l-4-2-4 2-4-2-4 2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  chef: '<path d="M6 13h12l1 8H5z"/><path d="M6 13a4 4 0 0 1 1-7.9 5 5 0 0 1 10 0A4 4 0 0 1 18 13"/><path d="M9 17v.01M15 17v.01"/>',
  table: '<path d="M3 9h18l-2 5H5z"/><path d="M6 14v7M18 14v7M8 4h8v5H8z"/>',
  wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h13"/><path d="M20 9h-5a2 2 0 0 0 0 4h5"/><path d="M15 11h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 6v0M8 12v0M8 18v0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/><path d="M16 16h1a4 4 0 0 1 4 4v1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.5a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.5-1.4-2.4L5.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.5a8 8 0 0 1 1.7-1L9 7.2h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.5 1.4 2.4-1.4 1.1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  package: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/><path d="m7 5.8 9 5"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="m15 6 2 4h4M5.5 17.5l5-6 3 6h5M10.5 11.5H8M14.5 10l-2 1.5"/>',
  utensils: '<path d="m3 3 7 7M6 3l4 4M3 6l4 4M10 10l10 10M14 8l2-2a4 4 0 0 1 5 5l-3 3-4-4"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h2"/>',
  store: '<path d="M3 9 5 3h14l2 6"/><path d="M5 9v12h14V9M9 21v-7h6v7"/><path d="M3 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/>',
  note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  sparkles: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/><path d="m19 13 1.1 2.9L23 17l-2.9 1.1L19 21l-1.1-2.9L15 17l2.9-1.1z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7 10.1a16 16 0 0 0 6 6l1.9-1.9a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 1.9z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6zM18 12h.01"/>',
  wifi: '<path d="M5 12.5a11 11 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19h.01"/><path d="M2 9a16 16 0 0 1 20 0"/>',
};

let state;
let screen = "orders";
let modal = null;
let draft = null;
let menuFilter = "all";
let teamFilter = "all";
let audioContext = null;
let installPrompt = null;
const OPERATING_MODES = [
  { id: "orders", label: "Caja", icon: "wallet", roles: ["owner", "cashier", "waiter", "delivery"] },
  { id: "kitchen", label: "Cocina", icon: "chef", roles: ["owner", "cashier", "kitchen"] },
];

function icon(name, extraClass = "") {
  return `<span class="icon ${extraClass}" aria-hidden="true"><svg viewBox="0 0 24 24">${iconPaths[name] || iconPaths.sparkles}</svg></span>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function localId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function businessDate(value = new Date()) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(value);
}

function clockTime(value) {
  return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatTimestamp(value) {
  return `${businessDate(new Date(value))} · ${clockTime(value)}`;
}

function getTeamMember(id) {
  return state.team.find((member) => member.id === id);
}

function todayOrders() {
  const today = todayKey();
  return state.orders.filter((order) => order.date === today);
}

function notify(message, kind = "success", duration = 3200) {
  const container = document.querySelector("#toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.textContent = message;
  container.append(toast);
  window.setTimeout(() => toast.remove(), duration);
}

function persist(mutator, successMessage) {
  const next = JSON.parse(JSON.stringify(state));
  try {
    mutator(next);
    saveState(next);
  } catch (error) {
    console.error("No se pudieron guardar los cambios locales.", error);
    notify(`No se guardaron los cambios: ${error.message || "el almacenamiento no está disponible"}.`, "error", 6000);
    return false;
  }
  state = next;
  render();
  if (successMessage) notify(successMessage);
  return true;
}

function hasActiveRole(...roles) {
  return roles.includes(state.activeRole);
}

function allowedScreen(page) {
  const navigation = NAVIGATION.find((item) => item.id === page);
  return navigation && navigation.roles.includes(state.activeRole);
}

function unreadKitchenOrders() {
  return todayOrders().filter((order) => order.status === "new").length;
}

function navigationLink(item, mobile = false) {
  const badge = item.id === "kitchen" && unreadKitchenOrders()
    ? `<span class="nav-count">${unreadKitchenOrders()}</span>`
    : "";
  return `<a class="nav-link ${screen === item.id ? "active" : ""}" href="#${item.id}" data-nav="${item.id}" ${screen === item.id ? 'aria-current="page"' : ""}>${icon(item.icon)}<span>${esc(item.label)}</span>${badge}</a>`;
}

function banner() {
  return `<div class="demo-banner">${icon("alert")}<span><strong>Modo de demostración.</strong> Los datos se guardan solo en este navegador: todavía no hay cuentas seguras ni sincronización entre dispositivos. No introduzcas información real de clientes.</span></div>`;
}

function renderModalLayer() {
  if (!modal) return "";
  const content = modal.content();
  return `<div class="modal-backdrop" data-action="backdrop">
    <section class="modal ${modal.wide ? "wide" : ""} ${modal.kind === "kitchen-order" ? "kitchen-order-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-head"><div><h2 id="modal-title">${esc(modal.title)}</h2>${modal.description ? `<p>${esc(modal.description)}</p>` : ""}</div><button class="icon-button" type="button" data-action="close-modal" aria-label="Cerrar">${icon("close")}</button></header>
      <div class="modal-body">${content.body}</div>
      ${content.footer ? `<footer class="modal-footer">${content.footer}</footer>` : ""}
    </section>
    ${content.overlay || ""}
  </div>`;
}

function frame(pageContent) {
  const navItems = OPERATING_MODES.filter((item) => item.roles.includes(state.activeRole));
  const title = OPERATING_MODES.find((item) => item.id === screen)?.label || (screen === "settings" ? "Ajustes" : state.settings.businessName);
  const online = navigator.onLine;
  const compactCash = screen === "orders" && state.activeRole !== "delivery";
  const session = activeCashSession(state);
  const cashAction = compactCash && hasActiveRole("owner", "cashier")
    ? button(session ? "close-cash" : "open-cash", session ? "Cerrar caja" : "Abrir caja", { kind: "soft", icon: "wallet", extra: "small-button cash-header-action" })
    : "";
  return `<div class="app-shell ${screen === "kitchen" ? "kitchen-mode" : ""} ${compactCash ? "cash-entry-mode" : ""}">
    <aside class="sidebar">
      <a class="brand" href="#orders" data-nav="orders">
        <span class="brand-mark"><img src="./assets/pizza.svg" alt="" /></span>
        <span class="brand-copy"><strong>${esc(state.settings.businessName)}</strong><span>Gestión diaria</span></span>
      </a>
      <div class="nav-label">MODOS</div>
      <nav class="nav-list" aria-label="Modos de trabajo">${navItems.map((item) => navigationLink(item)).join("")}</nav>
      <div class="sidebar-spacer"></div>
      <div class="offline-card">
        <strong><span class="online-dot"></span> ${online ? "Almacenamiento local" : "Sin conexión"}</strong>
        <p>Los cambios quedan en este dispositivo. La cocina de otro celular no los recibe.</p>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar ${compactCash ? "cash-topbar" : ""}">
        ${compactCash
          ? `<time class="cash-date">${businessDate()}</time>`
          : `<div class="topbar-title"><strong>${esc(title)}</strong><span>${esc(state.settings.businessName)} · ${businessDate()}</span></div>`}
        <div class="topbar-actions">${compactCash ? cashAction : `<span class="clock" id="clock"></span><span class="connection-pill"><span class="online-dot"></span>${online ? "Modo local" : "Sin conexión"}</span>`}
          ${state.activeRole === "owner" ? `<button class="icon-button" type="button" data-action="navigate:settings" title="Ajustes" aria-label="Ajustes">${icon("settings")}</button>` : ""}
          ${installPrompt ? '<button class="button primary small-button" type="button" data-action="install-pwa">Instalar</button>' : ""}
        </div>
      </header>
      ${compactCash ? "" : banner()}
      <section class="page-content">${pageContent}</section>
    </main>
    <nav class="mobile-menu" aria-label="Navegación principal">${navItems.map((item) => navigationLink(item, true)).join("")}</nav>
    ${renderModalLayer()}
    <div id="toast-container" class="toast-container" aria-live="polite" aria-atomic="false"></div>
  </div>`;
}

function pageHeading(eyebrow, title, description, actions = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}

function button(action, label, options = {}) {
  const kind = options.kind || "";
  const extra = options.extra || "";
  const buttonIcon = options.icon ? icon(options.icon) : "";
  const type = options.type || "button";
  const title = options.title ? ` title="${esc(options.title)}"` : "";
  return `<button type="${type}" class="button ${kind} ${extra}" data-action="${esc(action)}"${options.data || ""}${title}>${buttonIcon}${esc(label)}</button>`;
}

function badge(text, status) {
  return `<span class="badge ${esc(status)}">${esc(text)}</span>`;
}

function statusMeta(status) {
  return {
    new: ["Nuevo", "new"],
    preparing: ["En preparación", "preparing"],
    ready: ["Listo", "ready"],
    delivered: ["Entregado", "delivered"],
  }[status] || ["Sin estado", "off"];
}

function channelLabel(channel) {
  return { dinein: "En mesa", pickup: "Para llevar", delivery: "Delivery" }[channel] || channel;
}

function orderDisplayId(order) {
  return `#${String(order.number).padStart(3, "0")}`;
}

function emptyState(message, description, name = "receipt") {
  return `<div class="empty-state"><span class="empty-state-icon">${icon(name)}</span><strong>${esc(message)}</strong><p>${esc(description)}</p></div>`;
}

function getOrderItemSummary(order) {
  const counts = new Map();
  for (const item of order.items) {
    const key = `${item.name}${item.variant ? ` · ${item.variant}` : ""}`;
    counts.set(key, (counts.get(key) || 0) + item.quantity);
  }
  return [...counts.entries()].map(([name, quantity]) => `${quantity}× ${name}`).join(", ");
}

function recentOrderRow(order) {
  const [statusText, statusClass] = statusMeta(order.status);
  return `<div class="activity-row">
    <span class="order-dot">${icon(order.channel === "delivery" ? "bike" : order.channel === "dinein" ? "table" : "store")}</span>
    <span class="activity-main"><strong>${esc(orderDisplayId(order))} · ${esc(order.customerName || channelLabel(order.channel))}</strong><span>${esc(channelLabel(order.channel))} · ${esc(getOrderItemSummary(order))}</span></span>
    <span class="activity-price">${formatMoney(orderTotal(order), state.settings.currency)}<span>${clockTime(order.createdAt)} · ${esc(statusText)}</span></span>
  </div>`;
}

function renderHome() {
  const orders = todayOrders();
  const notReady = orders.filter((order) => order.status === "new" || order.status === "preparing");
  const paidToday = orders.filter((order) => order.payment?.paidAt);
  const totalToday = paidToday.reduce((sum, order) => sum + orderTotal(order), 0);
  const currentCash = activeCashSession(state);
  const canSeeSales = hasActiveRole("owner", "cashier");
  const nextOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const actions = [
    { title: "Nuevo pedido", subtitle: "Tomar una comanda", icon: "plus", action: "new-order", allowed: hasActiveRole("owner", "cashier", "waiter") },
    { title: "Ver cocina", subtitle: `${notReady.length} ${notReady.length === 1 ? "pedido pendiente" : "pedidos pendientes"}`, icon: "chef", action: "navigate:kitchen", allowed: hasActiveRole("owner", "cashier", "kitchen") },
    { title: "Abrir caja", subtitle: currentCash ? "La caja está abierta" : "Registrar monto inicial", icon: "wallet", action: "open-cash", allowed: canSeeSales && !currentCash },
    { title: "Ver mesas", subtitle: `${state.tables.length} mesas`, icon: "table", action: "navigate:tables", allowed: hasActiveRole("owner", "cashier", "waiter") },
  ].filter((item) => item.allowed);
  const cashSummary = canSeeSales
    ? `<section class="cash-callout"><div><strong>${currentCash ? "Caja abierta" : "Caja sin abrir"}</strong><p>${currentCash ? `Apertura ${clockTime(currentCash.openedAt)} · Las ventas se controlan desde Caja.` : "Abre el turno en Caja antes de registrar un pago."}</p></div>${button(currentCash ? "navigate:cash" : "open-cash", currentCash ? "Ver caja" : "Abrir caja", { kind: "soft", extra: "small-button", icon: "wallet" })}</section>`
    : "";
  return `${pageHeading("LA PIZZERÍA, DE UN VISTAZO", "Buen día", "Un espacio simple para coordinar el salón, la cocina y cada pedido.", hasActiveRole("owner", "cashier", "waiter") ? button("new-order", "Nuevo pedido", { kind: "primary", icon: "plus" }) : "")}
    ${cashSummary}
    <div class="metric-grid">
      <article class="card metric-card"><div class="metric-head"><span>Pedidos de hoy</span><span class="metric-icon">${icon("receipt")}</span></div><div class="metric-value">${orders.length}</div><div class="metric-foot">${notReady.length} ${notReady.length === 1 ? "en espera o cocina" : "en espera o cocina"}</div></article>
      <article class="card metric-card"><div class="metric-head"><span>Por preparar</span><span class="metric-icon">${icon("chef")}</span></div><div class="metric-value">${notReady.length}</div><div class="metric-foot">${orders.filter((order) => order.status === "ready").length} ${orders.filter((order) => order.status === "ready").length === 1 ? "pedido listo" : "pedidos listos"}</div></article>
      ${canSeeSales ? `<article class="card metric-card"><div class="metric-head"><span>Ventas registradas</span><span class="metric-icon">${icon("wallet")}</span></div><div class="metric-value">${formatMoney(totalToday, state.settings.currency)}</div><div class="metric-foot">${paidToday.length} ${paidToday.length === 1 ? "pago anotado" : "pagos anotados"} · no es un reporte contable</div></article>` : ""}
      <article class="card metric-card"><div class="metric-head"><span>Mesas ocupadas</span><span class="metric-icon">${icon("table")}</span></div><div class="metric-value">${occupiedTables().length} / ${state.tables.length}</div><div class="metric-foot">${Math.max(0, state.tables.length - occupiedTables().length)} mesas disponibles</div></article>
    </div>
    <div class="split-grid" style="margin-top:15px">
      <section class="card panel">
        <div class="panel-title"><h2>Actividad reciente</h2><a href="#orders" data-nav="orders">Ver pedidos</a></div>
        <div class="activity-list">${nextOrders.length ? nextOrders.map(recentOrderRow).join("") : emptyState("Todo listo por aquí", "Cuando entre el primer pedido, su estado aparecerá en este espacio.")}</div>
      </section>
      <section class="card panel">
        <div class="panel-title"><h2>Accesos rápidos</h2></div>
        <div class="quick-grid">${actions.map((item) => `<button type="button" class="quick-card" data-action="${esc(item.action)}"><span class="quick-card-icon">${icon(item.icon)}</span><span><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></span></button>`).join("")}</div>
      </section>
    </div>`;
}

function orderCard(order) {
  const [statusText, statusClass] = statusMeta(order.status);
  const paid = Boolean(order.payment?.paidAt);
  const createdBy = getTeamMember(order.createdBy);
  const assigned = getTeamMember(order.deliveryPersonId);
  const role = state.activeRole;
  const canPrepare = hasActiveRole("owner", "cashier", "kitchen");
  const canDeliver = role === "delivery"
    ? order.channel === "delivery" && order.status === "ready" && (!order.deliveryPersonId || order.deliveryPersonId === state.activeMemberId)
    : hasActiveRole("owner", "cashier", "waiter") && order.status === "ready" && order.channel !== "delivery";
  const canTakeDelivery = role === "delivery" && order.channel === "delivery" && order.status !== "delivered" && !order.deliveryPersonId;
  const canPay = hasActiveRole("owner", "cashier") && !paid && order.status !== "new" && order.status !== "preparing";
  const canAssign = order.channel === "delivery" && order.status !== "delivered" && hasActiveRole("owner", "cashier", "waiter") && !order.deliveryPersonId;
  const canUpdate = (order.status === "new" && canPrepare) || (order.status === "preparing" && canPrepare) || canDeliver || canTakeDelivery || canPay || canAssign;
  const actionButtons = [
    order.status === "new" && canPrepare ? button(`start-order:${order.id}`, "Empezar", { kind: "soft", extra: "small-button" }) : "",
    order.status === "preparing" && canPrepare ? button(`ready-order:${order.id}`, "Marcar listo", { kind: "primary", extra: "small-button" }) : "",
    canDeliver ? button(`deliver-order:${order.id}`, role === "delivery" ? "Confirmar entrega" : "Entregar", { kind: "soft", extra: "small-button" }) : "",
    canPay ? button(`pay-order:${order.id}`, "Registrar pago", { kind: "soft", extra: "small-button", icon: "card" }) : "",
    canAssign ? button(`assign-order:${order.id}`, "Asignar repartidor", { extra: "small-button", icon: "bike" }) : "",
    canTakeDelivery ? button(`take-delivery:${order.id}`, "Tomar pedido", { kind: "primary", extra: "small-button" }) : "",
  ].filter(Boolean).join("");
  const items = order.items.map((item) => `<div class="order-item-line"><strong>${item.quantity}× ${esc(item.name)}${item.variant ? ` · ${esc(item.variant)}` : ""}${item.extras?.length ? `<span class="secondary-line">Extra: ${item.extras.map(esc).join(", ")}</span>` : ""}${item.notes ? `<span class="secondary-line">Nota: ${esc(item.notes)}</span>` : ""}</strong><span>${formatMoney(item.price * item.quantity, state.settings.currency)}</span></div>`).join("");
  return `<article class="order-card">
    <div class="order-card-head"><div><div class="order-id">${esc(orderDisplayId(order))}</div><div class="order-meta">${badge(statusText, statusClass)}${badge(channelLabel(order.channel), "type")}${badge(paid ? `Pagado · ${order.payment.method}` : order.paymentMethod ? `Pago previsto · ${order.paymentMethod}` : "Sin pago", paid ? "paid" : "unpaid")}</div></div><span class="ticket-age">${clockTime(order.createdAt)}</span></div>
    <div class="order-meta">${order.tableName ? badge(order.tableName, "type") : ""}<span class="small muted">${esc(order.customerName || "Sin nombre")}${order.phone ? ` · ${esc(order.phone)}` : ""}</span></div>
    <div class="order-items">${items}${order.channel === "delivery" && order.deliveryFee ? `<div class="order-item-line"><strong>Envío</strong><span>${formatMoney(order.deliveryFee, state.settings.currency)}</span></div>` : ""}</div>
    ${order.notes ? `<p class="order-notes">${icon("note")} ${esc(order.notes)}</p>` : ""}
    ${order.channel === "delivery" ? `<p class="small muted">${assigned ? `Repartidor: ${esc(assigned.name)}` : "Pendiente de asignar repartidor"}${order.address ? ` · ${esc(order.address)}` : ""}</p>` : ""}
    <div class="order-card-foot"><span class="order-total"><strong>${formatMoney(orderTotal(order), state.settings.currency)}</strong><span>${createdBy ? `Tomó: ${esc(createdBy.name)}` : ""}${paid ? ` · ${esc(order.payment.method)}` : ""}</span></span><span class="order-actions">${canUpdate ? actionButtons : ""}</span></div>
  </article>`;
}

function renderOrders() {
  let orders = todayOrders();
  if (state.activeRole === "delivery") {
    orders = orders.filter((order) => order.channel === "delivery" && (!order.deliveryPersonId || order.deliveryPersonId === state.activeMemberId));
  } else if (state.activeRole === "waiter") {
    orders = orders.filter((order) => order.createdBy === state.activeMemberId || order.channel === "dinein");
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canCreateOrder = hasActiveRole("owner", "cashier", "waiter");
  if (!canCreateOrder) {
    return `${pageHeading("DELIVERY", "Entregas pendientes", "", "")}
      ${orders.length ? `<div class="order-grid">${orders.map(orderCard).join("")}</div>` : `<div class="card">${emptyState("No hay entregas pendientes", "Los pedidos asignados aparecerán aquí.")}</div>`}`;
  }
  return `<div class="orders-workspace ${orders.length ? "has-orders" : ""}">
      <button class="cash-new-order" type="button" data-action="new-order">
        <span class="cash-new-order-icon">${icon("plus")}</span>
        <span>Nuevo pedido</span>
      </button>
      ${orders.length ? `<section class="cash-orders-section">
        <div class="cash-orders-heading"><h2>Pedidos de hoy</h2><span>${orders.length}</span></div>
        <div class="order-grid">${orders.map(orderCard).join("")}</div>
      </section>` : ""}
    </div>`;
}

function kitchenTicket(order) {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000));
  const age = ageMinutes ? `Hace ${ageMinutes} min` : "Recién llegado";
  const [, statusClass] = statusMeta(order.status);
  const orderStyle = order.channel === "dinein" ? "for-table" : "to-go";
  const serviceLabel = order.channel === "dinein" ? "En mesa" : "Para llevar";
  const ticketChannel = order.channel === "dinein" ? (order.tableName || serviceLabel) : serviceLabel;
  const orderLabel = `${orderDisplayId(order)} · ${ticketChannel}`;
  return `<article class="kitchen-ticket ${orderStyle}">
    <button class="ticket-summary" type="button" data-action="view-kitchen-order:${esc(order.id)}" aria-label="Abrir ${esc(orderLabel)}">
      <span class="ticket-header"><strong>Pedido ${esc(orderDisplayId(order))}</strong><span class="ticket-age" title="${esc(formatTimestamp(order.createdAt))}">${esc(age)}</span></span>
      <span class="ticket-primary">
        <strong>Nueva orden</strong>
        <span class="ticket-location">${icon(order.channel === "delivery" ? "bike" : order.channel === "dinein" ? "table" : "store")}${esc(ticketChannel)}</span>
        ${order.channel === "delivery" ? `<span class="ticket-service-label">Delivery</span>` : ""}
      </span>
      <span class="ticket-summary-footer">${badge(statusMeta(order.status)[0], statusClass)}<span class="ticket-expand-label">Abrir orden ${icon("arrow")}</span></span>
    </button>
  </article>`;
}

function renderKitchen() {
  const all = todayOrders().filter((order) => order.status !== "delivered").sort((a, b) => {
    const priority = { new: 0, preparing: 1, ready: 2 };
    return priority[a.status] - priority[b.status] || a.createdAt.localeCompare(b.createdAt);
  });
  return `<div class="kitchen-grid">${all.length ? all.map(kitchenTicket).join("") : `<p class="kitchen-empty">No hay pedidos pendientes.</p>`}</div>`;
}

function kitchenOrderContent(orderId) {
  const order = state.orders.find((item) => item.id === orderId && item.status !== "delivered");
  if (!order) return { body: emptyState("Orden no disponible", "La comanda ya se completó o dejó de estar disponible."), footer: "" };
  const location = order.channel === "dinein"
    ? (order.tableName || "En mesa")
    : order.channel === "delivery" ? "Delivery" : "Para llevar";
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000));
  const age = ageMinutes ? `Hace ${ageMinutes} min` : "Recién llegada";
  const [statusText, statusClass] = statusMeta(order.status);
  const items = order.items.map((item) => `<article class="kitchen-modal-item">
    <div class="kitchen-modal-product"><span class="kitchen-modal-quantity">${item.quantity}×</span><div><h3>${esc(item.name)}</h3>${item.variant ? `<p>${esc(item.variant)}</p>` : ""}</div></div>
    ${item.extras?.length ? `<p class="kitchen-modal-note">+ ${item.extras.map(esc).join(", ")}</p>` : ""}
    ${item.notes ? `<p class="kitchen-modal-note">${icon("note")}${esc(item.notes)}</p>` : ""}
  </article>`).join("");
  const completeLabel = order.status === "ready" ? "Marcar como entregado" : "Completar pedido";
  const notes = order.notes ? `<p class="kitchen-modal-general-note">${icon("note")}${esc(order.notes)}</p>` : "";
  return {
    body: `<div class="kitchen-modal-order">
      <div class="kitchen-modal-meta">${badge(statusText, statusClass)}${badge(order.payment?.paidAt ? `Pago ${order.payment.method}` : order.paymentMethod ? `Pago previsto · ${order.paymentMethod}` : "Sin pagar", order.payment?.paidAt ? "paid" : "unpaid")}<span>${esc(age)}</span></div>
      <div class="kitchen-modal-items">${items}</div>
      ${notes}
    </div>`,
    footer: button(`complete-order:${order.id}`, completeLabel, { kind: "primary" }),
  };
}

function occupiedTables() {
  return state.tables.filter((table) => todayOrders().some((order) =>
    order.tableId === table.id && order.channel === "dinein" && order.status !== "delivered",
  ));
}

function renderTables() {
  const busy = occupiedTables();
  const freeCount = state.tables.length - busy.length;
  return `${pageHeading("SALÓN", "Mesas", `${freeCount} ${freeCount === 1 ? "mesa disponible" : "mesas disponibles"} · selecciona una mesa para iniciar una comanda.`, button("new-order", "Nuevo pedido", { kind: "primary", icon: "plus" }))}
    <div class="table-grid">${state.tables.map((table) => {
      const order = todayOrders().find((item) => item.tableId === table.id && item.channel === "dinein" && item.status !== "delivered");
      const isOccupied = Boolean(order);
      return `<button class="table-card ${isOccupied ? "occupied" : ""}" type="button" data-action="${isOccupied ? `view-order:${order.id}` : `new-table-order:${table.id}`}">
        <span class="table-shape">${icon("table")}</span><strong>${esc(table.name)}</strong><p>${table.seats} ${table.seats === 1 ? "asiento" : "asientos"}</p>
        ${isOccupied ? `${badge(`Ocupada · ${orderDisplayId(order)}`, "new")}<span class="secondary-line small">${formatMoney(orderTotal(order), state.settings.currency)}</span>` : badge("Disponible", "ready")}
      </button>`;
    }).join("")}</div>
    <section style="margin-top:20px" class="notice">${icon("alert")}<span>Este plano inicial tiene mesas de ejemplo. Puedes adaptar el número y la capacidad cuando confirmes la distribución real del salón.</span></section>`;
}

function methodTotals(transactions) {
  return createPaymentTotals(transactions, state.settings.paymentMethods);
}

function pricePills(product) {
  return product.variants.map((variant) => `<span class="price-label">${esc(variant.name)} · ${formatMoney(variant.price, state.settings.currency)}</span>`).join("");
}

function renderMenu() {
  if (!hasActiveRole("owner")) return `${pageHeading("MENÚ", "Acceso restringido", "Solo el dueño puede cambiar los productos y sus precios.")}`;
  const menu = state.menu.filter((product) => menuFilter === "all" || (menuFilter === "active" ? product.active : !product.active));
  const addProductButton = button("edit-product:new", "Agregar producto", { kind: "primary", icon: "plus" });
  return `${pageHeading("CARTA Y PRECIOS", "Menú", "Los precios y los productos de abajo son ejemplos. Cámbialos antes de tomar pedidos reales.", addProductButton)}
    <div class="filter-bar">${[["all", "Todos"], ["active", "Activos"], ["inactive", "Pausados"]].map(([id, label]) => `<button type="button" class="filter-chip ${menuFilter === id ? "selected" : ""}" data-action="filter-menu:${id}">${esc(label)}</button>`).join("")}<span class="small muted" style="margin-left:auto">${state.menu.filter((product) => product.active).length} productos activos</span></div>
    <div class="product-admin-grid">${menu.length ? menu.map((product) => `<article class="product-admin ${product.active ? "" : "inactive"}"><div class="product-admin-head"><span><strong>${esc(product.name)}</strong><small>${esc(product.category)}</small></span>${badge(product.active ? "Disponible" : "Pausado", product.active ? "ready" : "off")}</div><div class="product-prices">${pricePills(product)}</div><div class="product-admin-actions">${button(`edit-product:${product.id}`, "Editar", { extra: "small-button" })}${button(`toggle-product:${product.id}`, product.active ? "Pausar" : "Activar", { kind: product.active ? "" : "soft", extra: "small-button" })}</div></article>`).join("") : emptyState("No hay productos en este filtro", "Prueba otra categoría o agrega el primer producto.", "menu")}</div>
    <div class="notice" style="margin-top:16px">${icon("alert")}<span>Los montos iniciales y la moneda (USD) son solo ejemplos. Confirma la moneda y la carta reales antes de empezar a registrar ventas.</span></div>`;
}

function renderTeam() {
  if (!hasActiveRole("owner")) return `${pageHeading("EQUIPO", "Acceso restringido", "Solo el dueño puede administrar el listado de perfiles.")}`;
  const members = state.team.filter((member) => teamFilter === "all" || member.role === teamFilter);
  const roleFilter = [["all", "Todos"], ...Object.entries(ROLES).map(([id, label]) => [id, label])];
  return `${pageHeading("PERFILES PARA PROBAR LA INTERFAZ", "Equipo", "Los perfiles permiten previsualizar cada pantalla: no crean cuentas ni contraseñas seguras.", button("add-member", "Agregar perfil de prueba", { kind: "primary", icon: "plus" }))}
    <div class="filter-bar">${roleFilter.map(([id, label]) => `<button class="filter-chip ${teamFilter === id ? "selected" : ""}" type="button" data-action="filter-team:${esc(id)}">${esc(label)}</button>`).join("")}</div>
    <div class="two-column">${members.map((member) => `<article class="role-card"><span class="avatar">${esc(initials(member.name))}</span><span class="role-card-main"><strong>${esc(member.name)}</strong><span>${esc(ROLES[member.role] || "Sin rol")} · rol simulado</span></span>${member.id === state.activeMemberId ? badge("Activo ahora", "preparing") : button(`switch-member:${member.id}`, "Vista previa", { extra: "small-button" })}${member.id.startsWith("staff-") && !["staff-owner", "staff-cashier", "staff-waiter", "staff-kitchen", "staff-delivery"].includes(member.id) ? `<button class="icon-button" type="button" data-action="remove-member:${esc(member.id)}" aria-label="Eliminar perfil">${icon("close")}</button>` : ""}</article>`).join("") || `<div class="card">${emptyState("Sin perfiles en este filtro", "Elige otro rol.")}</div>`}</div>
    <div class="notice" style="margin-top:16px">${icon("alert")}<span><strong>Antes de producción:</strong> cada persona necesitará una cuenta real protegida y permisos validados por el servidor.</span></div>`;
}

function renderSettings() {
  if (!hasActiveRole("owner")) return `${pageHeading("AJUSTES", "Acceso restringido", "Solo el dueño puede modificar las preferencias del proyecto.")}`;
  const methods = ["Efectivo", "QR"];
  return `${pageHeading("PREFERENCIAS DEL LOCAL", "Ajustes", "Define los datos de ejemplo para adaptar la prueba a tu pizzería.", "")}
    <div class="two-column">
      <section class="card panel"><div class="panel-title"><h2>Negocio y caja</h2></div>
        <form id="settings-form" data-form="settings" class="form-stack">
          <div class="form-field"><label for="business-name">Nombre del local</label><input id="business-name" class="form-control" name="businessName" maxlength="60" required value="${esc(state.settings.businessName)}"></div>
          <div class="form-grid"><div class="form-field"><label for="currency">Moneda</label><select id="currency" name="currency" class="form-select" required>${["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "CRC", "UYU", "GTQ"].map((currency) => `<option value="${currency}" ${state.settings.currency === currency ? "selected" : ""}>${currency}</option>`).join("")}</select><span class="field-hint">Solo cambia cómo se muestran los importes; revisa y actualiza cada precio del menú.</span></div>
          <div class="form-field"><label for="delivery-fee">Costo de envío</label><input id="delivery-fee" class="form-control" type="number" min="0" step="0.01" name="deliveryFee" required value="${Number(state.settings.deliveryFee || 0)}"></div></div>
          <div class="form-field"><label>Medios de pago disponibles</label><div class="method-grid">${methods.map((method) => `<label class="method-check"><input type="checkbox" name="paymentMethods" value="${method}" ${state.settings.paymentMethods.includes(method) ? "checked" : ""}>${method}</label>`).join("")}</div><span class="field-hint">Selecciona al menos uno. La aplicación no procesa pagos reales.</span></div>
          <div class="form-field"><label for="extras-list">Extras de pizza</label><textarea id="extras-list" class="form-textarea" name="extrasText" maxlength="500" placeholder="Mozzarella extra | 1.50&#10;Aceitunas | 0.75">${state.settings.extras.map((extra) => `${esc(extra.name)} | ${extra.price}`).join("\n")}</textarea><span class="field-hint">Una línea por extra, con el formato Nombre | precio. Usa precios positivos y la moneda elegida arriba.</span></div>
          <div class="form-footer"><button class="button primary" type="submit">Guardar ajustes</button></div>
        </form>
      </section>
      <section class="card panel"><div class="panel-title"><h2>Tus datos locales</h2></div>
        <div class="notice">${icon("alert")}<span>Los pedidos, clientes de prueba, perfiles y cierres quedan en este navegador. Si limpias el almacenamiento del sitio, puedes perderlos.</span></div>
        <p class="small muted" style="line-height:1.7">Exporta una copia antes de probar. El archivo de respaldo puede contener datos personales: guárdalo solo en un lugar privado y no lo envíes por chat o correo.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px">${button("export-data", "Descargar respaldo", { kind: "soft", icon: "download" })}<button class="button" type="button" data-action="import-data-trigger">${icon("upload")}Importar respaldo</button><input id="import-file" class="sr-only" type="file" accept="application/json,.json" aria-label="Seleccionar respaldo de Il Mundo"></div>
        <div class="divider" style="margin:17px 0"></div>
        <strong class="small">Disponibilidad sin conexión</strong><p class="small muted" style="line-height:1.6">El menú y esta interfaz pueden abrirse sin internet una vez cargados. Los cambios no se sincronizan con otros dispositivos ni con otros turnos.</p>
        <div class="divider" style="margin:17px 0"></div>
        <strong class="small">Borrar los datos de demostración</strong><p class="small muted" style="line-height:1.6">Descarga antes un respaldo. Esta acción eliminará los pedidos, cobros y ajustes guardados en este navegador.</p>
        <button class="button danger small-button" type="button" style="margin-top:6px" data-action="reset-data">Restaurar datos de ejemplo</button>
      </section>
    </div>
    <div class="section-heading"><h2>Próximas decisiones del plan</h2></div>
    <section class="card panel"><div class="stat-row"><span>Alcance inicial</span><strong>Un local · celular, mostrador y salón</strong></div><div class="stat-row"><span>Autenticación y sincronización</span><strong>Servidor seguro y usuarios reales</strong></div><div class="stat-row"><span>Venta digital y facturación</span><strong>Fuera de la primera versión</strong></div><div class="stat-row"><span>Costos e inventario avanzado</span><strong>Fases siguientes del plan</strong></div><p class="small muted" style="line-height:1.65;margin:12px 0 0">Esta primera versión es una prueba local de los flujos del MVP. No conecta Supabase, no cuenta con integración de pagos y no sustituye al software de caja en producción.</p></section>`;
}

function orderCartTotal() {
  return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
    (draft.channel === "delivery" ? Number(state.settings.deliveryFee || 0) : 0);
}

function selectableVariants(product) {
  if (product.category === "Pizzas") {
    return product.variants.filter((variant) => ["Mediana", "Grande"].includes(variant.name));
  }
  if (product.category === "Bebidas") return product.variants.slice(0, 1);
  return product.variants;
}

function defaultOrderVariant(product) {
  const variants = selectableVariants(product);
  return product.category === "Pizzas"
    ? variants.find((variant) => variant.name === "Mediana") || variants[0]
    : variants[0];
}

function menuChoiceDialog() {
  if (!draft?.selectedProductId) return "";
  const product = state.menu.find((item) => item.id === draft.selectedProductId && item.active);
  if (!product) return "";
  const variants = selectableVariants(product);
  const variant = variants.find((item) => item.name === draft.selectedVariants[product.id]) || defaultOrderVariant(product);
  const selected = variant?.name;
  const isDrink = product.category === "Bebidas";
  const variantOptions = isDrink
    ? `<div class="unit-choice">${formatMoney(variant?.price, state.settings.currency)} <span>por unidad</span></div>`
    : variants.length
      ? `<div class="menu-variants" aria-label="${product.category === "Pizzas" ? "Tamaño" : "Presentación"} de ${esc(product.name)}">${variants.map((option) => `<button type="button" class="menu-variant ${option.name === selected ? "selected" : ""}" data-action="select-variant:${encodeURIComponent(product.id)}:${encodeURIComponent(option.name)}" aria-pressed="${option.name === selected}"><span>${esc(option.name)}</span><strong>${formatMoney(option.price, state.settings.currency)}</strong></button>`).join("")}</div>`
      : `<p class="small muted">Este producto no tiene ${product.category === "Pizzas" ? "precio para tamaño mediano o grande" : "una presentación disponible"}. Actualiza sus precios en Menú.</p>`;
  const extras = draft.channel !== "dinein" && product.category === "Pizzas" && state.settings.extras.length
    ? `<div class="menu-picker-extras"><span>Extras</span>${state.settings.extras.map((extra) => `<label><input type="checkbox" data-order-extra="${esc(product.id)}" data-focus="extra-${esc(product.id)}-${esc(extra.id)}" value="${esc(extra.id)}" ${draft.selectedExtras[product.id]?.includes(extra.id) ? "checked" : ""}>${esc(extra.name)}</label>`).join("")}</div>`
    : "";
  const itemNote = draft.channel !== "dinein"
    ? `<input class="form-control menu-picker-note" aria-label="Nota para cocina: ${esc(product.name)}" type="text" maxlength="100" placeholder="Nota opcional" data-order-note="${esc(product.id)}" value="${esc(draft.itemNotes[product.id] || "")}">`
    : "";
  const selectedQuantity = draft.selectedQuantities[product.id] || 1;
  return `<div class="menu-choice-backdrop">
    <section class="menu-choice-dialog" role="group" aria-label="Opciones de ${esc(product.name)}">
      <div class="menu-choice-head"><div><span>${esc(product.category)}</span><h3>${esc(product.name)}</h3></div><button type="button" class="icon-button" data-action="close-product-choice" aria-label="Cerrar">${icon("close")}</button></div>
      ${isDrink ? `<p class="menu-choice-hint">Se agrega por unidad.</p>` : `<p class="menu-choice-hint">${product.category === "Pizzas" ? "Elige tamaño y cantidad." : "Elige presentación y cantidad."}</p>`}
      ${variantOptions}${extras}${itemNote}
      <div class="menu-picker-add-row"><span class="quantity-control menu-picker-quantity"><button type="button" data-action="selection-quantity:${encodeURIComponent(product.id)}:-1" aria-label="Quitar una unidad">−</button><strong>${selectedQuantity}</strong><button type="button" data-action="selection-quantity:${encodeURIComponent(product.id)}:1" aria-label="Sumar una unidad">+</button></span><button type="button" class="button primary menu-picker-add" data-action="add-item:${encodeURIComponent(product.id)}" ${variant ? "" : "disabled"}>Agregar ${selectedQuantity}</button></div>
    </section>
  </div>`;
}

function orderFormMenu() {
  const productsByCategory = ["Pizzas", "Bebidas"].map((category) => ({
    category,
    products: state.menu.filter((product) => product.active && product.category === category),
  }));
  const activeTables = new Map(occupiedTables().map((table) => [table.id, table]));
  const paymentMethods = state.settings.paymentMethods;
  const channelOptions = [
    ["dinein", "En mesa", "table"],
    ["pickup", "Para llevar", "store"],
  ];
  const productTiles = productsByCategory.map(({ category, products }) => `
    <section class="order-menu-category">
      <h4>${esc(category)}</h4>
      ${products.length
        ? `<div class="new-order-menu-list">${products.map((product) => {
          const variant = selectableVariants(product).find((item) => item.name === draft.selectedVariants[product.id]) || defaultOrderVariant(product);
          return `<article class="menu-picker">
            <button type="button" class="menu-picker-trigger" data-action="select-product:${encodeURIComponent(product.id)}" aria-haspopup="dialog" aria-expanded="${draft.selectedProductId === product.id}">
              <strong>${esc(product.name)}</strong><span>${variant ? formatMoney(variant.price, state.settings.currency) : "Sin precio disponible"}</span>
            </button>
          </article>`;
        }).join("")}</div>`
        : `<p class="small muted">No hay productos activos en esta categoría.</p>`}
    </section>`).join("");
  const cartHtml = draft.items.length
    ? draft.items.map((item, index) => `<div class="cart-line"><span class="cart-line-copy"><strong>${item.quantity}× ${esc(item.name)}${item.variant ? ` · ${esc(item.variant)}` : ""}</strong>${draft.channel !== "dinein" && [...item.extras, item.notes].filter(Boolean).length ? `<span>${[...item.extras, item.notes].filter(Boolean).map(esc).join(" · ")}</span>` : ""}</span><span class="quantity-control"><button type="button" data-action="cart-minus:${index}" aria-label="Quitar una unidad">−</button><strong>${item.quantity}</strong><button type="button" data-action="cart-plus:${index}" aria-label="Sumar una unidad">+</button></span></div>`).join("")
    : `<div class="cart-empty">Elige algo del menú para empezar.</div>`;
  return `<form id="new-order-form" class="new-order-form" data-form="new-order">
    <div class="wizard-section"><h3 class="wizard-section-title">Tipo de pedido</h3><div class="channel-select">${channelOptions.map(([value, label, iconName]) => `<span class="channel-option"><input type="radio" id="channel-${value}" name="channel" data-focus="channel-${value}" value="${value}" ${draft.channel === value ? "checked" : ""}><label for="channel-${value}">${icon(iconName)}${esc(label)}</label></span>`).join("")}</div></div>
    <div class="form-grid wizard-section">
      ${draft.channel === "dinein" ? `<div class="form-field"><label for="order-table">Mesa</label><select id="order-table" class="form-select" name="tableId" data-focus="order-table" required><option value="">Selecciona una mesa</option>${state.tables.map((table) => `<option value="${esc(table.id)}" ${table.id === draft.tableId ? "selected" : ""} ${activeTables.has(table.id) && table.id !== draft.tableId ? "disabled" : ""}>${esc(table.name)} · ${table.seats} asientos${activeTables.has(table.id) && table.id !== draft.tableId ? " · ocupada" : ""}</option>`).join("")}</select></div>` : `<div class="form-field"><label for="order-customer">Nombre del pedido</label><input id="order-customer" class="form-control" name="customerName" maxlength="70" required placeholder="Ej.: Andrea" value="${esc(draft.customerName)}"></div>`}
      ${draft.channel === "pickup" ? `<div class="form-field wide"><label for="order-notes">Nota para cocina (opcional)</label><input id="order-notes" class="form-control" name="notes" maxlength="200" placeholder="Por ejemplo: sin cebolla" value="${esc(draft.notes)}"></div>` : ""}
    </div>
    <div class="wizard-section">
      <div class="section-heading" style="margin:0 0 8px"><h3 class="wizard-section-title" style="margin:0">Carta</h3></div>
      ${productTiles}
    </div>
    <section class="cart-panel wizard-section"><h3>Comanda ${draft.items.length ? `· ${draft.items.reduce((sum, item) => sum + item.quantity, 0)} ${draft.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "producto" : "productos"}` : ""}</h3>
      <div class="cart-lines">${cartHtml}</div>
      <div class="cart-total"><span>Total estimado</span><span>${formatMoney(orderCartTotal(), state.settings.currency)}</span></div>
    </section>
    ${paymentMethods.length ? `<fieldset class="payment-method-field wizard-section"><legend>Medio de pago previsto</legend><div class="payment-options" role="radiogroup" aria-label="Medio de pago previsto">${paymentMethods.map((method, index) => `<span class="channel-option payment-option"><input type="radio" id="order-payment-${index}" name="paymentMethod" value="${esc(method)}" ${method === draft.paymentMethod ? "checked" : ""} required><label for="order-payment-${index}">${icon(method === "Efectivo" ? "wallet" : "card")}${esc(method)}</label></span>`).join("")}</div><span class="field-hint">El cobro se registra cuando se marque el pedido como pagado.</span></fieldset>` : `<div class="notice danger-note wizard-section">${icon("alert")}<span>Activa al menos un medio de pago en Ajustes para enviar este pedido.</span></div>`}
    ${!activeCashSession(state) ? `<div class="notice wizard-section">${icon("alert")}<span>Puedes guardar el pedido, pero tendrás que abrir Caja antes de registrar el cobro.</span></div>` : ""}
    <span id="order-form-live" class="sr-only" aria-live="polite"></span>
  </form>`;
}

function menuEditorForm(product) {
  const category = product?.category || "Pizzas";
  const variants = category === "Bebidas"
    ? [{ name: "Unidad", price: product?.variants[0]?.price ?? "" }]
    : product?.variants || [{ name: "Personal", price: "" }, { name: "Mediana", price: "" }, { name: "Grande", price: "" }];
  return `<form id="product-form" data-form="product">
    <input type="hidden" name="id" value="${esc(product?.id || "")}">
    <div class="form-stack">
      <div class="form-field"><label for="product-name">Nombre del producto</label><input id="product-name" class="form-control" name="name" maxlength="55" required placeholder="Ej.: Pizza napolitana" value="${esc(product?.name || "")}"></div>
      <div class="form-field"><label for="product-category">Categoría</label><select id="product-category" class="form-select" name="category" required><option value="Pizzas" ${category === "Pizzas" ? "selected" : ""}>Pizzas</option><option value="Bebidas" ${category === "Bebidas" ? "selected" : ""}>Bebidas</option><option value="Postres" ${category === "Postres" ? "selected" : ""}>Postres</option></select></div>
      <div class="product-variants-grid">${[0, 1, 2].map((index) => `<div class="product-variant-row" data-variant-row="${index}" ${category === "Bebidas" && index > 0 ? "hidden" : ""}><div class="form-field"><label for="variant-name-${index}">${index === 0 ? category === "Bebidas" ? "Presentación" : "Variante principal" : `Variante ${index + 1} (opcional)`}</label><input id="variant-name-${index}" class="form-control" name="variantName${index + 1}" maxlength="30" ${index === 0 ? "required" : ""} ${category === "Bebidas" && index === 0 ? "readonly" : ""} placeholder="${index === 0 ? "Ej.: Personal" : "Ej.: Mediana"}" value="${esc(variants[index]?.name || "")}"></div><div class="form-field"><label for="variant-price-${index}">${index === 0 && category === "Bebidas" ? "Precio por unidad" : `Precio${index === 0 ? " principal" : ` ${index + 1}`}`}</label><input id="variant-price-${index}" class="form-control" name="variantPrice${index + 1}" type="number" min="0.01" step="0.01" ${index === 0 ? "required" : ""} placeholder="0.00" value="${variants[index]?.price ?? ""}"></div></div>`).join("")}</div>
      <label class="checkbox-row"><input type="checkbox" name="active" ${product?.active === false ? "" : "checked"}>Disponible para pedidos</label>
    </div>
    <div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">Guardar producto</button></div>
  </form>`;
}

function modalContent(current) {
  switch (current.kind) {
    case "kitchen-order":
      return kitchenOrderContent(current.data.orderId);
    case "new-order":
      return {
        body: orderFormMenu(),
        overlay: menuChoiceDialog(),
        footer: `<button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit" form="new-order-form" ${draft.items.length && state.settings.paymentMethods.includes(draft.paymentMethod) ? "" : "disabled"}>${icon("receipt")}Enviar a cocina · ${formatMoney(orderCartTotal(), state.settings.currency)}</button>`,
      };
    case "switch-role":
      return {
        body: `<p class="small muted" style="line-height:1.6">La identidad y los permisos que aparecen en pantalla son una simulación. No son cuentas de usuario reales.</p><div>${state.team.map((member) => `<button type="button" class="role-card" style="width:100%;text-align:left;cursor:pointer;margin-top:8px" data-action="switch-member:${esc(member.id)}"><span class="avatar">${esc(initials(member.name))}</span><span class="role-card-main"><strong>${esc(member.name)}</strong><span>${esc(ROLES[member.role])} · perfil de prueba</span></span>${member.id === state.activeMemberId ? badge("Actual", "preparing") : icon("arrow")}</button>`).join("")}</div>`,
        footer: `<button class="button" type="button" data-action="close-modal">Volver</button>`,
      };
    case "cash-open":
      return {
        body: `<form id="cash-form" data-form="cash-open"><div class="form-stack"><div class="notice">${icon("wallet")}<span>Anota el efectivo que hay en el cajón al inicio del turno. Para esta prueba es una referencia manual.</span></div><div class="form-field"><label for="opening-amount">Monto de apertura</label><input id="opening-amount" class="form-control" type="number" name="amount" min="0" step="0.01" required placeholder="0.00" value="0"></div></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">${icon("check")}Abrir caja</button></div></form>`,
        footer: "",
      };
    case "cash-close": {
      const session = activeCashSession(state);
      const totals = methodTotals(session?.transactions || []);
      const cash = totals.Efectivo || 0;
      const qr = totals.QR || 0;
      const totalGenerated = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
      const expected = Number(session?.openingAmount || 0) + cash;
      const otherTotals = Object.entries(totals)
        .filter(([method, amount]) => !["Efectivo", "QR"].includes(method) && amount > 0)
        .map(([method, amount]) => `<div class="stat-row"><span>${esc(method)} (anterior)</span><strong>${formatMoney(amount, state.settings.currency)}</strong></div>`)
        .join("");
      return {
        body: `<form id="close-cash-form" data-form="cash-close"><div class="form-stack"><div class="notice">${icon("alert")}<span>Se registran los cobros completos anotados en esta caja. Cuenta el efectivo real antes de cerrar.</span></div><section class="cash-close-summary"><div class="stat-row total"><span>Total generado</span><strong>${formatMoney(totalGenerated, state.settings.currency)}</strong></div><div class="stat-row"><span>Efectivo</span><strong>${formatMoney(cash, state.settings.currency)}</strong></div><div class="stat-row"><span>QR</span><strong>${formatMoney(qr, state.settings.currency)}</strong></div>${otherTotals}</section><div class="form-field"><label for="counted-amount">Efectivo contado al cierre</label><input id="counted-amount" class="form-control" type="number" name="amount" min="0" step="0.01" required placeholder="0.00"></div><p class="small muted">Efectivo esperado en caja (incluye la apertura): <strong>${formatMoney(expected, state.settings.currency)}</strong> · la diferencia se calculará al guardar.</p><div class="form-field"><label for="close-notes">Observación (opcional)</label><textarea class="form-textarea" id="close-notes" name="notes" maxlength="250" placeholder="Comentario del cierre"></textarea></div></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">${icon("check")}Cerrar turno</button></div></form>`,
        footer: "",
      };
    }
    case "payment": {
      const order = state.orders.find((item) => item.id === current.data.orderId);
      if (!order) return { body: emptyState("No encontramos la comanda", "Vuelve a cargar los pedidos."), footer: "" };
      const methods = ["Efectivo", "QR"].filter((method) => state.settings.paymentMethods.includes(method));
      return {
        body: `<form id="payment-form" data-form="payment"><input type="hidden" name="orderId" value="${esc(order.id)}"><div class="form-stack"><div class="cash-status"><div class="cash-status-details"><span class="cash-status-icon">${icon("receipt")}</span><div><strong>${esc(orderDisplayId(order))} · ${esc(order.customerName || channelLabel(order.channel))}</strong><p>${esc(getOrderItemSummary(order))}</p></div></div><strong>${formatMoney(orderTotal(order), state.settings.currency)}</strong></div>${activeCashSession(state) ? "" : `<div class="notice danger-note">${icon("alert")}<span>No hay una caja abierta. Abre Caja para registrar este cobro.</span></div>`}${methods.length ? `<div class="form-field"><label for="payment-method">Medio de pago</label><select id="payment-method" name="method" class="form-select" required>${methods.map((method) => `<option value="${esc(method)}" ${method === order.paymentMethod ? "selected" : ""}>${esc(method)}</option>`).join("")}</select></div>` : `<div class="notice danger-note">${icon("alert")}<span>Habilita Efectivo o QR en Ajustes para registrar el pago.</span></div>`}</div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit" ${activeCashSession(state) && methods.length ? "" : "disabled"}>Registrar ${formatMoney(orderTotal(order), state.settings.currency)}</button></div></form>`,
        footer: "",
      };
    }
    case "product-edit":
      return { body: menuEditorForm(current.data.product), footer: "" };
    case "team-add":
      return {
        body: `<form id="member-form" data-form="member"><div class="form-stack"><div class="form-field"><label for="member-name">Nombre para mostrar en la demostración</label><input class="form-control" id="member-name" name="name" required maxlength="60" placeholder="Ej.: Alex"></div><div class="form-field"><label for="member-role">Rol simulado</label><select class="form-select" id="member-role" name="role" required>${Object.entries(ROLES).map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join("")}</select></div><p class="small muted">Esto agrega un perfil de muestra para probar pantallas. No crea un inicio de sesión ni controla dispositivos distintos.</p></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">Agregar perfil</button></div></form>`,
        footer: "",
      };
    case "assign-delivery":
      return {
        body: `<form id="assign-form" data-form="assign-delivery"><input type="hidden" name="orderId" value="${esc(current.data.orderId)}"><div class="form-field"><label for="delivery-person">Repartidor</label><select id="delivery-person" name="deliveryPersonId" class="form-select" required><option value="">Selecciona un perfil</option>${current.data.couriers.map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join("")}</select><span class="field-hint">La asignación se guarda solo en este navegador.</span></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">Asignar pedido</button></div></form>`,
        footer: "",
      };
    case "confirm":
      return {
        body: `<p style="font-size:12px;line-height:1.7">${esc(current.data.description)}</p>`,
        footer: `<button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button ${current.data.danger === false ? "primary" : "danger"}" type="button" data-action="confirm:${esc(current.data.action)}">${esc(current.data.label)}</button>`,
      };
    default:
      return { body: emptyState("No se pudo abrir esta ventana", "Cierra e inténtalo de nuevo."), footer: "" };
  }
}

function openModal(kind, options = {}) {
  modal = {
    kind,
    title: options.title || ({
      "new-order": "Nuevo pedido",
      "switch-role": "Vista previa de un perfil",
      "cash-open": "Abrir caja",
      "cash-close": "Cerrar caja",
      payment: "Registrar un pago",
      "assign-delivery": "Asignar repartidor",
      "product-edit": options.product ? "Editar producto" : "Agregar producto",
      "team-add": "Agregar un perfil de prueba",
      confirm: options.title || "Confirmar acción",
    }[kind] || "Detalle"),
    description: options.description || ({
      "new-order": "Elige los productos y sus detalles. El pedido quedará guardado en este dispositivo.",
      payment: "Anota el pago recibido en esta caja abierta.",
      "product-edit": "Los nombres y precios que aparecen aquí son ejemplos.",
    }[kind] || ""),
    data: options,
    wide: options.wide ?? kind === "new-order",
    content: () => modalContent(modal),
  };
  render();
  window.setTimeout(() => {
    const focusTarget = document.querySelector(".menu-choice-dialog button:not([disabled]), .modal input:not([type=hidden]), .modal select, .modal button");
    focusTarget?.focus({ preventScroll: true });
  }, 30);
}

function startNewOrder(options = {}) {
  if (!hasActiveRole("owner", "cashier", "waiter")) {
    notify("Este perfil no puede crear pedidos.", "error");
    return;
  }
  draft = {
    channel: options.channel || "dinein",
    tableId: options.tableId || "",
    customerName: "",
    phone: "",
    address: "",
    notes: "",
    paymentMethod: state.settings.paymentMethods[0] || "",
    search: "",
    category: "all",
    items: [],
    selectedProductId: "",
    selectedQuantities: {},
    selectedVariants: Object.fromEntries(state.menu.map((item) => [item.id, defaultOrderVariant(item)?.name])),
    selectedExtras: {},
    itemNotes: {},
  };
  openModal("new-order", { wide: true });
}

function captureDraftForm() {
  const form = document.querySelector("#new-order-form");
  if (!form || !draft) return;
  const fields = new FormData(form);
  draft.channel = String(fields.get("channel") || draft.channel);
  draft.tableId = String(fields.get("tableId") || draft.tableId || "");
  draft.customerName = String(fields.get("customerName") || "");
  draft.phone = String(fields.get("phone") || "");
  draft.address = String(fields.get("address") || "");
  draft.notes = String(fields.get("notes") || "");
  draft.paymentMethod = String(fields.get("paymentMethod") || draft.paymentMethod || "");
}

function simplifyDineInDraft() {
  if (!draft || draft.channel !== "dinein") return;
  draft.customerName = "";
  draft.phone = "";
  draft.address = "";
  draft.notes = "";
  draft.selectedExtras = {};
  draft.itemNotes = {};
  draft.category = ["all", "Pizzas", "Bebidas"].includes(draft.category) ? draft.category : "all";
  draft.items = draft.items.map((item) => {
    const extrasPrice = (item.extras || []).reduce((sum, name) => {
      const extra = state.settings.extras.find((candidate) => candidate.name === name);
      return sum + Number(extra?.price || 0);
    }, 0);
    return { ...item, price: Math.max(0, item.price - extrasPrice), extras: [], notes: "" };
  });
}

function createOrder() {
  captureDraftForm();
  simplifyDineInDraft();
  if (!draft.items.length) {
    notify("Agrega al menos un producto antes de enviar el pedido.", "warning");
    return;
  }
  if (!state.settings.paymentMethods.includes(draft.paymentMethod)) {
    notify("Elige un medio de pago disponible en Ajustes.", "error");
    return;
  }
  if (draft.channel === "dinein" && (!draft.tableId || !state.tables.some((table) => table.id === draft.tableId))) {
    notify("Elige una mesa disponible para este pedido.", "error");
    return;
  }
  if (draft.channel === "pickup" && !draft.customerName.trim()) {
    notify("Indica un nombre para identificar el pedido para llevar.", "error");
    return;
  }
  const table = state.tables.find((item) => item.id === draft.tableId);
  const today = todayKey();
  const number = state.orders.filter((order) => order.date === today).length + 1;
  const order = {
    id: localId("order"),
    number,
    date: today,
    channel: draft.channel,
    tableId: table?.id || "",
    tableName: table?.name || "",
    customerName: draft.channel === "dinein" ? "" : draft.customerName.trim(),
    phone: "",
    address: "",
    deliveryFee: 0,
    notes: draft.channel === "dinein" ? "" : draft.notes.trim(),
    paymentMethod: draft.paymentMethod,
    items: draft.items,
    status: "new",
    createdAt: new Date().toISOString(),
    createdBy: state.activeMemberId,
    deliveryPersonId: "",
    payment: null,
  };
  const stored = persist((next) => {
    next.orders.push(order);
  });
  if (!stored) return;
  modal = null;
  draft = null;
  screen = "orders";
  render();
  playNotification();
  publishNotification(order);
  notify(`Pedido ${orderDisplayId(order)} enviado a la comanda.`, "success");
}

function initialiseAudio() {
  if (!window.AudioContext) throw new Error("Este navegador no permite avisos sonoros.");
  if (!audioContext) audioContext = new AudioContext();
  return audioContext.resume().catch((error) => {
    console.error("No se pudo iniciar el aviso sonoro.", error);
    notify("El navegador bloqueó el sonido; revisa los permisos de audio del sitio.", "warning");
  });
}

function playNotification() {
  if (state?.settings?.soundEnabled === false || !audioContext) return;
  try {
    if (audioContext.state === "suspended") {
      audioContext.resume().then(playNotification).catch((error) => {
        console.error("No se pudo reanudar el aviso sonoro.", error);
        notify("El navegador bloqueó el sonido de la comanda.", "warning");
      });
      return;
    }
    const startAt = audioContext.currentTime;
    [784, 988].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = startAt + index * 0.15;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.23);
    });
  } catch (error) {
    console.error("No se pudo reproducir el aviso de pedido.", error);
    notify("No se pudo reproducir el aviso sonoro en este dispositivo.", "warning");
  }
}

function publishNotification(order) {
  if (!state.settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
  new Notification(`${state.settings.businessName}: pedido ${orderDisplayId(order)}`, {
    body: `${channelLabel(order.channel)} · ${getOrderItemSummary(order)}`,
    icon: "./assets/pizza.svg",
  });
}

function updateOrderStatus(orderId, status) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return notify("La comanda ya no está disponible.", "error");
  const role = state.activeRole;
  const authorized = status === "preparing"
    ? hasActiveRole("owner", "cashier", "kitchen") && order.status === "new"
    : status === "ready"
      ? hasActiveRole("owner", "cashier", "kitchen") && order.status === "preparing"
      : status === "delivered"
        ? order.status === "ready" && (order.channel === "delivery"
          ? (role === "owner" || role === "cashier" || (role === "delivery" && order.deliveryPersonId === state.activeMemberId))
          : hasActiveRole("owner", "cashier", "waiter"))
        : false;
  if (!authorized) {
    notify("Este perfil no puede cambiar ese estado.", "error");
    return;
  }
  if (persist((next) => {
    const target = next.orders.find((item) => item.id === orderId);
    target.status = status;
    target.updatedAt = new Date().toISOString();
  }, `Comanda ${orderDisplayId(order)}: ${statusMeta(status)[0].toLowerCase()}.`)) {
    modal = null;
  }
}

function completeKitchenOrder(orderId) {
  if (!hasActiveRole("owner", "cashier", "kitchen")) {
    return notify("Este perfil no puede completar comandas desde Cocina.", "error");
  }
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status === "delivered") {
    return notify("Esta comanda ya fue completada o dejó de estar disponible.", "warning");
  }
  const completedAt = new Date().toISOString();
  if (persist((next) => {
    const target = next.orders.find((item) => item.id === orderId);
    if (!target || target.status === "delivered") {
      throw new Error("La comanda ya fue completada en otra pestaña.");
    }
    target.status = "delivered";
    target.completedAt = completedAt;
    target.updatedAt = completedAt;
  }, `Pedido ${orderDisplayId(order)} completado y conservado en Caja.`)) {
    modal = null;
    render();
  }
}

function recordPayment(orderId, method) {
  const order = state.orders.find((item) => item.id === orderId);
  const session = activeCashSession(state);
  if (!hasActiveRole("owner", "cashier")) return notify("Solo el dueño o el cajero pueden anotar pagos.", "error");
  if (!order || order.payment?.paidAt) return notify("Esta comanda ya se cobró o dejó de estar disponible.", "warning");
  if (!session) return notify("Abre la caja antes de registrar el pago.", "error");
  if (!["Efectivo", "QR"].includes(method) || !state.settings.paymentMethods.includes(method)) return notify("Selecciona Efectivo o QR entre los medios habilitados.", "error");
  if (!["ready", "delivered"].includes(order.status)) return notify("El cobro se registra cuando el pedido está listo para entregar.", "warning");
  const payment = { method, amount: orderTotal(order), paidAt: new Date().toISOString() };
  if (persist((next) => {
    const targetSession = next.cashSessions.find((item) => item.id === session.id);
    const targetOrder = next.orders.find((item) => item.id === orderId);
    if (!targetSession || targetSession.closedAt || !targetOrder || targetOrder.payment?.paidAt) {
      throw new Error("El turno se cerró o el pedido ya se cobró. Actualiza la pantalla e inténtalo de nuevo.");
    }
    targetSession.transactions.push({ orderId, ...payment });
    targetOrder.payment = payment;
  }, "Pago registrado en esta caja.")) {
    closeModal();
  }
}

function commitCloseCash(amount, notes) {
  const session = activeCashSession(state);
  if (!hasActiveRole("owner", "cashier") || !session) return notify("No hay una caja abierta para cerrar.", "error");
  if (!Number.isFinite(amount) || amount < 0) return notify("Ingresa un monto de efectivo contado válido.", "error");
  if (persist((next) => {
    const target = next.cashSessions.find((item) => item.id === session.id);
    if (!target || target.closedAt) throw new Error("La caja ya se cerró en otra pestaña.");
    const totals = methodTotals(target.transactions || []);
    target.countedAmount = amount;
    target.closingNotes = notes;
    target.totalGenerated = Object.values(totals).reduce((sum, total) => sum + total, 0);
    target.cashSales = totals.Efectivo || 0;
    target.qrSales = totals.QR || 0;
    target.closedAt = new Date().toISOString();
  }, "Cierre anotado. Guarda un respaldo en Ajustes.")) {
    closeModal();
  }
}

function addMenuProduct(formData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "");
  if (!name || !["Pizzas", "Bebidas", "Postres"].includes(category)) {
    notify("Completa el nombre y una categoría válida.", "warning");
    return;
  }
  const variants = [];
  if (category === "Bebidas") {
    const price = Number(formData.get("variantPrice1"));
    if (!Number.isFinite(price) || price <= 0) return notify("Ingresa un precio por unidad válido.", "warning");
    variants.push({ name: "Unidad", price });
  } else {
    for (const index of [1, 2, 3]) {
      const variantName = String(formData.get(`variantName${index}`) || "").trim();
      const rawPrice = formData.get(`variantPrice${index}`);
      if (!variantName && !rawPrice) continue;
      const price = Number(rawPrice);
      if (!variantName || !Number.isFinite(price) || price <= 0) return notify(`Completa correctamente el nombre y el precio de la variante ${index}.`, "warning");
      variants.push({ name: variantName, price });
    }
  }
  if (!variants.length) return notify("Agrega al menos una variante con un precio válido.", "warning");
  const active = formData.get("active") === "on";
  const duplicate = state.menu.some((product) => product.name.toLowerCase() === name.toLowerCase() && product.id !== id);
  if (duplicate) return notify("Ya existe un producto con ese nombre.", "warning");
  if (persist((next) => {
    if (id) {
      const target = next.menu.find((product) => product.id === id);
      if (!target) throw new Error("El producto fue eliminado. Actualiza el menú e inténtalo de nuevo.");
      Object.assign(target, { name, category, variants, active });
    } else {
      next.menu.push({ id: localId("item"), name, category, variants, active });
    }
  }, `Se guardó ${name} en el menú.`)) closeModal();
}

function handleNewOrder(event) {
  const form = event.target;
  if (!form.reportValidity()) return;
  captureDraftForm();
  createOrder();
}

function handleChange(event) {
  const target = event.target;
  if (target.matches("[data-order-extra]")) {
    if (!draft) return;
    const id = target.dataset.orderExtra;
    const selected = new Set(draft.selectedExtras[id] || []);
    if (target.checked) selected.add(target.value);
    else selected.delete(target.value);
    draft.selectedExtras[id] = [...selected];
    renderModal();
    return;
  }
  if (target.matches("[data-order-note]")) {
    if (draft) draft.itemNotes[target.dataset.orderNote] = target.value;
    return;
  }
  if (target.matches('input[name="channel"]')) {
    captureDraftForm();
    draft.channel = target.value;
    if (draft.channel !== "dinein") draft.tableId = "";
    else simplifyDineInDraft();
    renderModal();
    return;
  }
  if (target.matches("[data-search-menu]")) {
    if (draft) {
      draft.search = target.value;
      renderModal();
    }
    return;
  }
  if (target.matches("#product-category")) {
    const form = target.form;
    const chosen = form?.elements.category?.value;
    if (!form) return;
    const isDrink = chosen === "Bebidas";
    form.querySelectorAll("[data-variant-row]").forEach((row) => {
      row.hidden = isDrink && row.dataset.variantRow !== "0";
    });
    form.elements.variantName1.readOnly = isDrink;
    form.elements.variantName1.value = isDrink
      ? "Unidad"
      : form.elements.variantName1.value === "Unidad"
        ? chosen === "Pizzas" ? "Personal" : "Principal"
        : form.elements.variantName1.value;
    form.querySelector('label[for="variant-name-0"]').textContent = isDrink ? "Presentación" : "Variante principal";
    form.querySelector('label[for="variant-price-0"]').textContent = isDrink ? "Precio por unidad" : "Precio principal";
    form.elements.variantName1.placeholder = chosen === "Pizzas" ? "Ej.: Personal" : "Ej.: Principal";
    form.elements.variantName2.placeholder = "Ej.: Mediana";
    form.elements.variantName3.placeholder = "Ej.: Grande";
  }
}

function renderModal() {
  if (!modal) return;
  const layer = document.querySelector(".modal-backdrop");
  const oldActive = document.activeElement;
  const oldAction = oldActive?.dataset?.action;
  const oldFocus = oldActive?.dataset?.focus;
  const oldFocusId = oldActive?.id;
  const scrollPosition = layer?.querySelector(".modal-body")?.scrollTop || 0;
  const content = modal.content();
  layer?.querySelector(".modal-body")?.replaceChildren();
  if (layer) {
    layer.querySelector(".menu-choice-backdrop")?.remove();
    const title = layer.querySelector("#modal-title");
    if (title) title.textContent = modal.title;
    const body = layer.querySelector(".modal-body");
    body.innerHTML = content.body;
    body.scrollTop = scrollPosition;
    const footer = layer.querySelector(".modal-footer");
    if (content.footer) {
      if (footer) footer.innerHTML = content.footer;
      else layer.insertAdjacentHTML("beforeend", `<footer class="modal-footer">${content.footer}</footer>`);
    } else {
      footer?.remove();
    }
    if (content.overlay) layer.insertAdjacentHTML("beforeend", content.overlay);
    const choiceButton = layer.querySelector(".menu-choice-dialog button:not([disabled])");
    const restore = choiceButton || (oldFocusId
      ? layer.querySelector(`#${CSS.escape(oldFocusId)}`)
      : oldAction
        ? layer.querySelector(`[data-action="${CSS.escape(oldAction)}"]`)
        : oldFocus
          ? layer.querySelector(`[data-focus="${CSS.escape(oldFocus)}"]`)
          : null);
    restore?.focus({ preventScroll: true });
    const supportsSelection = restore instanceof HTMLTextAreaElement
      || (restore instanceof HTMLInputElement && ["text", "search", "url", "tel", "email", "password"].includes(restore.type));
    if (restore && oldFocus && supportsSelection) {
      const cursor = restore.value.length;
      restore.setSelectionRange(cursor, cursor);
    }
  } else {
    render();
  }
}

function submitForm(event) {
  const form = event.target;
  const data = new FormData(form);
  if (form.id === "new-order-form") {
    event.preventDefault();
    handleNewOrder(event);
    return;
  }
  event.preventDefault();
  if (!form.reportValidity()) return;

  switch (form.dataset.form) {
    case "cash-open": {
      const amount = Number(data.get("amount"));
      if (!Number.isFinite(amount) || amount < 0) return notify("Indica un monto de apertura válido.", "warning");
      if (activeCashSession(state)) return notify("La caja ya está abierta.", "warning");
      if (persist((next) => {
        next.cashSessions.push({ id: localId("cash"), date: todayKey(), openingAmount: amount, openedAt: new Date().toISOString(), openedBy: state.activeMemberId, transactions: [], closedAt: null });
      }, "Caja abierta.")) closeModal();
      break;
    }
    case "cash-close":
      commitCloseCash(Number(data.get("amount")), String(data.get("notes") || "").trim());
      break;
    case "payment":
      recordPayment(String(data.get("orderId")), String(data.get("method")));
      break;
    case "product":
      addMenuProduct(data);
      break;
    case "member": {
      const name = String(data.get("name") || "").trim();
      const role = String(data.get("role") || "");
      if (!name || !Object.hasOwn(ROLES, role)) return notify("Completa un nombre y elige un rol válido.", "warning");
      if (state.team.some((member) => member.name.toLowerCase() === name.toLowerCase())) return notify("Ya existe un perfil con ese nombre.", "warning");
      if (persist((next) => next.team.push({ id: localId("staff"), name, role }), `Perfil de prueba ${name} agregado.`)) closeModal();
      break;
    }
    case "assign-delivery": {
      const orderId = String(data.get("orderId") || "");
      const memberId = String(data.get("deliveryPersonId") || "");
      assignDelivery(orderId, memberId);
      break;
    }
    case "settings": {
      const businessName = String(data.get("businessName") || "").trim();
      const currency = String(data.get("currency") || "");
      const deliveryFee = Number(data.get("deliveryFee"));
      const paymentMethods = data.getAll("paymentMethods").map(String);
      const extrasText = String(data.get("extrasText") || "");
      if (!businessName || !["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "CRC", "UYU", "GTQ"].includes(currency)) return notify("Revisa el nombre del negocio y la moneda.", "warning");
      if (!Number.isFinite(deliveryFee) || deliveryFee < 0) return notify("El costo de envío debe ser un monto mayor o igual a cero.", "warning");
      if (!paymentMethods.length) return notify("Selecciona al menos un medio de pago.", "warning");
      const extras = [];
      const extraNames = new Set();
      for (const [index, rawLine] of extrasText.split(/\r?\n/).entries()) {
        const line = rawLine.trim();
        if (!line) continue;
        const [rawName, rawPrice, ...extraParts] = line.split("|");
        const name = String(rawName || "").trim();
        const price = Number(rawPrice);
        if (extraParts.length || !name || !Number.isFinite(price) || price <= 0) {
          return notify(`Revisa el extra de la línea ${index + 1}; usa Nombre | precio positivo.`, "warning");
        }
        if (extraNames.has(name.toLowerCase())) return notify(`El extra «${name}» está repetido.`, "warning");
        extraNames.add(name.toLowerCase());
        extras.push({ id: localId("extra"), name, price });
      }
      if (!persist((next) => Object.assign(next.settings, { businessName, currency, deliveryFee, paymentMethods, extras }))) return;
      return notify("Ajustes guardados.");
    }
    default:
      console.warn("Formulario no reconocido:", form.dataset.form);
      notify("No se reconoció este formulario. Inténtalo otra vez.", "error");
  }
}

function switchMember(memberId) {
  const member = state.team.find((person) => person.id === memberId);
  if (!member) return notify("El perfil ya no está disponible.", "warning");
  if (persist((next) => Object.assign(next, { activeRole: member.role, activeMemberId: member.id }))) {
    modal = null;
    screen = allowedScreen(screen) ? screen : "home";
    render();
    notify(`Vista previa: ${member.name} · ${ROLES[member.role]}.`, "success");
  }
}

function exportData() {
  try {
    const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `il-mundo-respaldo-${todayKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    notify("Respaldo descargado. Guárdalo en un lugar privado.");
  } catch (error) {
    console.error("No se pudo exportar el respaldo.", error);
    notify(`No se pudo descargar el respaldo: ${error.message}.`, "error");
  }
}

function exportCashExcel() {
  if (!hasActiveRole("owner", "cashier")) {
    return notify("Solo el dueño y el cajero pueden exportar el balance de caja.", "error");
  }
  try {
    const workbook = createCashWorkbook(state);
    const file = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    const downloadUrl = URL.createObjectURL(file);
    link.href = downloadUrl;
    link.download = cashWorkbookFilename();
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    notify("El balance de caja se descargó en formato Excel.");
  } catch (error) {
    console.error("No se pudo exportar el balance de caja.", error);
    notify(`No se pudo descargar el balance de caja: ${error.message || "error inesperado"}.`, "error");
  }
}

async function importData(file) {
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const validated = validateState(imported);
    const confirmed = window.confirm("Importar este respaldo reemplazará los datos que ya están guardados en este navegador. ¿Quieres continuar?");
    if (!confirmed) return;
    saveState(validated);
    state = validated;
    modal = null;
    screen = allowedScreen(screen) ? screen : "home";
    render();
    notify("Respaldo importado.");
  } catch (error) {
    console.error("No se pudo importar el respaldo.", error);
    notify(`No se importaron los datos: ${error.message || "el archivo no es válido"}.`, "error", 6500);
  }
}

function resetDemo() {
  try {
    const next = createInitialState();
    saveState(next);
    state = next;
    modal = null;
    draft = null;
    screen = "orders";
    history.replaceState(null, "", "#orders");
    render();
    notify("Se restauraron los datos de ejemplo.");
  } catch (error) {
    console.error("No se pudieron restaurar los datos de demostración.", error);
    notify(`No se pudieron reiniciar los datos: ${error.message}.`, "error", 6000);
  }
}

function removeMember(memberId) {
  const member = state.team.find((person) => person.id === memberId);
  if (!member) return notify("El perfil ya no está disponible.", "warning");
  const protectedIds = ["staff-owner", "staff-cashier", "staff-waiter", "staff-kitchen", "staff-delivery"];
  if (protectedIds.includes(memberId) || memberId === state.activeMemberId) return notify("No puedes borrar un perfil base o el perfil activo.", "warning");
  if (state.orders.some((order) => order.createdBy === memberId || order.deliveryPersonId === memberId) ||
      state.cashSessions.some((cash) => cash.openedBy === memberId)) {
    return notify("Este perfil aparece en un pedido o en una apertura de caja y no se puede borrar.", "warning");
  }
  openModal("confirm", {
    title: "Quitar perfil de prueba",
    description: `Se quitará el perfil «${member.name}» de esta demostración. No se borrarán los pedidos ni los cierres existentes.`,
    label: "Quitar perfil",
    action: `remove-member:${memberId}`,
  });
}

function render() {
  if (!state) return;
  if (!allowedScreen(screen)) screen = allowedScreen("orders") ? "orders" : "kitchen";
  const pages = {
    home: renderHome,
    orders: renderOrders,
    kitchen: renderKitchen,
    tables: renderTables,
    cash: () => renderCashPage(state, { badge, button, clockTime, emptyState, esc, formatMoney, hasActiveRole, icon, pageHeading, orderDisplayId }),
    menu: renderMenu,
    team: renderTeam,
    settings: renderSettings,
  };
  app.innerHTML = frame((pages[screen] || renderHome)());
  const clock = document.querySelector("#clock");
  if (clock) clock.textContent = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function announceOrdersCreated(nextState) {
  const previousIds = new Set(state.orders.map((order) => order.id));
  const additions = nextState.orders.filter((order) => order.status === "new" && !previousIds.has(order.id));
  if (modal?.kind === "new-order") captureDraftForm();
  state = nextState;
  if (!modal) render();
  else renderModal();
  for (const order of additions) {
    playNotification();
    publishNotification(order);
    notify(`Llegó la comanda ${orderDisplayId(order)}.`, "success");
  }
}

function showFatalError(error) {
  console.error("No se pudo iniciar Il Mundo.", error);
  let raw = null;
  try {
    raw = localStorage.getItem("ilmundo.pizzeria.v1");
  } catch (storageError) {
    console.error("No se pudieron leer los datos guardados para ofrecer un respaldo.", storageError);
  }
  app.innerHTML = `<main class="error-screen"><h1>No pudimos abrir los datos de Il Mundo</h1><p>El navegador no pudo leer los datos guardados. No los hemos reemplazado. Si tienes un respaldo, puedes recargar la página después de importarlo en un perfil limpio.</p><p><strong>Detalle:</strong> ${esc(error.message || "error inesperado")}</p><p>Si los datos guardados son importantes, no pulses el botón de reinicio sin tener antes una copia.</p>${raw ? '<button class="button" type="button" data-action="export-raw-data">Descargar los datos guardados sin modificarlos</button>' : ""}<button class="button danger" style="margin-left:8px" type="button" data-action="confirm:recover-demo">Restaurar datos de demostración</button></main><div id="toast-container" class="toast-container" aria-live="polite"></div>`;
}

function navigate(page) {
  if (!allowedScreen(page)) {
    notify("Este perfil no tiene permiso para abrir esa pantalla.", "warning");
    return;
  }
  modal = null;
  draft = null;
  screen = page;
  if (location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
  render();
}

function addProductToDraft(productId) {
  if (!draft) return;
  captureDraftForm();
  const product = state.menu.find((item) => item.id === productId && item.active);
  if (!product) return notify("Este producto ya no está disponible. Actualiza el menú.", "warning");
  if (!["Pizzas", "Bebidas"].includes(product.category)) {
    return notify("En los pedidos solo se pueden agregar pizzas y bebidas.", "warning");
  }
  const variants = selectableVariants(product);
  const variantName = product.category === "Bebidas"
    ? product.variants[0]?.name
    : draft.selectedVariants[product.id] || defaultOrderVariant(product)?.name;
  const variant = variants.find((item) => item.name === variantName);
  if (!variant) return notify("Elige una presentación disponible.", "warning");
  const extraItems = (draft.channel === "dinein" ? [] : draft.selectedExtras[product.id] || [])
    .map((id) => state.settings.extras.find((extra) => extra.id === id))
    .filter(Boolean);
  const note = draft.channel === "dinein" ? "" : String(draft.itemNotes[product.id] || "").trim();
  const extrasPrice = extraItems.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
  draft.items.push({
    menuItemId: product.id,
    name: product.name,
    category: product.category,
    variant: product.category === "Bebidas" ? "Unidad" : variant.name,
    quantity: draft.selectedQuantities[product.id] || 1,
    price: Number(variant.price) + extrasPrice,
    extras: extraItems.map((extra) => extra.name),
    notes: note,
  });
  draft.selectedExtras[product.id] = [];
  draft.itemNotes[product.id] = "";
  draft.selectedQuantities[product.id] = 1;
  draft.selectedProductId = "";
  renderModal();
  document.querySelector(`[data-action="add-item:${CSS.escape(productId)}"]`)?.focus({ preventScroll: true });
  notify(`${product.name} se agregó a la comanda.`, "success", 1800);
}

function adjustDraftItem(index, change) {
  captureDraftForm();
  const item = draft?.items[index];
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) draft.items.splice(index, 1);
  renderModal();
}

function assignDelivery(orderId, deliveryPersonId) {
  const order = state.orders.find((item) => item.id === orderId);
  const courier = getTeamMember(deliveryPersonId);
  if (!order || order.channel !== "delivery" || order.status === "delivered" || order.deliveryPersonId) {
    return notify("Este pedido ya fue asignado o dejó de estar disponible.", "warning");
  }
  if (!courier || courier.role !== "delivery") return notify("Selecciona un repartidor disponible.", "warning");
  if (persist((next) => {
    const target = next.orders.find((item) => item.id === orderId);
    if (!target || target.deliveryPersonId || target.status === "delivered") throw new Error("El pedido cambió en otra pestaña. Actualiza e inténtalo de nuevo.");
    target.deliveryPersonId = deliveryPersonId;
  }, `Reparto asignado a ${courier.name}.`)) {
    closeModal();
  }
}

function closeModal() {
  modal = null;
  draft = null;
  render();
}

function actionClicked(action) {
  if (!action) return;
  if (draft && modal?.kind === "new-order") captureDraftForm();
  const [name, ...parts] = action.split(":");
  const value = parts.join(":");

  if (name.startsWith("#")) return;
  switch (name) {
    case "close-modal":
      closeModal();
      return;
    case "backdrop":
      closeModal();
      return;
    case "close-product-choice":
      if (!draft) return;
      {
        const productId = draft.selectedProductId;
        draft.selectedProductId = "";
        renderModal();
        document.querySelector(`[data-action="select-product:${CSS.escape(encodeURIComponent(productId))}"]`)?.focus({ preventScroll: true });
      }
      return;
    case "new-order":
      startNewOrder();
      return;
    case "new-table-order":
      startNewOrder({ channel: "dinein", tableId: value });
      return;
    case "navigate":
      navigate(value);
      return;
    case "view-order":
      navigate("orders");
      return;
    case "filter-menu":
      menuFilter = value;
      render();
      return;
    case "filter-team":
      teamFilter = value;
      render();
      return;
    case "draft-filter":
      if (draft) {
        captureDraftForm();
        draft.category = decodeURIComponent(value);
        renderModal();
      }
      return;
    case "select-product": {
      if (!draft) return;
      const productId = decodeURIComponent(value);
      draft.selectedProductId = productId;
      if (draft.selectedProductId && !draft.selectedQuantities[productId]) draft.selectedQuantities[productId] = 1;
      renderModal();
      return;
    }
    case "select-variant": {
      if (!draft) return;
      const productId = decodeURIComponent(parts[0] || "");
      const variantName = decodeURIComponent(parts[1] || "");
      const product = state.menu.find((item) => item.id === productId && item.active);
      if (!product || !selectableVariants(product).some((variant) => variant.name === variantName)) {
        return notify("Ese tamaño ya no está disponible. Actualiza el menú.", "warning");
      }
      draft.selectedProductId = productId;
      draft.selectedVariants[productId] = variantName;
      renderModal();
      return;
    }
    case "selection-quantity": {
      if (!draft) return;
      const productId = decodeURIComponent(parts[0] || "");
      const product = state.menu.find((item) => item.id === productId && item.active);
      if (!product) return notify("Este producto ya no está disponible.", "warning");
      draft.selectedProductId = productId;
      draft.selectedQuantities[productId] = Math.max(1, (draft.selectedQuantities[productId] || 1) + Number(parts[1]));
      renderModal();
      return;
    }
    case "add-item":
      addProductToDraft(decodeURIComponent(value));
      return;
    case "cart-plus":
      adjustDraftItem(Number(value), 1);
      return;
    case "cart-minus":
      adjustDraftItem(Number(value), -1);
      return;
    case "open-cash":
      if (!hasActiveRole("owner", "cashier")) return notify("Solo el dueño o el cajero pueden abrir la caja.", "error");
      if (activeCashSession(state)) return notify("La caja ya está abierta.", "warning");
      openModal("cash-open");
      return;
    case "close-cash":
      if (!hasActiveRole("owner", "cashier")) return notify("Solo el dueño o el cajero pueden cerrar la caja.", "error");
      if (!activeCashSession(state)) return notify("No hay una caja abierta.", "warning");
      openModal("cash-close");
      return;
    case "pay-order": {
      if (!hasActiveRole("owner", "cashier")) return notify("Solo el dueño y el cajero registran los pagos.", "error");
      const order = state.orders.find((item) => item.id === value);
      if (!order || order.payment?.paidAt) return notify("Esta comanda ya se cobró o dejó de estar disponible.", "warning");
      openModal("payment", { orderId: value });
      return;
    }
    case "start-order":
      updateOrderStatus(value, "preparing");
      return;
    case "ready-order":
      updateOrderStatus(value, "ready");
      return;
    case "deliver-order":
      updateOrderStatus(value, "delivered");
      return;
    case "complete-order":
      completeKitchenOrder(value);
      return;
    case "view-kitchen-order": {
      const order = state.orders.find((item) => item.id === value && item.status !== "delivered");
      if (!order) return notify("La comanda ya no está disponible.", "warning");
      const location = order.channel === "dinein"
        ? (order.tableName || "En mesa")
        : order.channel === "delivery" ? "Delivery" : "Para llevar";
      openModal("kitchen-order", {
        orderId: value,
        title: `Pedido ${orderDisplayId(order)}`,
        description: location,
      });
      return;
    }
    case "assign-order": {
      const order = state.orders.find((item) => item.id === value);
      const couriers = state.team.filter((member) => member.role === "delivery");
      if (!order || order.deliveryPersonId || order.status === "delivered") return notify("Este pedido ya fue asignado o completado.", "warning");
      if (!couriers.length) return notify("Agrega un perfil de repartidor en Equipo antes de asignar este pedido.", "warning");
      openModal("assign-delivery", { orderId: value, couriers });
      return;
    }
    case "take-delivery": {
      const order = state.orders.find((item) => item.id === value);
      if (state.activeRole !== "delivery" || !order || order.channel !== "delivery" || order.deliveryPersonId || order.status === "delivered") return notify("Este pedido ya fue tomado o no está disponible.", "warning");
      if (persist((next) => {
        const target = next.orders.find((item) => item.id === value);
        if (!target || target.deliveryPersonId || target.status === "delivered") throw new Error("El pedido cambió en otra pestaña. Actualiza para ver quién lo tomó.");
        target.deliveryPersonId = state.activeMemberId;
      }, "Tomaste el pedido para entregar.")) return;
      return;
    }
    case "edit-product": {
      if (!hasActiveRole("owner")) return notify("Solo el dueño puede editar el menú.", "error");
      if (value === "new") return openModal("product-edit", { product: null });
      const product = state.menu.find((item) => item.id === value);
      if (!product) return notify("El producto ya no está disponible.", "warning");
      openModal("product-edit", { product });
      return;
    }
    case "toggle-product": {
      if (!hasActiveRole("owner")) return notify("Solo el dueño puede cambiar el menú.", "error");
      const product = state.menu.find((item) => item.id === value);
      if (!product) return notify("El producto ya no está disponible.", "warning");
      persist((next) => {
        const target = next.menu.find((item) => item.id === value);
        target.active = !target.active;
      }, `Se ${product.active ? "pausó" : "activó"} ${product.name}.`);
      return;
    }
    case "switch-role":
      openModal("switch-role");
      return;
    case "switch-member":
      switchMember(value);
      return;
    case "add-member":
      if (!hasActiveRole("owner")) return notify("Solo el dueño puede administrar perfiles.", "error");
      openModal("team-add");
      return;
    case "remove-member":
      return removeMember(value);
    case "add-courier":
      return;
    case "export-data":
      exportData();
      return;
    case "export-cash-excel":
      exportCashExcel();
      return;
    case "import-data-trigger":
      document.querySelector("#import-file")?.click();
      return;
    case "reset-data":
      openModal("confirm", {
        title: "Restaurar datos de ejemplo",
        description: "Se eliminarán los pedidos, cierres y ajustes guardados en este navegador. Antes puedes descargar un respaldo desde esta misma pantalla. Esta acción no se puede deshacer.",
        label: "Borrar y restaurar",
        action: "reset-demo",
      });
      return;
    case "export-raw-data": {
      const raw = localStorage.getItem("ilmundo.pizzeria.v1");
      if (raw === null) return notify("No quedan datos guardados para exportar.", "warning");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      link.download = `il-mundo-respaldo-sin-validar-${todayKey()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify("Descargamos los datos guardados sin modificarlos.");
      return;
    }
    case "confirm": {
      if (value === "reset-demo") return resetDemo();
      if (value === "recover-demo") return resetDemo();
      if (value.startsWith("remove-member:")) {
        const memberId = value.slice("remove-member:".length);
        if (!hasActiveRole("owner")) return notify("Solo el dueño puede quitar perfiles.", "error");
        const target = state.team.find((member) => member.id === memberId);
        if (!target) return notify("El perfil ya no está disponible.", "warning");
        if (persist((next) => {
          next.team = next.team.filter((member) => member.id !== memberId);
        }, `Se quitó el perfil ${target.name}.`)) closeModal();
      }
      return;
    }
    case "enable-sound":
      if (!hasActiveRole("owner", "cashier", "kitchen")) return notify("Este perfil no tiene acceso a avisos de cocina.", "warning");
      try {
        initialiseAudio();
        if (!persist((next) => { next.settings.soundEnabled = true; })) return;
        notify("Aviso sonoro activado en este dispositivo.");
        playNotification();
      } catch (error) {
        console.error("No se pudo habilitar el aviso sonoro.", error);
        notify(`No se pudo habilitar el aviso: ${error.message}.`, "error");
      }
      return;
    case "toggle-alerts": {
      if (!("Notification" in window)) return notify("Este navegador no admite notificaciones en segundo plano.", "warning");
      if (Notification.permission === "granted") {
        const enabled = !state.settings.notificationsEnabled;
        if (!persist((next) => { next.settings.notificationsEnabled = enabled; })) return;
        notify(enabled ? "Avisos del navegador activados." : "Avisos del navegador desactivados.");
      } else if (Notification.permission === "denied") {
        notify("El navegador bloqueó los avisos. Cámbialo en los permisos del sitio.", "warning", 5000);
      } else {
        Notification.requestPermission().then((permission) => {
          if (permission !== "granted") return notify("No se concedió permiso para mostrar avisos.", "warning");
          if (!persist((next) => { next.settings.notificationsEnabled = true; })) return;
          notify("Avisos del navegador activados.");
        }).catch((error) => {
          console.error("No se pudo solicitar permiso para notificaciones.", error);
          notify("No se pudieron activar las notificaciones en este navegador.", "error");
        });
      }
      return;
    }
    case "install-pwa":
      if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.finally(() => { installPrompt = null; render(); });
      }
      return;
    default:
      console.warn("Acción no reconocida:", name, value);
  }
}

function installEventHandlers() {
  let audioUnavailableNotified = false;
  document.addEventListener("pointerdown", () => {
    if (!state || state.settings.soundEnabled === false || audioContext || audioUnavailableNotified) return;
    try {
      initialiseAudio().catch((error) => {
        audioUnavailableNotified = true;
        console.error("No se pudo activar el sonido al interactuar con la aplicación.", error);
        notify(`No se pudo activar el sonido: ${error.message || "este navegador lo bloqueó"}.`, "warning", 5000);
      });
    } catch (error) {
      audioUnavailableNotified = true;
      console.error("No se pudo activar el sonido al interactuar con la aplicación.", error);
      notify(`No se pudo activar el sonido: ${error.message || "este navegador lo bloqueó"}.`, "warning", 5000);
    }
  }, { passive: true });

  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("menu-choice-backdrop")) {
      actionClicked("close-product-choice");
      return;
    }
    if (event.target === document.querySelector(".modal-backdrop")) {
      closeModal();
      return;
    }
    const navigation = event.target.closest("[data-nav]");
    if (navigation) {
      event.preventDefault();
      navigate(navigation.dataset.nav);
      return;
    }
    const target = event.target.closest("[data-action]");
    if (target && target.dataset.action !== "backdrop") actionClicked(target.dataset.action);
  });

  document.addEventListener("change", handleChange);
  document.addEventListener("submit", submitForm);

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-search-menu]") && draft) {
      draft.search = target.value;
      renderModal();
      const search = document.querySelector('[data-focus="menu-search"]');
      search?.focus({ preventScroll: true });
      if (search && "setSelectionRange" in search) search.setSelectionRange(search.value.length, search.value.length);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && draft?.selectedProductId) {
      event.preventDefault();
      actionClicked("close-product-choice");
    } else if (event.key === "Escape" && modal) closeModal();
    if (event.key === "Tab" && modal) {
      const focusRoot = draft?.selectedProductId ? document.querySelector(".menu-choice-dialog") : document.querySelector(".modal");
      const focusable = [...(focusRoot?.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]") || [])].filter((element) => element.offsetParent);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "import-file") {
      importData(event.target.files?.[0]);
      event.target.value = "";
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== "ilmundo.pizzeria.v1" || !event.newValue) return;
    try {
      const nextState = validateState(JSON.parse(event.newValue));
      announceOrdersCreated(nextState);
    } catch (error) {
      console.error("No se pudieron sincronizar los cambios de otra pestaña.", error);
      notify("Otra pestaña guardó datos que no se pudieron leer. Cierra la otra pestaña y revisa el respaldo.", "error", 6000);
    }
  });

  window.addEventListener("online", () => {
    render();
    notify("Hay conexión a internet, pero esta demostración sigue funcionando en modo local.", "warning", 4500);
  });
  window.addEventListener("offline", render);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    render();
  });
}

function startClock() {
  window.setInterval(() => {
    const clock = document.querySelector("#clock");
    if (clock) clock.textContent = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }, 30_000);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !["https:", "http:"].includes(location.protocol)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("No se pudo registrar el almacenamiento local de la aplicación.", error);
    notify("No se pudo preparar el modo sin conexión. Comprueba que el servidor esté bien configurado.", "warning", 6000);
  }
}

function startApp() {
  installEventHandlers();
  try {
    state = loadState();
    if (!state.activeMemberId || !state.team.some((member) => member.id === state.activeMemberId)) {
      const member = state.team.find((person) => person.role === state.activeRole);
      state.activeMemberId = member?.id || state.team[0]?.id;
      saveState(state);
    }
    const requestedScreen = location.hash.slice(1);
    const defaultMode = requestedScreen === "kitchen" ? "kitchen" : "orders";
    screen = allowedScreen(defaultMode) ? defaultMode : (allowedScreen("orders") ? "orders" : "kitchen");
    if (location.hash !== `#${screen}`) history.replaceState(null, "", `#${screen}`);
    render();
    startClock();
    registerServiceWorker();
  } catch (error) {
    showFatalError(error);
  }
}

startApp();
