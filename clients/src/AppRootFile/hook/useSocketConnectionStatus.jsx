import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";

// Monitors socket connection status and browser online/offline state
export function useSocketConnectionStatus() {
  const { status, error } = useSelector((state) => state.socket);
  const prevStatusRef = useRef(null);
  const lastToastTimeRef = useRef(0);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOffline = () => toast.error("Offline. Check your connection.");
    const handleOnline = () => toast.success("Back online.");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Handle socket connection status changes
  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    const now = Date.now();
    const toastCooldown = 10000; // 10 seconds

    if (
      status === "disconnected" &&
      error &&
      navigator.onLine &&
      now - lastToastTimeRef.current > toastCooldown
    ) {
      toast.error("Socket lost. Retrying...");
      lastToastTimeRef.current = now;
    }

    if (status === "connected" && prevStatus === "disconnected") {
      toast.info("Connected to server.");
    }

    prevStatusRef.current = status;
  }, [status, error]);
}
