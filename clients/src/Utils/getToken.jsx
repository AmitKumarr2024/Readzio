export const getToken = () => {
  try {
    const localToken = localStorage.getItem("jwt");
    return localToken || null;
  } catch (error) {
    console.error("[getToken] Failed to read token:", error);
    return null;
  }
};

export const removeToken = () => {
  try {
    localStorage.removeItem("jwt");
    console.log("[removeToken] Token removed from localStorage");
  } catch (error) {
    console.error("[removeToken] Failed to remove token:", error);
  }
};