export function createPaymentTotals(transactions, paymentMethods = ["Efectivo", "QR"]) {
  const totals = Object.fromEntries(
    paymentMethods.filter((method) => ["Efectivo", "QR"].includes(method)).map((method) => [method, 0]),
  );
  for (const transaction of transactions) {
    totals[transaction.method] = (totals[transaction.method] || 0) + transaction.amount;
  }
  return totals;
}
