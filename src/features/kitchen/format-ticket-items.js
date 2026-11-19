export function formatKitchenTicketItems(items) {
  return items.map((item) =>
    `${item.quantity}× ${item.name}${item.variant ? ` · ${item.variant}` : ""}`,
  );
}
