export const rupeesToPaise = (amount) => Math.round(Number(amount) * 100);
export const paiseToRupees = (amount) => (Number(amount) / 100).toFixed(2);