import axios from "axios";
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_MODE,
} from "../config/dotenv.js";

// Validate keys presence
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("Razorpay API keys missing:", {
    keyId: RAZORPAY_KEY_ID || "Not set",
    keySecret: RAZORPAY_KEY_SECRET ? "****" : "Not set",
  });
  throw new Error("Razorpay API keys not configured");
}

const razorpayAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString(
  "base64"
);

const axiosInstance = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${razorpayAuth}`,
  },
});

// Optional: Log requests for debugging
axiosInstance.interceptors.request.use((config) => {
  // console.log("API Request:", {
  //   url: config.url,
  //   method: config.method,
  // });
  return config;
});

// Optional: Log responses & handle errors nicely
axiosInstance.interceptors.response.use(
  (response) => {
    // console.log("API Response:", {
    //   url: response.config.url,
    //   status: response.status,
    // });
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error?.description || error.message,
    };
    console.error("API Error:", errorDetails);
    if (errorDetails.message.includes("signature")) {
      console.error(
        "Signature verification likely failed. Check Razorpay secret key and client-side signature generation."
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
