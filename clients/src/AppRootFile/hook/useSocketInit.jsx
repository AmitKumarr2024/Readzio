import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initializeSocket, disconnectSocket } from "../../store/socketSlice";
import { getToken } from "../../Utils/getToken";
import { checkAuth } from "../../store/authSlice";

export const useSocketInit = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const socketInitialized = useRef(false);

  useEffect(() => {
    const initSocket = async () => {
      if (!isAuthenticated || !user?._id || socketInitialized.current) return;

      console.log("[useSocketInit] Initializing socket for user:", user._id);
      socketInitialized.current = true;

      let token = getToken();
      if (!token) {
        console.log("[useSocketInit] No token, checking auth...");
        try {
          await dispatch(checkAuth()).unwrap();
          token = getToken();
        } catch (err) {
          console.warn("[useSocketInit] checkAuth failed:", err.message);
        }
      }

      dispatch(initializeSocket());
    };

    initSocket();

    return () => {
      if (socketInitialized.current) {
        console.log("[useSocketInit] Cleaning up socket...");
        dispatch(disconnectSocket());
        socketInitialized.current = false;
      }
    };
  }, [isAuthenticated, user?._id, dispatch]);
};