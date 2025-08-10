import axios from "axios";
import axiosRetry from "axios-retry";
import { getToken, removeToken } from "../Utils/getToken";

const isDev = import.meta.env.MODE === "development";

if (isDev && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[AxiosInstance] ⚠️ VITE_API_BASE_URL is not defined in .env for development"
  );
}

const axiosInstance = axios.create({
  baseURL: isDev ? import.meta.env.VITE_API_BASE_URL : "/api",
  withCredentials: true,
  timeout: 30000, // 30s timeout
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    error.code === "ECONNABORTED" || error.response?.status >= 500,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("[Axios] Request:", { url: config.url, method: config.method });
    return config;
  },
  (error) => {
    console.error("[Axios] Request Error:", error.message);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    console.log("[Axios] Response:", {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    };
    console.error("[Axios] Response Error:", errorDetails);
    if (error.response?.status === 401) {
      console.warn("[Axios] 401 Unauthorized. Clearing token and redirecting.");
      removeToken();
      window.location.href = "/login"; // Adjust redirect path as needed
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
