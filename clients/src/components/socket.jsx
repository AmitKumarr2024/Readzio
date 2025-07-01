import { io } from "socket.io-client";

const socket = io("http://localhost:8001", {
  path: "/api/socket.io",
  auth: (cb) => {
    const token = localStorage.getItem("jwt");
    console.log("[SocketClient] Sending token:", !!token);
    if (!token) {
      console.error("[SocketClient] No token found");
    }
    cb({ token });
  },
  transports: ["websocket"],
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("[SocketClient] Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("[SocketClient] Connect error:", err.message);
});

socket.on("userCount", (data) => {
  console.log("[SocketClient] User count:", data.count);
});

socket.on("testResponse", (data) => {
  console.log("[SocketClient] Test response:", data);
});

export default socket;