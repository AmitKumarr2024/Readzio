import axios from "axios";
import { getToken } from "../Utils/getToken";

const isDev = import.meta.env.MODE === "development";

if (isDev && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[AxiosInstance] ⚠️ VITE_API_BASE_URL is not defined in .env for development"
  );
}

const axiosInstance = axios.create({
  baseURL: isDev ? import.meta.env.VITE_API_BASE_URL : "/api", // Vite proxy will handle this
  withCredentials: true,
});

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

// Optional: handle global auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[Axios] 401 Unauthorized. Redirect or logout logic here.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
