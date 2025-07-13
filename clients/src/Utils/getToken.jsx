export const getToken = () => {
  const localToken = localStorage.getItem("jwt");
  console.log("[getToken] Token check:", {
    source: localToken ? "localStorage" : "none",
    localToken: localToken ? "present" : "missing",
    finalToken: localToken ? localToken.slice(0, 10) + "..." : "null",
  });
  return localToken || null; // Only check localStorage for backward compatibility
};
