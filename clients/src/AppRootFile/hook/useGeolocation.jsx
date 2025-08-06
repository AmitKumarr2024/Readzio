import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveUserLocation, trackUserIPLocation } from "../../store/userSlice";

// Fetches and saves user geolocation for authenticated users
export const useGeolocation = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { socket } = useSelector((state) => state.socket);
  const dispatch = useDispatch();
  const locationSent = useRef(false);
  const [error, setError] = useState(null);

  // Effect to fetch geolocation once for authenticated user
  useEffect(() => {
    if (isAuthenticated && user?._id && !locationSent.current) {
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
          },
          (err) => {
            console.error("[useGeolocation] Geolocation error:", err.message);
            setError(err.message);
          },
          { enableHighAccuracy: true, timeout: 30000 }
        );
      } else {
        setError("Geolocation is not supported by this browser.");
      }

      // ✅ Always track IP location regardless of geolocation success
      dispatch(trackUserIPLocation()).catch((err) =>
        console.error("Failed to track IP location:", err)
      );
    }
  }, [isAuthenticated, user?._id]);

  return error;
};
