import assert from "node:assert/strict";
import { test } from "node:test";
import { closeReadyOrder, paidOrders, removeReadyOrder, sendEditedOrderToKitchen } from "./workflow.js";

function stateWithReadyOrder() {
  return {
    orders: [{
      id: "order-1",
      status: "ready",
      items: [{ price: 12, quantity: 2 }],
    }],
    cashSessions: [{ closedAt: null, transactions: [] }],
  };
}

test("closes a ready order with the selected card payment and records it in cash", () => {
  const state = stateWithReadyOrder();

  const order = closeReadyOrder(state, "order-1", "Tarjeta", "2026-11-19T23:00:00.000Z");

  assert.equal(order.status, "delivered");
  assert.deepEqual(order.payment, {
    method: "Tarjeta",
    amount: 24,
    paidAt: "2026-11-19T23:00:00.000Z",
  });
  assert.deepEqual(state.cashSessions[0].transactions, [{
    orderId: "order-1",
    ...order.payment,
  }]);
});

test("does not close an order before it is ready or allow duplicate payments", () => {
  const state = stateWithReadyOrder();
  state.orders[0].status = "preparing";
  assert.throws(() => closeReadyOrder(state, "order-1", "Efectivo", "now"), /pedidos listos/);
  state.orders[0].status = "ready";
  state.orders[0].payment = { paidAt: "already-paid" };
  assert.throws(() => closeReadyOrder(state, "order-1", "QR", "now"), /pedidos listos/);
});

test("rejects unsupported payment methods", () => {
  assert.throws(
    () => closeReadyOrder(stateWithReadyOrder(), "order-1", "Cheque", "now"),
    /medio de pago no es válido/,
  );
});

test("rounds the payment amount to the displayed currency precision", () => {
  const state = stateWithReadyOrder();
  state.orders[0].items = [
    { price: 0.1, quantity: 1 },
    { price: 0.2, quantity: 1 },
  ];

  const order = closeReadyOrder(state, "order-1", "QR", "2026-11-19T23:00:00.000Z");

  assert.equal(order.payment.amount, 0.3);
});

test("adds and records the 5% Dinky service fee", () => {
  const state = stateWithReadyOrder();
  state.orders[0].channel = "dinky";

  const order = closeReadyOrder(state, "order-1", "QR", "2026-11-19T23:00:00.000Z");

  assert.equal(order.payment.amount, 25.2);
  assert.equal(state.cashSessions[0].transactions[0].amount, 25.2);
});

test("sends an edited ready order back to the kitchen as a new order", () => {
  const state = stateWithReadyOrder();

  const order = sendEditedOrderToKitchen(state, "order-1", {
    channel: "pickup",
    tableId: "",
    tableName: "",
    customerName: "Ana",
    phone: "",
    address: "",
    notes: "Sin cebolla",
    items: [{ price: 14, quantity: 1 }],
  }, "2026-11-19T23:00:00.000Z");

  assert.equal(order.status, "new");
  assert.equal(order.customerName, "Ana");
  assert.equal(order.notes, "Sin cebolla");
  assert.equal(order.updatedAt, "2026-11-19T23:00:00.000Z");
});

test("does not allow editing an order after payment", () => {
  const state = stateWithReadyOrder();
  state.orders[0].payment = { paidAt: "already-paid" };
  assert.throws(
    () => sendEditedOrderToKitchen(state, "order-1", {}, "now"),
    /pedidos listos que aún no estén pagados/,
  );
});

test("keeps only paid orders in the sales list", () => {
  const orders = [
    { id: "paid", payment: { paidAt: "2026-11-19T23:00:00.000Z" } },
    { id: "waiting", status: "ready" },
  ];

  assert.deepEqual(paidOrders(orders).map((order) => order.id), ["paid"]);
});

test("removes only a ready, unpaid order", () => {
  const state = stateWithReadyOrder();

  const removed = removeReadyOrder(state, "order-1");

  assert.equal(removed.id, "order-1");
  assert.deepEqual(state.orders, []);
  assert.throws(() => removeReadyOrder(state, "order-1"), /ya no está disponible/);
});

test("does not remove an order that is not ready or has been paid", () => {
  const state = stateWithReadyOrder();
  state.orders[0].status = "preparing";
  assert.throws(() => removeReadyOrder(state, "order-1"), /pedidos listos/);
  assert.equal(state.orders.length, 1);

  state.orders[0].status = "ready";
  state.orders[0].payment = { paidAt: "already-paid" };
  assert.throws(() => removeReadyOrder(state, "order-1"), /pedidos listos/);
  assert.equal(state.orders.length, 1);
});
