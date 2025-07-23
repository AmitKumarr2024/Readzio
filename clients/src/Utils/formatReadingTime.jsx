// utils/formatTimeSpent.js
export function formatTimeSpent(minutes) {
  const mins = Math.floor(minutes);

  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours < 24) {
    return `${hours} hr${hours !== 1 ? "s" : ""}${remainingMins ? ` ${remainingMins} min` : ""}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days < 365) {
    return `${days} day${days !== 1 ? "s" : ""}${remainingHours ? ` ${remainingHours} hr` : ""}`;
  }

  const years = Math.floor(days / 365);
  const remainingDays = days % 365;

  return `${years} year${years !== 1 ? "s" : ""}${remainingDays ? ` ${remainingDays} day` : ""}`;
}
