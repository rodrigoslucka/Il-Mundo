import { normalizePizzaVariants } from "../../data.js";

export function largePizzaPrice(product) {
  if (!product || product.active !== true || product.category !== "Pizzas") return null;

  const variant = normalizePizzaVariants(product.variants)
    .find((item) => item.name.trim().toLowerCase() === "grande");
  if (!variant || (typeof variant.price !== "number" && typeof variant.price !== "string") || String(variant.price).trim() === "") {
    return null;
  }

  const price = Number(variant.price);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function halfAndHalfPrice(firstPrice, secondPrice) {
  if (
    !Number.isFinite(firstPrice)
    || !Number.isFinite(secondPrice)
    || firstPrice < 0
    || secondPrice < 0
  ) {
    throw new Error("Los precios de las dos mitades deben ser válidos.");
  }

  return Math.round(((firstPrice + secondPrice) / 2) * 100) / 100;
}
