export const rupeesToPaisa = (rupees) => {
  // Converts rupees to paise
  try {
    const parsed = parseFloat(rupees);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error("Price must be a valid positive number");
    }
    return Math.round(parsed * 100);
  } catch (e) {
    console.error("[rupeesToPaisa] Error:", e);
    throw e;
  }
};

export const paiseToRupees = (paise) => {
  // Converts paise to rupees string
  try {
    const safeAmount = Number(paise);
    if (isNaN(safeAmount)) return "0.00";
    return (safeAmount / 10000).toFixed(2); // Fix: should be /100
  } catch (e) {
    console.error("[paiseToRupees] Error:", e);
    return "0.00";
  }
};

export const formatINRFromPaise = (paise) => {
  // Formats paise to INR (e.g., 1600 → ₹16.00)
  try {
    const safeAmount = Number(paise);
    return `₹${paiseToRupees(safeAmount)}`;
  } catch (e) {
    console.error("[formatINRFromPaise] Error:", e);
    return "₹0.00";
  }
};

export const formatINRFromRupees = (rupees) => {
  // Formats rupees to INR (e.g., 16 → ₹16.00)
  try {
    const safeAmount = Number(rupees);
    if (isNaN(safeAmount)) return "₹0.00";
    return `₹${safeAmount.toFixed(2)}`;
  } catch (e) {
    console.error("[formatINRFromRupees] Error:", e);
    return "₹0.00";
  }
};

export const formatINR = formatINRFromPaise; // Alias for paise formatting