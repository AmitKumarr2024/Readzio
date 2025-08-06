import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveUserLocation, trackUserIPLocation } from "../../store/userSlice";

// Fetches and saves user geolocation for authenticated users
export const useGeolocation = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { socket } = useSelector((state) => state.socket);
  const dispatch = useDispatch();
  const locationSent = useRef(localStorage.getItem("locationSent") === "true");
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!isAuthenticated || !user?._id || locationSent.current) return;

      // 1. Track IP location immediately (non-blocking)
      dispatch(trackUserIPLocation()).catch((err) =>
        console.error("[useGeolocation] Failed to track IP location:", err)
      );

      // 2. Then try browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const location = {
              userId: user._id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              timestamp: Date.now(),
            };
            dispatch(saveUserLocation(location));
            socket?.emit("userLocationUpdate", location);
            locationSent.current = true;
            localStorage.setItem("locationSent", "true");
          },
          (err) => {
            console.error("[useGeolocation] Geolocation error:", err.message);
            setError(err.message);
          },
          {
            enableHighAccuracy: false, // faster and less battery-intensive
            timeout: 10000, // 10s max
          }
        );
      } else {
        setError("Geolocation is not supported by this browser.");
      }
    };

    // Slight delay to not block UI on page load
    const timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user?._id]);

  return error;
};
