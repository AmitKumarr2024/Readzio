export const logMemory = (label = "Memory") => {
  const used = process.memoryUsage();
  const formatted = Object.entries(used)
    .map(([key, val]) => `${key}: ${(val / 1024 / 1024).toFixed(2)} MB`)
    .join(" | ");
  console.log(`🧠 ${label}: ${formatted}`);
};
