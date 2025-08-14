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
  let socketDisconnectedHandler;

  const initSocket = async () => {
    if (!isAuthenticated || !user?._id) return;

    let token = getToken();
    if (!token) {
      try {
        await dispatch(checkAuth()).unwrap();
        token = getToken();
      } catch (err) {
        console.error("checkAuth failed:", err.message);
        return;
      }
    }

    dispatch(initializeSocket());

    // Listen for disconnect events and try re-initializing
    socketDisconnectedHandler = () => {
      console.warn("Socket disconnected. Retrying in 3s...");
      setTimeout(initSocket, 3000);
    };

    window.socket?.on("disconnect", socketDisconnectedHandler);
  };

  initSocket();

  return () => {
    window.socket?.off("disconnect", socketDisconnectedHandler);
    dispatch(disconnectSocket());
  };
}, [isAuthenticated, user?._id, dispatch]);

};
