import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { newNotificationReceived } from "../../store/socketSlice";
import { toast } from "react-hot-toast";

// Clears expired non-sticky banner notifications
export const useBannerExpiration = () => {
  const dispatch = useDispatch();
  const { newNotification } = useSelector((state) => state.socket);

  useEffect(() => {
    if (newNotification?.expiresAt && !newNotification?.sticky) {
      const expiresAt = new Date(newNotification.expiresAt).getTime();
      const now = Date.now();

      if (expiresAt <= now) {
        dispatch(newNotificationReceived(null));
        localStorage.removeItem("newNotification");
        toast.info("Banner expired.");
      } else {
        const timeout = setTimeout(() => {
          dispatch(newNotificationReceived(null));
          localStorage.removeItem("newNotification");
          toast.info("Banner expired.");
        }, expiresAt - now);
        return () => clearTimeout(timeout);
      }
    }
  }, [newNotification, dispatch]);
};
