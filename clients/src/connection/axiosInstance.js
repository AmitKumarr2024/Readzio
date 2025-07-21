import axios from "axios";
import { getToken } from "../Utils/getToken";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development" && import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : "/api",
  withCredentials: true,
  timeout: 10000, // optional: avoids hanging
});

axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Token error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
