import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";

// Monitors socket connection status and browser online/offline state
export function useSocketConnectionStatus() {
  const { status, error } = useSelector((state) => state.socket);
  const prevStatusRef = useRef(null);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOffline = () => toast.error("Offline. Check your connection.");
    const handleOnline = () => {
      toast.success("Back to online. Refreshing...");
      setTimeout(() => window.location.reload(), 2000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Handle socket connection changes
  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    if (status === "disconnected" && error && navigator.onLine) {
      toast.error("Socket lost. Retrying...");
    }

    if (status === "connected" && prevStatus === "disconnected") {
      toast.success("Connected to server.");
    }

    prevStatusRef.current = status;
  }, [status, error]); // Run on status or error change
}