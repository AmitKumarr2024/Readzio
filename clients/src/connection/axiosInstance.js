// src/api/axiosInstance.js
import axios from "axios";
import { getToken } from "../Utils/getToken";

// Determine environment
const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
  : "/api"; // production relies on reverse proxy

if (isDev && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[AxiosInstance] ⚠️ VITE_API_BASE_URL is missing in .env for development. Defaulting to http://localhost:5000/api"
  );
}

// Helper: sleep for retry backoff
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// 🔹 Handle global errors + retry logic
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config, message } = error;

    // Retry setup (max 3 attempts with exponential backoff)
    if (!config._retryCount) {
      config._retryCount = 0;
    }

    // CASE 1: No response → network error / offline
    if (!response) {
      console.warn("[Axios] ❌ Network error:", message);

      if (config._retryCount < 3) {
        config._retryCount += 1;
        const delay = config._retryCount * 2000; // 2s, 4s, 6s
        console.log(
          `[Axios] 🌐 Retrying request (#${config._retryCount}) in ${
            delay / 1000
          }s...`
        );
        await sleep(delay);
        return axiosInstance(config); // retry original request
      }

      // Give up after retries
      return Promise.reject({
        ...error,
        customMessage: "Network error. Please check your connection.",
      });
    }

    // CASE 2: Unauthorized → 401
    if (response.status === 401) {
      console.warn("[Axios] 401 Unauthorized → token may be invalid/expired.");
      // Example: clear session / redirect
      // store.dispatch(logoutUser());
    }

    // CASE 3: Forbidden → 403
    if (response.status === 403) {
      console.warn("[Axios] 403 Forbidden → insufficient permissions.");
    }

    // CASE 4: Client error (400–499)
    if (response.status >= 400 && response.status < 500) {
      console.warn(
        "[Axios] ⚠️ Client error:",
        response.data?.message || response.statusText
      );
    }

    // CASE 5: Server error (500+)
    if (response.status >= 500) {
      console.error(
        "[Axios] 🚨 Server error:",
        response.data?.message || response.statusText
      );

      // Retry server errors too (sometimes servers glitch)
      if (config._retryCount < 2) {
        config._retryCount += 1;
        const delay = config._retryCount * 3000; // 3s, 6s
        console.log(
          `[Axios] 🔄 Retrying server error (#${config._retryCount}) in ${
            delay / 1000
          }s...`
        );
        await sleep(delay);
        return axiosInstance(config);
      }
    }

    // Final rejection → preserve original error
    return Promise.reject(error);
  }
);

export default axiosInstance;
