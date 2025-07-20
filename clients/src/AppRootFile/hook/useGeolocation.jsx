import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveUserLocation } from "../../store/userSlice";

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
            // Save location to Redux and emit to socket
            dispatch(saveUserLocation(location));
            socket?.emit("userLocationUpdate", location);
            locationSent.current = true;
          },
          (err) => {
            // Log geolocation errors
            console.error("[useGeolocation] Geolocation error:", err.message);
            setError(err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        // Log browser incompatibility
        console.error("[useGeolocation] Geolocation not supported");
        setError("Geolocation is not supported by this browser.");
      }
    }
  }, [isAuthenticated, user?._id]); // Run on auth or user ID change

  return error;
};