import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initializeSocket, disconnectSocket } from "../../store/socketSlice";
import { getToken } from "../../Utils/getToken";
import { checkAuth } from "../../store/authSlice";

// Initializes socket for authenticated users
export const useSocketInit = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const socketInitialized = useRef(false);

  // Effect to initialize socket for authenticated user
  useEffect(() => {
    const initSocket = async () => {
      if (!isAuthenticated || !user?._id || socketInitialized.current) return;

      // Log initialization for debugging
      console.log("[useSocketInit] Initializing socket for user:", user._id);
      socketInitialized.current = true;

      let token = getToken();
      if (!token) {
        // Attempt to refresh token if missing
        console.log("[useSocketInit] No token, checking auth...");
        try {
          await dispatch(checkAuth()).unwrap();
          token = getToken();
        } catch (err) {
          // Log auth errors
          console.error("[useSocketInit] checkAuth failed:", err.message);
        }
      }

      dispatch(initializeSocket());
    };

    initSocket();

    // Cleanup socket on unmount
    return () => {
      if (socketInitialized.current) {
        console.log("[useSocketInit] Cleaning up socket...");
        dispatch(disconnectSocket());
        socketInitialized.current = false;
      }
    };
  }, [isAuthenticated, user?._id, dispatch]); // Run on auth, user ID, or dispatch change
};