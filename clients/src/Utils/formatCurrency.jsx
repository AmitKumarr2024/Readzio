export function formatCurrency(amount, currency = "USD") {
  // Formats amount as currency (e.g., USD)
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch (e) {
    console.error("[formatCurrency] Formatting error:", e);
    return "Invalid amount";
  }
}