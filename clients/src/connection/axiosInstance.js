import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8001/api",
  withCredentials: true, // Disable if not using cookies
});

export default axiosInstance;