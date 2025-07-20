import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { newNotificationReceived } from "../../store/socketSlice";
import toast from "react-hot-toast";

// Clears expired non-sticky banner notifications
export const useBannerExpiration = () => {
  const dispatch = useDispatch();
  const { newNotification } = useSelector((state) => state.socket);
  // Log new notification for debugging
  // console.log("useBannerExpiration", newNotification);

  // Effect to handle banner expiration
  useEffect(() => {
    if (newNotification?.expiresAt && !newNotification?.sticky) {
      const expiresAt = new Date(newNotification.expiresAt).getTime();
      const now = Date.now();

      // Clear expired banner immediately
      if (expiresAt <= now) {
        dispatch(newNotificationReceived(null));
        localStorage.removeItem("newNotification");
        toast.info("Banner expired.");
      } else {
        // Schedule banner clearance
        const timeout = setTimeout(() => {
          dispatch(newNotificationReceived(null));
          localStorage.removeItem("newNotification");
          toast.info("Banner expired.");
        }, expiresAt - now);
        return () => clearTimeout(timeout);
      }
    }
  }, [newNotification, dispatch]); // Run on notification or dispatch change
};