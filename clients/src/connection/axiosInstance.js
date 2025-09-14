import axios from "axios";
import { getToken } from "../Utils/getToken";

// Environment setup
const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
  : "/api";

// Create fast, lightweight Axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000, // Shorter timeout for faster failures
  headers: {
    "Content-Type": "application/json",
  },
});

// Minimal request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Fast response handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, code } = error;

    // Quick network error handling
    if (!response) {
      const message =
        code === "ECONNABORTED" ? "Connection timeout" : "Network error";
      return Promise.reject({ message, type: "network" });
    }

    // Fast status handling
    const status = response.status;
    if (status === 401) {
      localStorage.removeItem("token");
      return Promise.reject({ message: "Authentication failed", status });
    }

    if (status >= 500) {
      return Promise.reject({
        message: "Server error - try again",
        status,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
