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

      let token = getToken();
      if (!token) {
        try {
          await dispatch(checkAuth()).unwrap();
          token = getToken(); // ✅ Now token should be valid
        } catch (err) {
          console.error("checkAuth failed:", err.message);
          return; // Prevent socket init without token
        }
      }

      socketInitialized.current = true;
      dispatch(initializeSocket()); // ✅ after token is ready
    };

    initSocket();

    return () => {
      if (socketInitialized.current) {
        dispatch(disconnectSocket());
        socketInitialized.current = false;
      }
    };
  }, [isAuthenticated, user?._id, dispatch]);
};
