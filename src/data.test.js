import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, orderServiceFee, orderSubtotal, orderTotal, validateState } from "./data.js";

test("adds Tarjeta as a payment method for new and existing saved states", () => {
  const initialState = createInitialState();
  assert.deepEqual(initialState.settings.paymentMethods, ["Efectivo", "QR", "Tarjeta"]);

  const savedState = createInitialState();
  savedState.settings.paymentMethods = ["Efectivo", "QR"];
  validateState(savedState);
  assert.deepEqual(savedState.settings.paymentMethods, ["Efectivo", "QR", "Tarjeta"]);
});

test("adds a rounded 5% service fee to Dinky orders only", () => {
  const dinkyOrder = {
    channel: "dinky",
    items: [{ price: 10.01, quantity: 1 }],
  };
  const regularOrder = { ...dinkyOrder, channel: "pickup" };

  assert.equal(orderSubtotal(dinkyOrder), 10.01);
  assert.equal(orderServiceFee(dinkyOrder), 0.5);
  assert.equal(orderTotal(dinkyOrder), 10.51);
  assert.equal(orderServiceFee(regularOrder), 0);
  assert.equal(orderTotal(regularOrder), 10.01);
});
