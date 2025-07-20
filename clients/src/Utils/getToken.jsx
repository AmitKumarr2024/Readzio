export const getToken = () => {
  // Fetches JWT from localStorage
  const localToken = localStorage.getItem("jwt");
  // Log token check for debugging
  console.log("[getToken] Token check:", {
    source: localToken ? "localStorage" : "none",
    localToken: localToken ? "present" : "missing",
    finalToken: localToken ? localToken.slice(0, 10) + "..." : "null",
  });
  return localToken || null;
};