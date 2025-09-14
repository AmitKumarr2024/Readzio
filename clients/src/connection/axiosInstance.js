import axios from "axios";
import { getToken } from "../Utils/getToken";

const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"
  : "/api";

// Production-ready axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // Longer timeout for production
  headers: {
    "Content-Type": "application/json",
  },
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
    console.log("🟢 Network restored - processing queued requests");
    processQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    console.log("🔴 Network lost - queueing new requests");
  });
}

// Process queued requests when network returns
const processQueue = async () => {
  if (isRetrying || requestQueue.length === 0) return;

  isRetrying = true;
  const queue = [...requestQueue];
  requestQueue = [];

  console.log(`⚡ Processing ${queue.length} queued requests`);

  for (const { config, resolve, reject } of queue) {
    try {
      const response = await axiosInstance(config);
      resolve(response);
    } catch (error) {
      // If still failing, requeue critical requests
      if (config.method !== "get") {
        requestQueue.push({ config, resolve, reject });
      } else {
        reject(error);
      }
    }
    // Small delay between retries
    await new Promise((r) => setTimeout(r, 100));
  }

  isRetrying = false;
};

// Enhanced request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Production-grade response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response, code } = error;

    // Handle network errors (no response)
    if (!response) {
      // If offline, queue non-GET requests
      if (!isOnline && config.method !== "get") {
        console.log("📝 Queueing request for later:", config.url);
        return new Promise((resolve, reject) => {
          requestQueue.push({ config, resolve, reject });
        });
      }

      // Network timeout or connection error
      if (code === "ECONNABORTED" || code === "ERR_NETWORK") {
        // Retry once after delay for important requests
        if (!config._retried && config.method !== "get") {
          config._retried = true;
          console.log("🔄 Retrying network error:", config.url);

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

    // Authentication errors
    if (status === 401) {
      localStorage.removeItem("token");
      // Optionally redirect to login
      // window.location.href = '/login';
      return Promise.reject({
        message: "Session expired. Please log in again.",
        type: "auth",
      });
    }

    // Server errors (502, 503, 504) - retry once
    if (status >= 502 && status <= 504 && !config._serverRetried) {
      config._serverRetried = true;
      console.log(`🔄 Server error ${status}, retrying:`, config.url);

      // Wait longer for server to wake up (Render free tier)
      const delay = status === 502 ? 5000 : 2000;
      await new Promise((r) => setTimeout(r, delay));

      return axiosInstance(config);
    }

    // Rate limiting
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
export const hasQueuedRequests = () => requestQueue.length > 0;

// Helper: Get queue status
export const getQueueStatus = () => ({
  isOnline,
  queueLength: requestQueue.length,
  isRetrying,
});

// Helper: Manual retry for UI
export const retryQueuedRequests = () => {
  if (isOnline && !isRetrying) {
    processQueue();
  }
};

export default axiosInstance;
