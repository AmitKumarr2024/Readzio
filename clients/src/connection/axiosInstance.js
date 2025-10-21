import axios from "axios";
import { getToken } from "../Utils/getToken";

const isDev = import.meta.env.MODE === "development";
const baseURL = "/api";

// Production-ready axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  // ❌ REMOVED: Don't set default Content-Type here
  // It prevents FormData from working correctly
});

// Request queue for offline scenarios
let requestQueue = [];
let isRetrying = false;

// Network status
let isOnline = navigator.onLine;

// Listen for network changes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    processQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
  });
}

// Process queued requests when network returns
const processQueue = async () => {
  if (isRetrying || requestQueue.length === 0) {
    return;
  }

  isRetrying = true;
  const queue = [...requestQueue];
  requestQueue = [];

  for (const { config, resolve, reject } of queue) {
    try {
      const response = await axiosInstance(config);
      resolve(response);
    } catch (error) {
      console.error("❌ Queued request failed:", config.url, error.message);
      if (config.method !== "get") {
        requestQueue.push({ config, resolve, reject });
      } else {
        reject(error);
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  isRetrying = false;
};

// Enhanced request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ IMPORTANT: Only set Content-Type for non-FormData requests
  // FormData needs the browser to set the Content-Type with boundary parameter
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  // If it's FormData, don't touch Content-Type - browser will handle it

  return config;
});

// Production-grade response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("❌ Response error:", error.message);
    const { config, response, code } = error;

    // Handle network errors (no response)
    if (!response) {
      if (!isOnline && config.method !== "get") {
        return new Promise((resolve, reject) => {
          requestQueue.push({ config, resolve, reject });
        });
      }

      if (code === "ECONNABORTED" || code === "ERR_NETWORK") {
        if (!config._retried && config.method !== "get") {
          config._retried = true;
          await new Promise((r) => setTimeout(r, 2000));
          return axiosInstance(config);
        }
      }

      return Promise.reject({
        message: "Connection failed. Please check your internet.",
        type: "network",
      });
    }

    // Handle HTTP errors
    const status = response.status;

    if (status === 401) {
      localStorage.removeItem("token");
      return Promise.reject({
        message: "Session expired. Please log in again.",
        type: "auth",
      });
    }

    if (status >= 502 && status <= 504 && !config._serverRetried) {
      config._serverRetried = true;
      const delay = status === 502 ? 5000 : 2000;
      await new Promise((r) => setTimeout(r, delay));
      return axiosInstance(config);
    }

    if (status === 429) {
      return Promise.reject({
        message: "Too many requests. Please wait a moment.",
        type: "rate_limit",
      });
    }

    return Promise.reject({
      message: response.data?.message || `Server error (${status})`,
      status,
      type: "server",
    });
  }
);

// Helper: Check if requests are queued
export const hasQueuedRequests = () => {
  return requestQueue.length > 0;
};

// Helper: Get queue status
export const getQueueStatus = () => {
  return { isOnline, queueLength: requestQueue.length, isRetrying };
};

// Helper: Manual retry for UI
export const retryQueuedRequests = () => {
  if (isOnline && !isRetrying) {
    processQueue();
  }
};

// Helper: Wake up sleeping server
export const wakeUpServer = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    await fetch(baseURL.replace("/api", "") + "/health", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error("⚠️ Server ping failed:", error.message);
    return false;
  }
};

// Helper: Smart request with server wake-up
export const makeRequestWithWakeup = async (requestFn) => {
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    if (error.response?.status === 502 || error.type === "network") {
      await wakeUpServer();
      await new Promise((r) => setTimeout(r, 3000));
      return await requestFn();
    }
    throw error;
  }
};

export default axiosInstance;
