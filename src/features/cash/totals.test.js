import assert from "node:assert/strict";
import { test } from "node:test";
import { createPaymentTotals } from "./totals.js";

test("reports card payments alongside cash and QR", () => {
  assert.deepEqual(
    createPaymentTotals([
      { method: "Efectivo", amount: 10 },
      { method: "QR", amount: 5 },
      { method: "Tarjeta", amount: 8 },
    ]),
    { Efectivo: 10, QR: 5, Tarjeta: 8 },
  );
});

test("adds amounts saved as numeric strings without concatenating them", () => {
  assert.deepEqual(
    createPaymentTotals([{ method: "Tarjeta", amount: "8" }]),
    { Efectivo: 0, QR: 0, Tarjeta: 8 },
  );
});
