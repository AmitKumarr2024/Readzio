// src/api/axiosInstance.js
import axios from "axios";
import { getToken } from "../Utils/getToken";

// Determine environment
const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
  : "/api";

if (isDev && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[AxiosInstance] ⚠️ VITE_API_BASE_URL is missing in .env for development. Defaulting to http://localhost:5000/api"
  );
}

// Helper: sleep for retry backoff
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // include cookies (JWT, CSRF, etc.)
  timeout: 60000, // 60s for slow connections / large payloads
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

// Retry configuration
const RETRY_NETWORK_MAX = 2; // max retry for network errors
const RETRY_SERVER_MAX = 1; // max retry for server errors

// 🔹 Response interceptor with retry and network handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config, message } = error;

    if (!config) return Promise.reject(error);

    if (!config._retryCount) config._retryCount = 0;

    // CASE 1: Offline / network error
    if (!response) {
      console.warn("[Axios] ❌ Network error:", message);

      if (!navigator.onLine) {
        return Promise.reject({
          ...error,
          customMessage: "No internet connection. Please check your network.",
        });
      }

      if (config._retryCount < RETRY_NETWORK_MAX) {
        config._retryCount += 1;
        const delay = config._retryCount * 2000; // 2s, 4s
        console.log(
          `[Axios] 🌐 Retrying network request (#${config._retryCount}) in ${
            delay / 1000
          }s...`
        );
        await sleep(delay);
        return axiosInstance(config); // retry original request
      }

      return Promise.reject({
        ...error,
        customMessage: "Network error. Please try again later.",
      });
    }

    // CASE 2: Unauthorized → 401
    if (response.status === 401) {
      console.warn("[Axios] 401 Unauthorized → token may be invalid/expired.");
      // Optional: logout or redirect
      // store.dispatch(logoutUser());
    }

    // CASE 3: Forbidden → 403
    if (response.status === 403) {
      console.warn("[Axios] 403 Forbidden → insufficient permissions.");
    }

    // CASE 4: Client errors (400–499)
    if (response.status >= 400 && response.status < 500) {
      console.warn(
        "[Axios] ⚠️ Client error:",
        response.data?.message || response.statusText
      );
    }

    // CASE 5: Server errors (500+)
    if (response.status >= 500) {
      console.error(
        "[Axios] 🚨 Server error:",
        response.data?.message || response.statusText
      );

      if (config._retryCount < RETRY_SERVER_MAX) {
        config._retryCount += 1;
        const delay = config._retryCount * 3000; // 3s
        console.log(
          `[Axios] 🔄 Retrying server request (#${config._retryCount}) in ${
            delay / 1000
          }s...`
        );
        await sleep(delay);
        return axiosInstance(config);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
