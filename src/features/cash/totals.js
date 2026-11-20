export function createPaymentTotals(transactions, paymentMethods = ["Efectivo", "QR", "Tarjeta"]) {
  const totals = Object.fromEntries(
    paymentMethods.map((method) => [method, 0]),
  );
  for (const transaction of transactions) {
    totals[transaction.method] = Number(totals[transaction.method] || 0) + Number(transaction.amount);
  }
  return totals;
}
