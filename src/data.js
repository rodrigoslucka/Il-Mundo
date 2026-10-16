export const STORAGE_KEY = "ilmundo.pizzeria.v1";

export const ROLES = {
  owner: "Dueño",
  cashier: "Cajero",
  waiter: "Mozo",
  kitchen: "Cocina",
  delivery: "Repartidor",
};

export const NAVIGATION = [
  { id: "home", label: "Resumen", icon: "home", roles: ["owner", "cashier", "waiter", "kitchen", "delivery"] },
  { id: "orders", label: "Pedidos", icon: "receipt", roles: ["owner", "cashier", "waiter", "delivery"] },
  { id: "kitchen", label: "Cocina", icon: "chef", roles: ["owner", "cashier", "kitchen"] },
  { id: "tables", label: "Mesas", icon: "table", roles: ["owner", "cashier", "waiter"] },
  { id: "cash", label: "Caja", icon: "wallet", roles: ["owner", "cashier"] },
  { id: "menu", label: "Menú", icon: "menu", roles: ["owner"] },
  { id: "team", label: "Equipo", icon: "users", roles: ["owner"] },
  { id: "settings", label: "Ajustes", icon: "settings", roles: ["owner"] },
];

export function createInitialState() {
  return {
    version: 1,
    settings: {
      businessName: "Il Mundo",
      currency: "USD",
      paymentMethods: ["Efectivo", "QR"],
      deliveryFee: 2,
      extras: [
        { id: "extra-mozzarella", name: "Mozzarella extra", price: 1.5 },
        { id: "extra-champinones", name: "Champiñones", price: 1 },
        { id: "extra-aceitunas", name: "Aceitunas", price: 0.75 },
      ],
    },
    menu: [
      { id: "pizza-margarita", name: "Margarita", category: "Pizzas", active: true, variants: [{ name: "Personal", price: 8 }, { name: "Mediana", price: 13 }, { name: "Grande", price: 17 }] },
      { id: "pizza-pepperoni", name: "Pepperoni", category: "Pizzas", active: true, variants: [{ name: "Personal", price: 9 }, { name: "Mediana", price: 14 }, { name: "Grande", price: 19 }] },
      { id: "pizza-cuatro-quesos", name: "Cuatro quesos", category: "Pizzas", active: true, variants: [{ name: "Personal", price: 10 }, { name: "Mediana", price: 15 }, { name: "Grande", price: 20 }] },
      { id: "pizza-vegetariana", name: "Vegetariana", category: "Pizzas", active: true, variants: [{ name: "Personal", price: 9 }, { name: "Mediana", price: 14 }, { name: "Grande", price: 18 }] },
      { id: "bebida-cola", name: "Gaseosa de cola", category: "Bebidas", active: true, variants: [{ name: "Lata", price: 2.5 }, { name: "1,5 L", price: 5 }] },
      { id: "bebida-agua", name: "Agua mineral", category: "Bebidas", active: true, variants: [{ name: "500 ml", price: 1.5 }] },
      { id: "bebida-limonada", name: "Limonada", category: "Bebidas", active: true, variants: [{ name: "Vaso", price: 3 }] },
    ],
    team: [
      { id: "staff-owner", name: "Dueño", role: "owner" },
      { id: "staff-cashier", name: "Cajero", role: "cashier" },
      { id: "staff-waiter", name: "Mozo", role: "waiter" },
      { id: "staff-kitchen", name: "Cocina", role: "kitchen" },
      { id: "staff-delivery", name: "Repartidor", role: "delivery" },
    ],
    tables: [
      { id: "mesa-1", name: "Mesa 1", seats: 2 },
      { id: "mesa-2", name: "Mesa 2", seats: 2 },
      { id: "mesa-3", name: "Mesa 3", seats: 2 },
      { id: "mesa-4", name: "Mesa 4", seats: 4 },
      { id: "mesa-5", name: "Mesa 5", seats: 4 },
      { id: "mesa-6", name: "Mesa 6", seats: 4 },
      { id: "mesa-7", name: "Mesa 7", seats: 6 },
      { id: "mesa-8", name: "Mesa 8", seats: 6 },
    ],
    orders: [],
    cashSessions: [],
    notices: [],
    activeRole: "owner",
    activeMemberId: "staff-owner",
    tutorialSeen: false,
  };
}

export function validateState(value) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== 1 ||
    !value.settings ||
    !Array.isArray(value.menu) ||
    !Array.isArray(value.team) ||
    !Array.isArray(value.tables) ||
    !Array.isArray(value.orders) ||
    !Array.isArray(value.cashSessions) ||
    !Array.isArray(value.settings.paymentMethods) ||
    !Array.isArray(value.settings.extras) ||
    !value.team.every((member) => typeof member.id === "string" && typeof member.name === "string" && Object.hasOwn(ROLES, member.role)) ||
    !Object.hasOwn(ROLES, value.activeRole)
  ) {
    throw new Error("El archivo no contiene datos de Il Mundo compatibles.");
  }
  return value;
}

export function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    const initialState = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }
  return validateState(JSON.parse(stored));
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function todayKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function activeCashSession(state) {
  return state.cashSessions.find((session) => !session.closedAt);
}

export function orderTotal(order) {
  const items = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return items + (order.channel === "delivery" ? Number(order.deliveryFee || 0) : 0);
}

export function formatMoney(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch (error) {
    console.error("No se pudo formatear la moneda configurada.", error);
    return `${Number(amount || 0).toFixed(2)} ${currency}`;
  }
}
