import assert from "node:assert/strict";
import { test } from "node:test";
import { halfAndHalfPrice, largePizzaPrice } from "./half-and-half.js";

test("uses the average of both large-pizza prices", () => {
  assert.equal(halfAndHalfPrice(100, 105), 102.5);
  assert.equal(halfAndHalfPrice(10.01, 10.02), 10.02);
});

test("only returns a price for active pizzas with a valid Grande variant", () => {
  assert.equal(largePizzaPrice({
    active: true,
    category: "Pizzas",
    variants: [{ name: "Media", price: 20 }, { name: "Grande", price: "30" }],
  }), 30);
  assert.equal(largePizzaPrice({
    active: true,
    category: "Pizzas",
    variants: [{ name: "Media", price: 20 }],
  }), null);
  assert.equal(largePizzaPrice({
    active: false,
    category: "Pizzas",
    variants: [{ name: "Grande", price: 30 }],
  }), null);
  assert.equal(largePizzaPrice({
    active: true,
    category: "Bebidas",
    variants: [{ name: "Grande", price: 30 }],
  }), null);
});

test("rejects invalid half-and-half prices", () => {
  assert.throws(() => halfAndHalfPrice(Number.NaN, 10), /precios.*válidos/);
  assert.throws(() => halfAndHalfPrice(-1, 10), /precios.*válidos/);
});
