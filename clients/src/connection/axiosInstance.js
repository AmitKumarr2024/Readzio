import axios from "axios";
import { getToken } from "../Utils/getToken";

// Determine environment
const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"
  : "/api"; // Production relies on reverse proxy

if (isDev && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[AxiosInstance] ⚠️ VITE_API_BASE_URL is missing in .env for development. Defaulting to http://localhost:5000/api"
  );
}

// Create Axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // include cookies (JWT, CSRF, etc.)
  timeout: 20000, // prevent hanging requests
});

// 🔹 Attach token to every request if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Handle global responses/errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (!response) {
      console.error("[Axios] ❌ Network error or server not reachable.");
      return Promise.reject({ message: "Network error" });
    }

    if (response.status === 401) {
      console.warn("[Axios] 401 Unauthorized → consider logout/redirect.");
      // Example: dispatch logout or redirect
      // store.dispatch(logoutUser());
    }

    if (response.status >= 500) {
      console.error("[Axios] 🚨 Server error:", response.data?.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
