import { installDiagnostics } from "./diagnostics.js";
import {
  activeCashSession,
  createInitialState,
  formatMoney,
  loadState,
  NAVIGATION,
  orderTotal,
  saveState,
  todayKey,
  validateState,
} from "./data.js?v=10";
import {
  getWorkspaceProfile,
  inviteOrManageStaff,
  loadWorkspace,
  refreshWorkspace,
  requestPasswordReset,
  saveWorkspace,
  signIn,
  signOut,
  subscribeWorkspace,
  supabase,
  updatePassword,
} from "./backend.js";
import { createCashWorkbook, cashWorkbookFilename, createDailyBalanceWorkbook, dailyBalanceWorkbookFilename } from "./features/cash/export.js";
import { createPaymentTotals } from "./features/cash/totals.js";
import { renderCashPage } from "./features/cash/page.js";

const app = document.querySelector("#app");
installDiagnostics();
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
  volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/>',
};

let state;
let screen = "orders";
let modal = null;
let draft = null;
let teamFilter = "all";
let settingsTab = "menu";
let audioContext = null;
let installPrompt = null;
let authenticatedUser = null;
let backendProfile = null;
let backendRevision = 0;
let backendUnsubscribe = null;
let backendWriteQueue = Promise.resolve();
let pendingBackendWrites = 0;
let backendSyncBlocked = false;
let loadingUserId = "";
let loginMessage = "";
let loginBusy = false;
let passwordRecovery = false;
const SOUND_ENABLED_KEY = "ilmundo.sound.enabled";
let soundEnabledOnDevice = localStorage.getItem(SOUND_ENABLED_KEY) === "true";
let notificationsEnabledOnDevice = localStorage.getItem("ilmundo.notifications.enabled") === "true";
const OPERATING_MODES = [
  { id: "orders", label: "Pedidos", icon: "receipt", roles: ["owner", "cashier", "waiter", "kitchen", "delivery", "worker"] },
  { id: "kitchen", label: "Cocina", icon: "chef", roles: ["owner"] },
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

function renderLoading(message) {
  app.innerHTML = `<main class="boot-screen" role="status"><img class="loading-pizza" src="./assets/pizza.svg" alt=""><strong>${esc(message)}</strong></main>`;
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
  } catch (error) {
    console.error("No se pudieron preparar los cambios.", error);
    notify(`No se guardaron los cambios: ${error.message || "error inesperado"}.`, "error", 6000);
    return false;
  }
  if (backendProfile) {
    if (backendSyncBlocked) {
      notify("Actualiza el espacio compartido antes de seguir guardando.", "warning", 5000);
      return false;
    }
    if (!navigator.onLine) {
      notify("Necesitas conexión para guardar cambios en el espacio compartido.", "warning", 5000);
      return false;
    }
    state = next;
    render();
    pendingBackendWrites += 1;
    const snapshot = JSON.parse(JSON.stringify(next));
    backendWriteQueue = backendWriteQueue.then(async () => {
      if (!backendProfile || backendSyncBlocked) return;
      const saved = await saveWorkspace(snapshot, backendRevision, backendProfile.role);
      backendRevision = saved.revision;
    }).catch(async (error) => {
      console.error("No se pudieron sincronizar los cambios con Supabase.", error);
      backendSyncBlocked = true;
      try {
        if (authenticatedUser && backendProfile) {
          const latest = await refreshWorkspace(createInitialState(), authenticatedUser.id, backendProfile.role);
          backendRevision = latest.revision;
          state = validateState(latest.state);
          modal = null;
          draft = null;
          render();
        }
      } catch (refreshError) {
        console.error("No se pudo recuperar el estado compartido después del error.", refreshError);
      }
      render();
      notify(`No se sincronizaron los cambios: ${error.message || "error de conexión"}. Actualiza los datos antes de continuar.`, "error", 7000);
    }).finally(() => {
      pendingBackendWrites = Math.max(0, pendingBackendWrites - 1);
    });
    if (successMessage) notify(successMessage);
    return true;
  }
  try {
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

function isAdmin() {
  return state.activeRole === "owner";
}

function memberRoleGroup(role) {
  return role === "owner" ? "admin" : "worker";
}

function memberRoleLabel(role) {
  return memberRoleGroup(role) === "admin" ? "Administrador" : "Trabajador";
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
  return `<div class="demo-banner">${icon("wifi")}<span><strong>Espacio compartido.</strong> Los pedidos y el menú se sincronizan entre los dispositivos conectados. La caja solo está disponible para administradores.</span></div>`;
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
  const settingsTitle = settingsTab === "users" ? "Usuarios y roles" : "Menú";
  const title = OPERATING_MODES.find((item) => item.id === screen)?.label
    || (["settings", "menu", "team"].includes(screen) ? settingsTitle : state.settings.businessName);
  const online = navigator.onLine;
  const compactCash = screen === "orders";
  const session = activeCashSession(state);
  const cashAction = compactCash && isAdmin()
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
        <strong><span class="online-dot"></span> ${online ? "Sincronización en línea" : "Sin conexión"}</strong>
        <p>${online ? "Los cambios se guardan en el espacio compartido." : "No podrás guardar ni sincronizar cambios sin conexión."}</p>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar ${compactCash ? "cash-topbar" : ""}">
        ${compactCash
          ? `<time class="cash-date">${businessDate()}</time>`
          : `<div class="topbar-title"><strong>${esc(title)}</strong><span>${esc(state.settings.businessName)} · ${businessDate()}</span></div>`}
        <div class="topbar-actions">        ${compactCash ? cashAction : `<span class="clock" id="clock"></span><span class="connection-pill"><span class="online-dot"></span>${online ? "En línea" : "Sin conexión"}</span>`}
          <button class="button soft small-button sound-toggle" type="button" data-action="${soundEnabledOnDevice ? "disable-sound" : "enable-sound"}" aria-label="${soundEnabledOnDevice ? "Desactivar sonido" : "Activar sonido"}" title="${soundEnabledOnDevice ? "Desactivar sonido" : "Activar sonido"}" aria-pressed="${soundEnabledOnDevice}">${icon(soundEnabledOnDevice ? "volume" : "mute")}<span>${soundEnabledOnDevice ? "Sonido activado" : "Activar sonido"}</span></button>
          ${backendSyncBlocked ? `<button class="button soft small-button" type="button" data-action="refresh-workspace">Actualizar</button>` : ""}
          ${isAdmin() ? `<button class="icon-button" type="button" data-action="navigate:settings" title="Configuración" aria-label="Configuración">${icon("settings")}</button>` : ""}
          <button class="icon-button" type="button" data-action="sign-out" title="Cerrar sesión" aria-label="Cerrar sesión">${icon("logout")}</button>
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
  const canSeeSales = isAdmin();
  const nextOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const actions = [
    { title: "Nuevo pedido", subtitle: "Tomar una comanda", icon: "plus", action: "new-order", allowed: true },
    { title: "Ver cocina", subtitle: `${notReady.length} ${notReady.length === 1 ? "pedido pendiente" : "pedidos pendientes"}`, icon: "chef", action: "navigate:kitchen", allowed: isAdmin() },
    { title: "Abrir caja", subtitle: currentCash ? "La caja está abierta" : "Registrar monto inicial", icon: "wallet", action: "open-cash", allowed: canSeeSales && !currentCash },
    { title: "Ver mesas", subtitle: `${state.tables.length} mesas`, icon: "table", action: "navigate:tables", allowed: isAdmin() },
  ].filter((item) => item.allowed);
  const cashSummary = canSeeSales
    ? `<section class="cash-callout"><div><strong>${currentCash ? "Caja abierta" : "Caja sin abrir"}</strong><p>${currentCash ? `Apertura ${clockTime(currentCash.openedAt)} · Los pagos se anotan al confirmar cada pedido.` : "Abre el turno antes de confirmar pedidos para incluir los pagos."}</p></div>${button(currentCash ? "navigate:cash" : "open-cash", currentCash ? "Ver caja" : "Abrir caja", { kind: "soft", extra: "small-button", icon: "wallet" })}</section>`
    : "";
  return `${pageHeading("LA PIZZERÍA, DE UN VISTAZO", "Buen día", "Un espacio simple para coordinar el salón, la cocina y cada pedido.", button("new-order", "Nuevo pedido", { kind: "primary", icon: "plus" }))}
    ${isAdmin() ? cashSummary : ""}
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
      ${actions.length ? `<section class="card panel">
        <div class="panel-title"><h2>Accesos rápidos</h2></div>
        <div class="quick-grid">${actions.map((item) => `<button type="button" class="quick-card" data-action="${esc(item.action)}"><span class="quick-card-icon">${icon(item.icon)}</span><span><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></span></button>`).join("")}</div>
      </section>` : ""}
    </div>`;
}

function orderCard(order) {
  const [statusText, statusClass] = statusMeta(order.status);
  const canPrepare = true;
  const canTakeDelivery = order.channel === "delivery" && order.status !== "delivered" && !order.deliveryPersonId;
  const canAssign = isAdmin() && order.channel === "delivery" && order.status !== "delivered" && !order.deliveryPersonId;
  const canUpdate = (order.status === "new" && canPrepare) || (order.status === "preparing" && canPrepare) || canTakeDelivery || canAssign;
  const actionButtons = [
    order.status === "new" && canPrepare ? button(`start-order:${order.id}`, "Empezar", { kind: "soft", extra: "small-button" }) : "",
    order.status === "preparing" && canPrepare ? button(`ready-order:${order.id}`, "Marcar listo", { kind: "primary", extra: "small-button" }) : "",
    canAssign ? button(`assign-order:${order.id}`, "Asignar repartidor", { extra: "small-button", icon: "bike" }) : "",
    canTakeDelivery ? button(`take-delivery:${order.id}`, "Tomar pedido", { kind: "primary", extra: "small-button" }) : "",
  ].filter(Boolean).join("");
  const items = order.items.map((item) => `<div class="order-item-line"><strong>${item.quantity}× ${esc(item.name)}${item.variant ? ` · ${esc(item.variant)}` : ""}${item.extras?.length ? `<span class="secondary-line">Extra: ${item.extras.map(esc).join(", ")}</span>` : ""}${item.notes ? `<span class="secondary-line">Nota: ${esc(item.notes)}</span>` : ""}</strong><span>${formatMoney(item.price * item.quantity, state.settings.currency)}</span></div>`).join("");
  return `<article class="order-card">
    <div class="order-card-head"><div><div class="order-id">${esc(orderDisplayId(order))}</div><div class="order-meta">${badge(statusText, statusClass)}${badge(channelLabel(order.channel), "type")}</div></div><span class="ticket-age">${clockTime(order.createdAt)}</span></div>
    ${order.customerName ? `<div class="order-meta small muted">${esc(order.customerName)}</div>` : ""}
    <div class="order-items">${items}</div>
    ${order.notes ? `<p class="order-notes">${icon("note")} ${esc(order.notes)}</p>` : ""}
    ${order.channel === "delivery" && order.address ? `<p class="small muted">${esc(order.address)}</p>` : ""}
    <div class="order-card-foot"><span class="order-total"><strong>${formatMoney(orderTotal(order), state.settings.currency)}</strong></span><span class="order-actions">${canUpdate ? actionButtons : ""}</span></div>
  </article>`;
}

function renderOrders() {
  const orders = todayOrders();
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canCreateOrder = true;
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
  const all = todayOrders().filter((order) => order.status !== "delivered" && order.status !== "ready").sort((a, b) => {
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
  const completeLabel = "Pedido finalizado";
  const notes = order.notes ? `<p class="kitchen-modal-general-note">${icon("note")}${esc(order.notes)}</p>` : "";
  return {
    body: `<div class="kitchen-modal-order">
      <div class="kitchen-modal-meta">${badge(statusText, statusClass)}<span>${esc(age)}</span></div>
      <div class="kitchen-modal-items">${items}</div>
      ${notes}
    </div>`,
    footer: button(`complete-order:${order.id}`, completeLabel, { kind: "primary" }),
  };
}

function occupiedTables() {
  return state.tables.filter((table) => todayOrders().some((order) =>
    order.tableId === table.id && order.channel === "dinein" && !["ready", "delivered"].includes(order.status),
  ));
}

function renderTables() {
  const busy = occupiedTables();
  const freeCount = state.tables.length - busy.length;
  return `${pageHeading("SALÓN", "Mesas", `${freeCount} ${freeCount === 1 ? "mesa disponible" : "mesas disponibles"} · selecciona una mesa para iniciar una comanda.`, button("new-order", "Nuevo pedido", { kind: "primary", icon: "plus" }))}
    <div class="table-grid">${state.tables.map((table) => {
      const order = todayOrders().find((item) => item.tableId === table.id && item.channel === "dinein" && !["ready", "delivered"].includes(item.status));
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

function renderTeam() {
  if (!isAdmin()) return `${pageHeading("CUENTAS", "Acceso restringido", "Solo el administrador puede administrar las cuentas.")}`;
  const members = state.team.filter((member) => teamFilter === "all" || memberRoleGroup(member.role) === teamFilter);
  const roleFilter = [["all", "Todos"], ["admin", "Administradores"], ["worker", "Trabajadores"]];
  return `${pageHeading("CONFIGURACIÓN", "Usuarios y roles", "Invita por correo y administra los permisos de las cuentas.", button("add-member", "Invitar usuario", { kind: "primary", icon: "plus" }))}
    <div class="filter-bar">${roleFilter.map(([id, label]) => `<button class="filter-chip ${teamFilter === id ? "selected" : ""}" type="button" data-action="filter-team:${esc(id)}">${esc(label)}</button>`).join("")}</div>
    <div class="two-column">${members.map((member) => `<article class="role-card"><span class="avatar">${esc(initials(member.name))}</span><span class="role-card-main"><strong>${esc(member.name)}</strong><span>${member.id === state.activeMemberId ? "Sesión actual" : "Cuenta autenticada"}</span></span><select class="form-select account-role" data-member-role="${esc(member.id)}" aria-label="Tipo de cuenta de ${esc(member.name)}" ${member.id === state.activeMemberId ? "disabled" : ""}><option value="admin" ${memberRoleGroup(member.role) === "admin" ? "selected" : ""}>Administrador</option><option value="worker" ${memberRoleGroup(member.role) === "worker" ? "selected" : ""}>Trabajador</option></select>${member.id !== state.activeMemberId ? `<button class="icon-button" type="button" data-action="remove-member:${esc(member.id)}" aria-label="Eliminar cuenta ${esc(member.name)}">${icon("close")}</button>` : ""}</article>`).join("") || `<div class="card">${emptyState("Sin cuentas en este filtro", "Elige otro tipo de cuenta.")}</div>`}</div>
    <div class="notice" style="margin-top:16px">${icon("alert")}<span>Los permisos también se validan en Supabase. Las invitaciones dependen de que el correo saliente del proyecto esté configurado.</span></div>`;
}

function renderSettings() {
  if (!isAdmin()) return `${pageHeading("CONFIGURACIÓN", "Acceso restringido", "Solo el administrador puede cambiar la configuración.")}`;
  const tabs = `<div class="settings-tabs" role="tablist" aria-label="Secciones de configuración">
    <button class="settings-tab ${settingsTab === "menu" ? "selected" : ""}" id="settings-tab-menu" type="button" role="tab" aria-controls="settings-panel-menu" aria-selected="${settingsTab === "menu"}" data-action="settings-tab:menu">Menú</button>
    <button class="settings-tab ${settingsTab === "users" ? "selected" : ""}" id="settings-tab-users" type="button" role="tab" aria-controls="settings-panel-users" aria-selected="${settingsTab === "users"}" data-action="settings-tab:users">Usuarios y roles</button>
  </div>`;
  if (settingsTab === "users") return `${tabs}<div id="settings-panel-users" role="tabpanel" aria-labelledby="settings-tab-users">${renderTeam()}</div>`;
  const productSection = (category, action, addLabel) => {
    const products = state.menu.filter((product) => product.category === category);
    return `<section class="card panel menu-settings-section">
      <div class="panel-title"><h2>${category}</h2>${button(action, addLabel, { kind: "soft", extra: "small-button", icon: "plus" })}</div>
      ${products.length ? `<ul class="menu-settings-list">${products.map((product) => `<li class="menu-settings-row"><div class="menu-settings-product"><strong>${esc(product.name)}</strong><span>${pricePills(product)}</span></div><div class="product-admin-actions">${button(`edit-product:${product.id}`, "Editar", { extra: "small-button" })}${button(`delete-product:${product.id}`, "Borrar", { kind: "danger", extra: "small-button" })}</div></li>`).join("")}</ul>` : `<p class="small muted">Todavía no hay ${category.toLowerCase()}.</p>`}
    </section>`;
  };
  return `${tabs}<div id="settings-panel-menu" role="tabpanel" aria-labelledby="settings-tab-menu"><div class="page-heading"><div><h1>Menú</h1></div></div>
    ${productSection("Pizzas", "add-pizza", "Agregar pizza")}
    ${productSection("Bebidas", "add-drink", "Agregar bebida")}
    <div class="section-heading"><h2>Balance</h2></div>
    <section class="card panel"><p class="small muted">Descarga el balance de ventas registradas hoy.</p>${button("export-daily-balance", "Exportar balance del día", { kind: "primary", icon: "download" })}</section></div>`;
}

function orderCartTotal() {
  return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function selectableVariants(product) {
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
  const variantOptions = isDrink && variants.length <= 1
    ? `<div class="unit-choice">${esc(variant?.name || "Unidad")} · ${formatMoney(variant?.price, state.settings.currency)} <span>por unidad</span></div>`
    : variants.length
      ? `<div class="menu-variants" aria-label="${product.category === "Pizzas" ? "Tamaño" : "Presentación"} de ${esc(product.name)}">${variants.map((option) => `<button type="button" class="menu-variant ${option.name === selected ? "selected" : ""}" data-action="select-variant:${encodeURIComponent(product.id)}:${encodeURIComponent(option.name)}" aria-pressed="${option.name === selected}"><span>${esc(option.name)}</span><strong>${formatMoney(option.price, state.settings.currency)}</strong></button>`).join("")}</div>`
      : `<p class="small muted">Este producto todavía no tiene presentaciones. Actualiza sus precios en Menú.</p>`;
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
  const categories = state.settings.menuCategories || [...new Set(state.menu.map((product) => product.category))];
  const productsByCategory = categories.map((category) => ({
    category,
    products: state.menu.filter((product) => product.active && product.category === category),
  }));
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
      ${draft.channel === "dinein" ? `<div class="form-field"><p class="field-hint">Pedido para consumir en el salón.</p></div>` : `<div class="form-field"><label for="order-customer">Nombre del pedido</label><input id="order-customer" class="form-control" name="customerName" maxlength="70" required placeholder="Ej.: Andrea" value="${esc(draft.customerName)}"></div>`}
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
    ${paymentMethods.length ? `<fieldset class="payment-method-field wizard-section"><legend>Medio de pago</legend><div class="payment-options" role="radiogroup" aria-label="Medio de pago">${paymentMethods.map((method, index) => `<span class="channel-option payment-option"><input type="radio" id="order-payment-${index}" name="paymentMethod" value="${esc(method)}" ${method === draft.paymentMethod ? "checked" : ""} required><label for="order-payment-${index}">${icon(method === "Efectivo" ? "wallet" : "card")}${esc(method)}</label></span>`).join("")}</div><span class="field-hint">Recibe el pago antes de enviar el pedido a cocina.</span></fieldset>` : `<div class="notice danger-note wizard-section">${icon("alert")}<span>Activa al menos un medio de pago en Ajustes para enviar este pedido.</span></div>`}
    ${!activeCashSession(state) ? `<div class="notice wizard-section">${icon("alert")}<span>El pedido se podrá enviar, pero el pago no se asociará a un turno de Caja abierto.</span></div>` : ""}
    <span id="order-form-live" class="sr-only" aria-live="polite"></span>
  </form>`;
}

function productVariantRow(category, variant, index) {
  const isDrink = category === "Bebidas";
  const label = isDrink
    ? `Presentación ${index + 1}`
    : index === 0 ? "Presentación principal" : `Presentación ${index + 1}`;
  const placeholder = isDrink
    ? index === 0 ? "Ej.: Unidad" : "Ej.: 1,5 L"
    : ["Ej.: Personal", "Ej.: Mediana", "Ej.: Grande"][index] || "Ej.: Familiar";
  return `<div class="product-variant-row" data-variant-row="${index}">
    <div class="form-field"><label for="variant-name-${index}">${label}</label><input id="variant-name-${index}" class="form-control" name="variantName${index + 1}" maxlength="30" ${index === 0 ? "required" : ""} placeholder="${placeholder}" value="${esc(variant?.name || "")}"></div>
    <div class="product-variant-price"><div class="form-field"><label for="variant-price-${index}">Precio</label><input id="variant-price-${index}" class="form-control" name="variantPrice${index + 1}" type="number" min="0.01" step="0.01" ${index === 0 ? "required" : ""} placeholder="0.00" value="${variant?.price ?? ""}"></div>
    <button type="button" class="icon-button variant-remove" data-action="remove-product-variant:${index}" aria-label="Quitar presentación ${index + 1}" title="Quitar presentación">${icon("close")}</button></div>
  </div>`;
}

function productVariantsFromForm(form) {
  return [...form.querySelectorAll("[data-variant-row]")].map((row) => ({
    name: row.querySelector('input[name^="variantName"]').value,
    price: row.querySelector('input[name^="variantPrice"]').value,
  }));
}

function renderProductVariantRows(form, variants, focusIndex = null) {
  const category = form.elements.category.value;
  const container = form.querySelector(".product-variants-grid");
  container.innerHTML = variants.map((variant, index) => productVariantRow(category, variant, index)).join("");
  if (focusIndex !== null) container.querySelector(`#variant-name-${focusIndex}`)?.focus();
}

function menuEditorForm(product, selectedCategory = "Pizzas") {
  const category = product?.category || selectedCategory;
  const categories = ["Pizzas", "Bebidas"];
  const variants = category === "Bebidas"
    ? product?.variants || [{ name: "Unidad", price: "" }]
    : product?.variants || [{ name: "Personal", price: "" }, { name: "Mediana", price: "" }, { name: "Grande", price: "" }];
  return `<form id="product-form" data-form="product">
    <input type="hidden" name="id" value="${esc(product?.id || "")}">
    <div class="form-stack">
      <div class="form-field"><label for="product-name">Nombre del producto</label><input id="product-name" class="form-control" name="name" maxlength="55" required placeholder="Ej.: Pizza napolitana" value="${esc(product?.name || "")}"></div>
      <div class="form-field"><label for="product-category">Categoría</label><select id="product-category" class="form-select" name="category" required>${categories.map((item) => `<option value="${esc(item)}" ${category === item ? "selected" : ""}>${esc(item)}</option>`).join("")}</select></div>
      <div class="product-variants-grid">${variants.map((variant, index) => productVariantRow(category, variant, index)).join("")}</div>
      ${button("add-product-variant", "Agregar presentación", { kind: "soft", extra: "small-button", icon: "plus" })}
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
        body: `<p class="small muted" style="line-height:1.6">La identidad y los permisos que aparecen en pantalla son una simulación. No son cuentas de usuario reales.</p><div>${state.team.map((member) => `<button type="button" class="role-card" style="width:100%;text-align:left;cursor:pointer;margin-top:8px" data-action="switch-member:${esc(member.id)}"><span class="avatar">${esc(initials(member.name))}</span><span class="role-card-main"><strong>${esc(member.name)}</strong><span>${memberRoleLabel(member.role)} · perfil local</span></span>${member.id === state.activeMemberId ? badge("Actual", "preparing") : icon("arrow")}</button>`).join("")}</div>`,
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
        body: `<form id="close-cash-form" data-form="cash-close"><div class="form-stack"><div class="notice">${icon("alert")}<span>Se incluyen los pagos de los pedidos confirmados durante este turno. Cuenta el efectivo real antes de cerrar.</span></div><section class="cash-close-summary"><div class="stat-row total"><span>Total generado</span><strong>${formatMoney(totalGenerated, state.settings.currency)}</strong></div><div class="stat-row"><span>Efectivo</span><strong>${formatMoney(cash, state.settings.currency)}</strong></div><div class="stat-row"><span>QR</span><strong>${formatMoney(qr, state.settings.currency)}</strong></div>${otherTotals}</section><div class="form-field"><label for="counted-amount">Efectivo contado al cierre</label><input id="counted-amount" class="form-control" type="number" name="amount" min="0" step="0.01" required placeholder="0.00"></div><p class="small muted">Efectivo esperado en caja (incluye la apertura): <strong>${formatMoney(expected, state.settings.currency)}</strong> · la diferencia se calculará al guardar.</p><div class="form-field"><label for="close-notes">Observación (opcional)</label><textarea class="form-textarea" id="close-notes" name="notes" maxlength="250" placeholder="Comentario del cierre"></textarea></div></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">${icon("check")}Cerrar turno</button></div></form>`,
        footer: "",
      };
    }
    case "product-edit":
      return { body: menuEditorForm(current.data.product, current.data.category), footer: "" };
    case "team-add":
      return {
        body: `<form id="member-form" data-form="member"><div class="form-stack"><div class="form-field"><label for="member-name">Nombre</label><input class="form-control" id="member-name" name="name" required maxlength="60" placeholder="Ej.: Alex"></div><div class="form-field"><label for="member-email">Correo electrónico</label><input class="form-control" id="member-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="alex@correo.com"></div><div class="form-field"><label for="member-role">Tipo de cuenta</label><select class="form-select" id="member-role" name="role" required><option value="worker">Trabajador</option><option value="admin">Administrador</option></select></div><p class="small muted">Se enviará un enlace de invitación. El usuario define su contraseña al aceptar.</p></div><div class="form-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button primary" type="submit">Enviar invitación</button></div></form>`,
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
      "assign-delivery": "Asignar repartidor",
      "product-edit": options.product ? "Editar producto" : "Agregar producto",
      "team-add": "Agregar una cuenta",
      confirm: options.title || "Confirmar acción",
    }[kind] || "Detalle"),
    description: options.description || ({
      "new-order": "Elige los productos y sus detalles. El pedido quedará guardado en este dispositivo.",
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
  if (!isAdmin() && !state.team.some((member) => member.id === state.activeMemberId && member.role !== "owner")) {
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
  const categories = state.settings.menuCategories || ["Pizzas", "Bebidas"];
  draft.category = ["all", ...categories].includes(draft.category) ? draft.category : "all";
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
  if (draft.tableId && !state.tables.some((table) => table.id === draft.tableId)) {
    notify("La mesa seleccionada ya no está disponible.", "error");
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
    notes: draft.channel === "dinein" ? "" : draft.notes.trim(),
    paymentMethod: draft.paymentMethod,
    items: draft.items,
    status: "new",
    createdAt: new Date().toISOString(),
    createdBy: authenticatedUser?.id || state.activeMemberId,
    deliveryPersonId: "",
    payment: { method: draft.paymentMethod, amount: orderTotal({ items: draft.items }), paidAt: new Date().toISOString() },
  };
  const stored = persist((next) => {
    next.orders.push(order);
    const session = next.cashSessions.find((item) => !item.closedAt);
    if (session) session.transactions.push({ orderId: order.id, ...order.payment });
  });
  if (!stored) return;
  modal = null;
  draft = null;
  screen = "orders";
  render();
  playNotification();
  publishNotification(order);
  notify(`Pedido ${orderDisplayId(order)} confirmado y pago registrado.`, "success");
}

function initialiseAudio() {
  if (!window.AudioContext) throw new Error("Este navegador no permite avisos sonoros.");
  if (!audioContext) audioContext = new AudioContext();
  return audioContext.resume().catch((error) => {
    audioContext = null;
    throw error;
  });
}

function playNotification() {
  if (!soundEnabledOnDevice || !audioContext) return;
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

function playReadyNotification() {
  if (!soundEnabledOnDevice || !audioContext) return;
  try {
    if (audioContext.state === "suspended") {
      audioContext.resume().then(playReadyNotification).catch((error) => {
        console.error("No se pudo reanudar el aviso sonoro de pedido listo.", error);
        notify("El navegador bloqueó el sonido del pedido listo.", "warning");
      });
      return;
    }
    const startAt = audioContext.currentTime;
    [587.33, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = startAt + index * 0.13;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.3);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.31);
    });
  } catch (error) {
    console.error("No se pudo reproducir el aviso de pedido listo.", error);
    notify("No se pudo reproducir el sonido de pedido listo en este dispositivo.", "warning");
  }
}

function notifyOrderReady(order) {
  playReadyNotification();
  notify(`Pedido listo · ${orderDisplayId(order)} · ${channelLabel(order.channel)}`, "ready", 8000);
}

function publishNotification(order) {
  if (!notificationsEnabledOnDevice || !("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
  new Notification(`${state.settings.businessName}: pedido ${orderDisplayId(order)}`, {
    body: `${channelLabel(order.channel)} · ${getOrderItemSummary(order)}`,
    icon: "./assets/pizza.svg",
  });
}

function updateOrderStatus(orderId, status) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return notify("La comanda ya no está disponible.", "error");
  const authorized = status === "preparing"
    ? order.status === "new"
    : status === "ready"
      ? ["new", "preparing"].includes(order.status)
      : status === "delivered"
        ? order.status === "ready" && (order.channel === "delivery"
          ? (isAdmin() || (order.deliveryPersonId === state.activeMemberId))
          : true)
        : false;
  if (!authorized) {
    notify("Este perfil no puede cambiar ese estado.", "error");
    return;
  }
  if (persist((next) => {
    const target = next.orders.find((item) => item.id === orderId);
    target.status = status;
    target.updatedAt = new Date().toISOString();
  }, status === "ready" ? undefined : `Comanda ${orderDisplayId(order)}: ${statusMeta(status)[0].toLowerCase()}.`)) {
    modal = null;
    render();
    if (status === "ready") notifyOrderReady(order);
  }
}

function commitCloseCash(amount, notes) {
  const session = activeCashSession(state);
  if (!isAdmin() || !session) return notify("Solo el administrador puede cerrar la caja.", "error");
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
  }, "Caja cerrada. Descargando el balance de Excel.")) {
    closeModal();
    exportCashExcel();
  }
}

