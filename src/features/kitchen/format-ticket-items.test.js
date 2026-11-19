import assert from "node:assert/strict";
import { test } from "node:test";
import { formatKitchenTicketItems } from "./format-ticket-items.js";

test("formats each ordered product with its quantity and variant", () => {
  assert.deepEqual(
    formatKitchenTicketItems([
      { quantity: 1, name: "Margarita", variant: "Media" },
      { quantity: 2, name: "Limonada", variant: "" },
    ]),
    ["1× Margarita · Media", "2× Limonada"],
  );
});
