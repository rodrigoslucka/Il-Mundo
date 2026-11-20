import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, validateState } from "./data.js";

test("adds Tarjeta as a payment method for new and existing saved states", () => {
  const initialState = createInitialState();
  assert.deepEqual(initialState.settings.paymentMethods, ["Efectivo", "QR", "Tarjeta"]);

  const savedState = createInitialState();
  savedState.settings.paymentMethods = ["Efectivo", "QR"];
  validateState(savedState);
  assert.deepEqual(savedState.settings.paymentMethods, ["Efectivo", "QR", "Tarjeta"]);
});