function addMenuProduct(formData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "");
  if (!name || !["Pizzas", "Bebidas"].includes(category)) {
    notify("Completa el nombre y una categoría válida.", "warning");
    return;
  }
  const variants = [];
  for (let index = 1; formData.has(`variantName${index}`) || formData.has(`variantPrice${index}`); index += 1) {
    const variantName = String(formData.get(`variantName${index}`) || "").trim();
    const rawPrice = formData.get(`variantPrice${index}`);
    if (!variantName && !rawPrice) continue;
    const price = Number(rawPrice);
    if (!variantName || !Number.isFinite(price) || price <= 0) return notify(`Completa correctamente el nombre y el precio de la presentación ${index}.`, "warning");
    variants.push({ name: variantName, price });
  }
  if (!variants.length) return notify("Agrega al menos una variante con un precio válido.", "warning");
  const duplicate = state.menu.some((product) => product.name.toLowerCase() === name.toLowerCase() && product.id !== id);
  if (duplicate) return notify("Ya existe un producto con ese nombre.", "warning");
  if (persist((next) => {
    if (id) {
      const target = next.menu.find((product) => product.id === id);
      if (!target) throw new Error("El producto fue eliminado. Actualiza el menú e inténtalo de nuevo.");
      Object.assign(target, { name, category, variants, active: true });
    } else {
      next.menu.push({ id: localId("item"), name, category, variants, active: true });
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
  if (target.matches("[data-member-role]")) {
    if (!isAdmin()) return notify("Solo el administrador puede modificar cuentas.", "error");
    const memberId = target.dataset.memberRole;
    const member = state.team.find((person) => person.id === memberId);
    if (!member || !["admin", "worker"].includes(target.value) || memberId === state.activeMemberId) return notify("No se puede modificar esa cuenta.", "warning");
    void changeStaffRole(member, target.value, target);
    return;
  }
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
    if (!form) return;
    const variants = productVariantsFromForm(form);
    if (target.value === "Bebidas" && variants[0]?.name === "Personal") variants[0].name = "Unidad";
    if (target.value === "Pizzas" && variants[0]?.name === "Unidad") variants[0].name = "Personal";
    renderProductVariantRows(form, variants);
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

async function submitForm(event) {
  const form = event.target;
  const data = new FormData(form);
  if (form.dataset.form === "login") {
    event.preventDefault();
    if (!form.reportValidity() || loginBusy) return;
    loginBusy = true;
    loginMessage = "";
    renderLogin();
    try {
      const user = await signIn(String(data.get("email") || "").trim(), String(data.get("password") || ""));
      await startAuthenticatedApp(user);
    } catch (error) {
      console.error("No se pudo iniciar sesión.", error);
      loginMessage = error.message || "No se pudo iniciar sesión.";
    } finally {
      loginBusy = false;
      if (!state) renderLogin();
    }
    return;
  }
  if (form.dataset.form === "password-update") {
    event.preventDefault();
    if (!form.reportValidity() || loginBusy) return;
    loginBusy = true;
    try {
      await updatePassword(String(data.get("password") || ""));
      passwordRecovery = false;
      loginMessage = "Contraseña actualizada.";
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) await startAuthenticatedApp(userData.user);
    } catch (error) {
      console.error("No se pudo actualizar la contraseña.", error);
      loginMessage = error.message || "No se pudo actualizar la contraseña.";
    } finally {
      loginBusy = false;
      if (!state) renderLogin();
    }
    return;
  }
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
    case "product":
      addMenuProduct(data);
      break;
    case "member": {
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const role = String(data.get("role") || "");
      if (!name || !email || !["admin", "worker"].includes(role)) return notify("Completa el nombre, correo y tipo de cuenta.", "warning");
      try {
        await inviteOrManageStaff("invite", { name, email, role });
        closeModal();
        notify(`Invitación enviada a ${email}.`);
        await refreshCurrentWorkspace();
      } catch (error) {
        console.error("No se pudo enviar la invitación.", error);
        notify(`No se pudo enviar la invitación: ${error.message || "error inesperado"}.`, "error", 6500);
      }
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
      const paymentMethods = data.getAll("paymentMethods").map(String);
      const menuCategories = [...new Set(String(data.get("menuCategories") || "").split(/\r?\n/).map((category) => category.trim()).filter(Boolean))];
      const extrasText = String(data.get("extrasText") || "");
      if (!businessName || !["BOB", "USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "CRC", "UYU", "GTQ"].includes(currency)) return notify("Revisa el nombre del negocio y la moneda.", "warning");
      if (!paymentMethods.length) return notify("Selecciona al menos un medio de pago.", "warning");
      if (!menuCategories.length) return notify("Agrega al menos una categoría para el menú.", "warning");
      const categoriesInUse = new Set(state.menu.map((product) => product.category));
      const removedCategory = [...categoriesInUse].find((category) => !menuCategories.includes(category));
      if (removedCategory) return notify(`No puedes quitar «${removedCategory}» porque todavía tiene productos.`, "warning");
      if (!menuCategories.includes("Pizzas") || !menuCategories.includes("Bebidas")) return notify("Las categorías Pizzas y Bebidas son necesarias para aplicar sus opciones especiales.", "warning");
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
      if (!persist((next) => Object.assign(next.settings, { businessName, currency, paymentMethods, menuCategories, extras }))) return;
      return notify("Ajustes guardados.");
    }
    default:
      console.warn("Formulario no reconocido:", form.dataset.form);
      notify("No se reconoció este formulario. Inténtalo otra vez.", "error");
  }
}

function switchMember(memberId) {
  if (memberId === authenticatedUser?.id) return notify("Esta es la cuenta autenticada en este dispositivo.", "status");
  return notify("Para cambiar de cuenta, cierra la sesión e inicia con otra cuenta.", "warning");
}

async function refreshCurrentWorkspace() {
  if (!authenticatedUser || !backendProfile) return;
  const latest = await refreshWorkspace(createInitialState(), authenticatedUser.id, backendProfile.role);
  backendRevision = latest.revision;
  state = validateState(latest.state);
  backendSyncBlocked = false;
  render();
}

async function changeStaffRole(member, role, control) {
  try {
    await inviteOrManageStaff("role", { userId: member.id, role });
    notify(`${member.name} ahora tiene acceso de ${role === "admin" ? "administrador" : "trabajador"}.`);
    await refreshCurrentWorkspace();
  } catch (error) {
    console.error("No se pudo cambiar el rol de la cuenta.", error);
    if (control.isConnected) control.value = memberRoleGroup(member.role);
    notify(`No se pudo cambiar el rol: ${error.message || "error inesperado"}.`, "error", 6500);
  }
}

async function handlePasswordReset() {
  const email = String(document.querySelector("#login-email")?.value || "").trim();
  if (!email) {
    loginMessage = "Escribe tu correo para recibir el enlace de recuperación.";
    renderLogin();
    document.querySelector("#login-email")?.focus();
    return;
  }
  try {
    await requestPasswordReset(email);
    loginMessage = "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.";
  } catch (error) {
    console.error("No se pudo solicitar el restablecimiento de contraseña.", error);
    loginMessage = error.message || "No se pudo solicitar el restablecimiento.";
  }
  renderLogin();
}

async function deleteStaffAccount(memberId) {
  const member = state.team.find((person) => person.id === memberId);
  if (!member || !isAdmin()) return notify("La cuenta ya no está disponible.", "warning");
  try {
    await inviteOrManageStaff("remove", { userId: memberId });
    closeModal();
    notify(`Se eliminó la cuenta de ${member.name}.`);
    await refreshCurrentWorkspace();
  } catch (error) {
    console.error("No se pudo eliminar la cuenta.", error);
    notify(`No se pudo eliminar la cuenta: ${error.message || "error inesperado"}.`, "error", 6500);
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
  if (!isAdmin()) {
    return notify("Solo el administrador puede exportar el balance de caja.", "error");
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

function exportDailyBalance() {
  if (!isAdmin()) return notify("Solo el administrador puede exportar el balance del día.", "error");
  try {
    const dateKey = todayKey();
    const workbook = createDailyBalanceWorkbook(state, dateKey);
    const file = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = dailyBalanceWorkbookFilename(dateKey);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    notify("El balance de ventas de hoy se descargó en Excel.");
  } catch (error) {
    console.error("No se pudo exportar el balance del día.", error);
    notify(`No se pudo descargar el balance del día: ${error.message || "error inesperado"}.`, "error");
  }
}

async function importData(file) {
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const validated = validateState(imported);
    if (backendProfile && !isAdmin()) return notify("Solo el administrador puede importar un respaldo.", "error");
    const confirmed = window.confirm("Importar este respaldo reemplazará los datos compartidos en Supabase. Haz una copia antes de continuar. ¿Quieres seguir?");
    if (!confirmed) return;
    if (backendProfile) {
      const currentTeam = state.team;
      const currentRole = state.activeRole;
      const currentMemberId = state.activeMemberId;
      if (!persist((next) => {
        Object.assign(next, validated, {
          team: currentTeam,
          activeRole: currentRole,
          activeMemberId: currentMemberId,
        });
      })) return;
      modal = null;
      screen = allowedScreen(screen) ? screen : "orders";
      render();
      notify("Se importaron los datos al espacio compartido.");
      return;
    }
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
    if (backendProfile && !isAdmin()) return notify("Solo el administrador puede restaurar los datos de ejemplo.", "error");
    const next = createInitialState();
    if (backendProfile) {
      const currentTeam = state.team;
      const currentRole = state.activeRole;
      const currentMemberId = state.activeMemberId;
      if (!persist((shared) => Object.assign(shared, next, {
        team: currentTeam,
        activeRole: currentRole,
        activeMemberId: currentMemberId,
      }))) return;
      modal = null;
      draft = null;
      screen = "orders";
      history.replaceState(null, "", "#orders");
      render();
      notify("Se restauraron los datos de ejemplo en Supabase.");
      return;
    }
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
  if (!isAdmin()) return notify("Solo el administrador puede eliminar cuentas.", "error");
  if (memberId === state.activeMemberId) return notify("No puedes eliminar la cuenta activa.", "warning");
  if (member.role === "owner" && state.team.filter((person) => person.role === "owner").length <= 1) return notify("Debe quedar al menos una cuenta administradora.", "warning");
  openModal("confirm", {
    title: "Eliminar cuenta",
    description: `Se quitará la cuenta «${member.name}». Sus pedidos y movimientos anteriores se conservarán.`,
    label: "Eliminar cuenta",
    action: `remove-member:${memberId}`,
  });
}

function render() {
  if (!state) {
    renderLogin();
    return;
  }
  if (!allowedScreen(screen)) screen = allowedScreen("orders") ? "orders" : "kitchen";
  const pages = {
    home: renderHome,
    orders: renderOrders,
    kitchen: renderKitchen,
    tables: renderTables,
    cash: () => renderCashPage(state, { badge, button, clockTime, emptyState, esc, formatMoney, hasActiveRole, icon, pageHeading, orderDisplayId }),
    menu: renderSettings,
    team: renderSettings,
    settings: renderSettings,
  };
  app.innerHTML = frame((pages[screen] || renderHome)());
  const clock = document.querySelector("#clock");
  if (clock) clock.textContent = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function renderLogin() {
  if (passwordRecovery) {
    app.innerHTML = `<main class="auth-page"><section class="auth-card">
      <div class="auth-brand"><span class="brand-mark"><img src="./assets/pizza.svg" alt="" /></span><div><strong>Il Mundo</strong><span>Gestión compartida</span></div></div>
      <h1>Crear contraseña nueva</h1>
      ${loginMessage ? `<div class="notice danger-note" role="alert">${icon("alert")}<span>${esc(loginMessage)}</span></div>` : ""}
      <form data-form="password-update"><div class="form-field"><label for="new-password">Nueva contraseña</label><input id="new-password" class="form-control" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></div><button class="button primary auth-submit" type="submit" ${loginBusy ? "disabled" : ""}>Guardar contraseña</button></form>
    </section></main>`;
    return;
  }
  app.innerHTML = `<main class="auth-page"><section class="auth-card">
    <div class="auth-brand"><span class="brand-mark"><img src="./assets/pizza.svg" alt="" /></span><div><strong>Il Mundo</strong><span>Gestión compartida</span></div></div>
    <h1>Iniciar sesión</h1>
    <p>Accede con la cuenta que te invitó el administrador.</p>
    ${loginMessage ? `<div class="notice danger-note" role="alert">${icon("alert")}<span>${esc(loginMessage)}</span></div>` : ""}
    <form data-form="login">
      <div class="form-field"><label for="login-email">Correo electrónico</label><input id="login-email" class="form-control" name="email" type="email" autocomplete="username" required maxlength="254" placeholder="nombre@correo.com"></div>
      <div class="form-field"><label for="login-password">Contraseña</label><input id="login-password" class="form-control" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></div>
      <button class="button primary auth-submit" type="submit" ${loginBusy ? "disabled" : ""}>${loginBusy ? "Conectando…" : "Entrar"}</button>
      <button class="auth-link" type="button" data-action="password-reset">Olvidé mi contraseña</button>
    </form>
    <p class="small muted">Las cuentas se crean mediante invitación de un administrador.</p>
    ${authenticatedUser ? `<button class="auth-link" type="button" data-action="sign-out">Cerrar la sesión actual</button>` : ""}
  </section></main>`;
}

async function startAuthenticatedApp(user) {
  if (authenticatedUser?.id === user.id && state) return;
  if (loadingUserId === user.id) return;
  loadingUserId = user.id;
  authenticatedUser = user;
  state = null;
  renderLoading("Cargando tu espacio de trabajo…");
  try {
    const profile = await getWorkspaceProfile(user.id);
    const workspace = await loadWorkspace(createInitialState(), user.id, profile.role);
    if (authenticatedUser?.id !== user.id) return;
    backendProfile = workspace.profile;
    backendRevision = workspace.revision;
    state = validateState(workspace.state);
    loginMessage = "";
    const requestedScreen = location.hash.slice(1);
    const defaultScreen = allowedScreen("orders") ? "orders" : "kitchen";
    screen = allowedScreen(requestedScreen) ? requestedScreen : defaultScreen;
    if (location.hash !== `#${screen}`) history.replaceState(null, "", `#${screen}`);
    render();
    startClock();
    backendUnsubscribe?.();
    backendUnsubscribe = subscribeWorkspace(async () => {
      if (!backendProfile || !authenticatedUser || pendingBackendWrites > 0) return;
      try {
        const latest = await refreshWorkspace(createInitialState(), authenticatedUser.id, backendProfile.role);
        if (latest.revision <= backendRevision) return;
        backendRevision = latest.revision;
        announceOrdersCreated(validateState(latest.state));
      } catch (error) {
        console.error("No se pudo actualizar el espacio compartido.", error);
        notify(`No se pudo actualizar la información compartida: ${error.message}.`, "error", 6500);
        if (/rol de la cuenta|perfil/i.test(error.message)) void signOut();
      }
    }, (status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("El canal de sincronización de Supabase perdió la conexión.", status);
        notify("Se perdió la sincronización en tiempo real. Comprueba tu conexión.", "warning", 5000);
      }
    });
  } catch (error) {
    console.error("No se pudo cargar el espacio de trabajo.", error);
    backendProfile = null;
    state = null;
    loginMessage = error.message || "No se pudo cargar el espacio de trabajo.";
    renderLogin();
  } finally {
    if (loadingUserId === user.id) loadingUserId = "";
  }
}

function announceOrdersCreated(nextState) {
  const previousIds = new Set(state.orders.map((order) => order.id));
  const additions = nextState.orders.filter((order) => order.status === "new" && !previousIds.has(order.id));
  const previousOrders = new Map(state.orders.map((order) => [order.id, order]));
  const readyOrders = nextState.orders.filter((order) =>
    order.status === "ready" && previousOrders.has(order.id) && previousOrders.get(order.id).status !== "ready",
  );
  if (modal?.kind === "new-order") captureDraftForm();
  state = nextState;
  if (!modal) render();
  else renderModal();
  for (const order of readyOrders) notifyOrderReady(order);
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
  if (["settings", "menu"].includes(page)) settingsTab = "menu";
  if (page === "team") settingsTab = "users";
  screen = page;
  if (location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
  render();
}

function addProductToDraft(productId) {
  if (!draft) return;
  captureDraftForm();
  const product = state.menu.find((item) => item.id === productId && item.active);
  if (!product) return notify("Este producto ya no está disponible. Actualiza el menú.", "warning");
  const variants = selectableVariants(product);
  const variantName = draft.selectedVariants[product.id] || defaultOrderVariant(product)?.name;
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
    variant: variant.name,
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
  if (!isAdmin()) return notify("Solo el administrador puede asignar repartidores.", "error");
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
    case "add-product-variant": {
      const form = document.querySelector("#product-form");
      if (!form) return;
      const variants = productVariantsFromForm(form);
      variants.push({ name: "", price: "" });
      renderProductVariantRows(form, variants, variants.length - 1);
      return;
    }
    case "remove-product-variant": {
      const form = document.querySelector("#product-form");
      if (!form) return;
      const variants = productVariantsFromForm(form);
      if (variants.length <= 1) return notify("Cada producto necesita al menos una presentación.", "warning");
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= variants.length) return;
      variants.splice(index, 1);
      renderProductVariantRows(form, variants, Math.min(index, variants.length - 1));
      return;
    }
    case "refresh-workspace":
      refreshCurrentWorkspace().then(() => notify("Datos compartidos actualizados.")).catch((error) => {
        console.error("No se pudo actualizar el espacio compartido.", error);
        notify(`No se pudo actualizar: ${error.message || "error inesperado"}.`, "error", 6500);
      });
      return;
    case "sign-out":
      signOut().catch((error) => {
        console.error("No se pudo cerrar la sesión.", error);
        notify(`No se pudo cerrar sesión: ${error.message || "error inesperado"}.`, "error");
      });
      return;
    case "password-reset":
      void handlePasswordReset();
      return;
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
    case "settings-tab":
      if (!isAdmin() || !["menu", "users"].includes(value)) return notify("No se pudo abrir esta sección de configuración.", "warning");
      settingsTab = value;
      render();
      return;
    case "view-order":
      navigate("orders");
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
      if (!isAdmin()) return notify("Solo el administrador puede abrir la caja.", "error");
      if (activeCashSession(state)) return notify("La caja ya está abierta.", "warning");
      openModal("cash-open");
      return;
    case "close-cash":
      if (!isAdmin()) return notify("Solo el administrador puede cerrar la caja.", "error");
      if (!activeCashSession(state)) return notify("No hay una caja abierta.", "warning");
      openModal("cash-close");
      return;
    case "start-order":
      updateOrderStatus(value, "preparing");
      return;
    case "ready-order":
      updateOrderStatus(value, "ready");
      return;
    case "complete-order":
      updateOrderStatus(value, "ready");
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
      if (!isAdmin()) return notify("Solo el administrador puede asignar repartidores.", "error");
      const order = state.orders.find((item) => item.id === value);
      const couriers = state.team.filter((member) => member.role !== "owner");
      if (!order || order.deliveryPersonId || order.status === "delivered") return notify("Este pedido ya fue asignado o completado.", "warning");
      if (!couriers.length) return notify("Agrega un perfil de repartidor en Equipo antes de asignar este pedido.", "warning");
      openModal("assign-delivery", { orderId: value, couriers });
      return;
    }
    case "take-delivery": {
      const order = state.orders.find((item) => item.id === value);
      if (!order || order.channel !== "delivery" || order.deliveryPersonId || order.status === "delivered") return notify("Este pedido ya fue tomado o no está disponible.", "warning");
      if (persist((next) => {
        const target = next.orders.find((item) => item.id === value);
        if (!target || target.deliveryPersonId || target.status === "delivered") throw new Error("El pedido cambió en otra pestaña. Actualiza para ver quién lo tomó.");
        target.deliveryPersonId = state.activeMemberId;
      }, "Tomaste el pedido para entregar.")) return;
      return;
    }
    case "edit-product": {
      if (!isAdmin()) return notify("Solo el administrador puede editar el menú.", "error");
      if (value === "new") return openModal("product-edit", { product: null });
      const product = state.menu.find((item) => item.id === value);
      if (!product) return notify("El producto ya no está disponible.", "warning");
      openModal("product-edit", { product });
      return;
    }
    case "add-pizza":
    case "add-drink":
      if (!isAdmin()) return notify("Solo el administrador puede editar el menú.", "error");
      openModal("product-edit", { product: null, category: name === "add-drink" ? "Bebidas" : "Pizzas" });
      return;
    case "delete-product": {
      if (!isAdmin()) return notify("Solo el administrador puede borrar productos.", "error");
      const product = state.menu.find((item) => item.id === value);
      if (!product) return notify("El producto ya no está disponible.", "warning");
      openModal("confirm", {
        title: "Borrar producto",
        description: `Se quitará «${product.name}» del menú. Los pedidos anteriores conservarán el detalle vendido.`,
        label: "Borrar producto",
        action: `delete-product:${product.id}`,
      });
      return;
    }
    case "toggle-product": {
      if (!isAdmin()) return notify("Solo el administrador puede cambiar el menú.", "error");
      const product = state.menu.find((item) => item.id === value);
      if (!product) return notify("El producto ya no está disponible.", "warning");
      persist((next) => {
        const target = next.menu.find((item) => item.id === value);
        target.active = !target.active;
      }, `Se ${product.active ? "pausó" : "activó"} ${product.name}.`);
      return;
    }
    case "switch-role":
      notify("Para cambiar de cuenta, cierra la sesión e inicia con otra cuenta.", "warning");
      return;
    case "switch-member":
      switchMember(value);
      return;
    case "add-member":
      if (!isAdmin()) return notify("Solo el administrador puede administrar cuentas.", "error");
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
    case "export-daily-balance":
      exportDailyBalance();
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
        void deleteStaffAccount(memberId);
      }
      if (value.startsWith("delete-product:")) {
        if (!isAdmin()) return notify("Solo el administrador puede borrar productos.", "error");
        const productId = value.slice("delete-product:".length);
        const product = state.menu.find((item) => item.id === productId);
        if (!product) return notify("El producto ya no está disponible.", "warning");
        if (persist((next) => {
          next.menu = next.menu.filter((item) => item.id !== productId);
        }, `${product.name} se quitó del menú.`)) closeModal();
      }
      return;
    }
    case "enable-sound":
      if (!state.team.some((member) => member.id === state.activeMemberId)) return notify("Selecciona una cuenta válida para habilitar avisos.", "warning");
      try {
        void initialiseAudio().then(() => {
          localStorage.setItem(SOUND_ENABLED_KEY, "true");
          soundEnabledOnDevice = true;
          render();
          notify("Aviso sonoro activado en este dispositivo.");
          playNotification();
        }).catch((error) => {
          console.error("No se pudo habilitar el aviso sonoro.", error);
          notify(`No se pudo habilitar el aviso: ${error.message || "el navegador bloqueó el audio"}.`, "error");
        });
      } catch (error) {
        console.error("No se pudo habilitar el aviso sonoro.", error);
        notify(`No se pudo habilitar el aviso: ${error.message}.`, "error");
      }
      return;
    case "disable-sound":
      localStorage.setItem(SOUND_ENABLED_KEY, "false");
      soundEnabledOnDevice = false;
      render();
      notify("Aviso sonoro desactivado en este dispositivo.");
      return;
    case "toggle-alerts": {
      if (!("Notification" in window)) return notify("Este navegador no admite notificaciones en segundo plano.", "warning");
      if (Notification.permission === "granted") {
        const enabled = !notificationsEnabledOnDevice;
        notificationsEnabledOnDevice = enabled;
        localStorage.setItem("ilmundo.notifications.enabled", String(enabled));
        notify(enabled ? "Avisos del navegador activados." : "Avisos del navegador desactivados.");
      } else if (Notification.permission === "denied") {
        notify("El navegador bloqueó los avisos. Cámbialo en los permisos del sitio.", "warning", 5000);
      } else {
        Notification.requestPermission().then((permission) => {
          if (permission !== "granted") return notify("No se concedió permiso para mostrar avisos.", "warning");
          notificationsEnabledOnDevice = true;
          localStorage.setItem("ilmundo.notifications.enabled", "true");
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
    if (!state || !soundEnabledOnDevice || audioContext || audioUnavailableNotified) return;
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
  let authInitialized = false;
  let pendingAuthChange = null;
  const applyAuthChange = (event, session) => {
    if (event === "INITIAL_SESSION") {
      if (session?.user) void startAuthenticatedApp(session.user);
      else renderLogin();
      return;
    }
    if (event === "PASSWORD_RECOVERY") {
      passwordRecovery = true;
      loginMessage = "";
      renderLogin();
      return;
    }
    if (session?.user) {
      if (authenticatedUser?.id === session.user.id && state) return;
      void startAuthenticatedApp(session.user);
    } else if (event === "SIGNED_OUT") {
      backendUnsubscribe?.();
      backendUnsubscribe = null;
      loadingUserId = "";
      authenticatedUser = null;
      backendProfile = null;
      backendRevision = 0;
      passwordRecovery = false;
      state = null;
      modal = null;
      renderLogin();
    }
  };
  supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => {
      if (event === "INITIAL_SESSION") {
        authInitialized = true;
        const initialAuthChange = pendingAuthChange || { event, session };
        pendingAuthChange = null;
        applyAuthChange(initialAuthChange.event, initialAuthChange.session);
        return;
      }
      if (!authInitialized) {
        pendingAuthChange = { event, session };
        return;
      }
      applyAuthChange(event, session);
    }, 0);
  });
  registerServiceWorker();
}

startApp();
