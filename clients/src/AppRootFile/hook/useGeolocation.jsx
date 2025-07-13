// hooks/useGeolocation.js
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveUserLocation } from "../../store/userSlice";

export const useGeolocation = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { socket } = useSelector((state) => state.socket);
  const dispatch = useDispatch();

  const locationSent = useRef(false);
  const [error, setError] = useState(null);

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
            setError(err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setError("Geolocation is not supported by this browser.");
      }
    }
  }, [isAuthenticated, user?._id]);

  return error;
};
