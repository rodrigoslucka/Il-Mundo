import { orderTotal } from "../../data.js";

export const ORDER_PAYMENT_METHODS = ["Efectivo", "QR", "Tarjeta"];

export function paidOrders(orders) {
  return orders.filter((order) => Boolean(order.payment?.paidAt));
}

export function sendEditedOrderToKitchen(state, orderId, changes, updatedAt) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("El pedido ya no está disponible.");
  if (order.status !== "ready" || order.payment?.paidAt) {
    throw new Error("Solo se pueden editar pedidos listos que aún no estén pagados.");
  }
  Object.assign(order, {
    channel: changes.channel,
    tableId: changes.tableId,
    tableName: changes.tableName,
    customerName: changes.customerName,
    phone: changes.phone,
    address: changes.address,
    notes: changes.notes,
    items: changes.items,
    status: "new",
    updatedAt,
  });
  return order;
}

export function closeReadyOrder(state, orderId, method, paidAt) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("El pedido ya no está disponible.");
  if (order.status !== "ready" || order.payment?.paidAt) {
    throw new Error("Solo se pueden cobrar pedidos listos que aún no estén pagados.");
  }
  if (!ORDER_PAYMENT_METHODS.includes(method)) throw new Error("El medio de pago no es válido.");

  const payment = {
    method,
    amount: orderTotal(order),
    paidAt,
  };
  order.payment = payment;
  order.paymentMethod = method;
  order.status = "delivered";
  order.updatedAt = paidAt;
  order.deliveredAt = paidAt;

  const session = state.cashSessions.find((item) => !item.closedAt);
  if (session) session.transactions.push({ orderId: order.id, ...payment });
  return order;
}
