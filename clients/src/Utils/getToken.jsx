export const getToken = () => {
  try {
    const localToken = localStorage.getItem("jwt");
    return localToken || null;
  } catch (error) {
    console.error("[getToken] Failed to read token:", error);
    return null;
  }
};
