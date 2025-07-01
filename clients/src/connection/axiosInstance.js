import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL|| "http://localhost:8001/api",
  withCredentials: true, // ✅ Always include cookies (JWT) on requests
});

export default axiosInstance;
