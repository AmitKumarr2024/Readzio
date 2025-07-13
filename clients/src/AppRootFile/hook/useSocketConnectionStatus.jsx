import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";

export function useSocketConnectionStatus() {
  const { status, error } = useSelector((state) => state.socket);
  const prevStatusRef = useRef(null);

  // Handle browser online/offline
  useEffect(() => {
    const handleOffline = () => toast.error("Offline. Check your connection.");
    const handleOnline = () => toast.success(" Back to online.");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Handle socket reconnect/disconnect
  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    if (status === "disconnected" && error && navigator.onLine) {
      toast.error(" Socket lost. Retrying...");
    }

    if (status === "connected" && prevStatus === "disconnected") {
      toast.success("Connected to server.");
    }

    prevStatusRef.current = status;
  }, [status, error]);
}
