


import axios from "axios";
import { getToken } from "../Utils/getToken";

const isDev = import.meta.env.MODE === "development";
const baseURL = isDev
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"
  : "/api";

// console.log("🚀 Initializing axios instance with baseURL:", baseURL);

// Production-ready axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request queue for offline scenarios
let requestQueue = [];
let isRetrying = false;

// Network status
let isOnline = navigator.onLine;
// console.log("🌐 Initial network status:", isOnline);

// Listen for network changes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    // console.log("🟢 Network restored - processing queued requests");
    processQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    // console.log("🔴 Network lost - queueing new requests");
  });
}

// Process queued requests when network returns
const processQueue = async () => {
  // console.log("🔄 Starting processQueue, queue length:", requestQueue.length);
  if (isRetrying || requestQueue.length === 0) {
    // console.log("⏭️ Skipping processQueue: isRetrying =", isRetrying, ", queue length =", requestQueue.length);
    return;
  }

  isRetrying = true;
  const queue = [...requestQueue];
  requestQueue = [];
  // console.log(`⚡ Processing ${queue.length} queued requests`);

  for (const { config, resolve, reject } of queue) {
    // console.log("📤 Processing queued request:", config.url, config.method);
    try {
      const response = await axiosInstance(config);
      // console.log("✅ Queued request succeeded:", config.url, response.status);
      resolve(response);
    } catch (error) {
      console.error("❌ Queued request failed:", config.url, error.message);
      if (config.method !== "get") {
        // console.log("🔄 Requeueing non-GET request:", config.url);
        requestQueue.push({ config, resolve, reject });
      } else {
        reject(error);
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  isRetrying = false;
  // console.log("🏁 Finished processing queue, new queue length:", requestQueue.length);
};

// Enhanced request interceptor
axiosInstance.interceptors.request.use((config) => {
  // console.log("📤 Preparing request:", config.url, config.method);
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // console.log("🔑 Added token to request:", config.url);
  } else {
    // console.log("⚠️ No token found for request:", config.url);
  }
  return config;
});

// Production-grade response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // console.log("✅ Response received:", response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error("❌ Response error:", error.message);
    const { config, response, code } = error;

    // Handle network errors (no response)
    if (!response) {
      // console.log("🌐 Network error detected, code:", code, "URL:", config?.url);
      if (!isOnline && config.method !== "get") {
        // console.log("📝 Queueing offline request:", config.url);
        return new Promise((resolve, reject) => {
          requestQueue.push({ config, resolve, reject });
        });
      }

      if (code === "ECONNABORTED" || code === "ERR_NETWORK") {
        if (!config._retried && config.method !== "get") {
          config._retried = true;
          // console.log("🔄 Retrying network error for:", config.url);
          await new Promise((r) => setTimeout(r, 2000));
          return axiosInstance(config);
        }
        // console.log("❌ Network error not retried:", config.url, code);
      }

      return Promise.reject({
        message: "Connection failed. Please check your internet.",
        type: "network",
      });
    }

    // Handle HTTP errors
    const status = response.status;
    // console.log("🚨 HTTP error, status:", status, "URL:", config.url);

    if (status === 401) {
      // console.log("🔒 401 Unauthorized, removing token");
      localStorage.removeItem("token");
      return Promise.reject({
        message: "Session expired. Please log in again.",
        type: "auth",
      });
    }

    if (status >= 502 && status <= 504 && !config._serverRetried) {
      config._serverRetried = true;
      // console.log(`🔄 Server error ${status}, retrying:`, config.url);
      const delay = status === 502 ? 5000 : 2000;
      await new Promise((r) => setTimeout(r, delay));
      return axiosInstance(config);
    }

    if (status === 429) {
      // console.log("⏳ 429 Rate limit hit:", config.url);
      return Promise.reject({
        message: "Too many requests. Please wait a moment.",
        type: "rate_limit",
      });
    }

    // console.log("❌ Server error:", response.data?.message || `Server error (${status})`);
    return Promise.reject({
      message: response.data?.message || `Server error (${status})`,
      status,
      type: "server",
    });
  }
);

// Helper: Check if requests are queued
export const hasQueuedRequests = () => {
  // console.log("🔍 Checking queued requests, length:", requestQueue.length);
  return requestQueue.length > 0;
};

// Helper: Get queue status
export const getQueueStatus = () => {
  // console.log("📊 Queue status - isOnline:", isOnline, "queueLength:", requestQueue.length, "isRetrying:", isRetrying);
  return { isOnline, queueLength: requestQueue.length, isRetrying };
};

// Helper: Manual retry for UI
export const retryQueuedRequests = () => {
  // console.log("🔄 Manual retry triggered, isOnline:", isOnline, "isRetrying:", isRetrying);
  if (isOnline && !isRetrying) {
    processQueue();
  }
};

// Helper: Wake up sleeping server
export const wakeUpServer = async () => {
  // console.log("🔔 Attempting to wake server, baseURL:", baseURL.replace("/api", "") + "/health");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    await fetch(baseURL.replace("/api", "") + "/health", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // console.log("✅ Server is awake");
    return true;
  } catch (error) {
    console.error("⚠️ Server ping failed:", error.message);
    return false;
  }
};

// Helper: Smart request with server wake-up
export const makeRequestWithWakeup = async (requestFn) => {
  // console.log("🚀 Starting request with wakeup");
  try {
    const result = await requestFn();
    // console.log("✅ Request succeeded");
    return result;
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    if (error.response?.status === 502 || error.type === "network") {
      // console.log("🔄 Attempting server wake-up due to 502/network error");
      await wakeUpServer();
      await new Promise((r) => setTimeout(r, 3000));
      // console.log("🔄 Retrying request after wakeup");
      return await requestFn();
    }
    throw error;
  }
};

export default axiosInstance;