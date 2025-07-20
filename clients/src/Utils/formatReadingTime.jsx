export function formatReadingTime(seconds) {
  // Formats reading time from seconds
  if (seconds >= 36000) return "10+ hrs reading";
  if (seconds >= 3600)
    return `${Math.floor(seconds / 3600)} hr ${Math.floor((seconds % 3600) / 60)} min read`;
  if (seconds >= 60)
    return `${Math.floor(seconds / 60)} min read`;
  return "Less than a minute read";
}