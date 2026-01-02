import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { tick } from "../store/rateLimit/rateLimitSlice";

export const useRateLimitTimer = () => {
  const dispatch = useDispatch();
  const isLimited = useSelector((state) => state.rateLimit.isLimited);

  useEffect(() => {
    if (!isLimited) return;

    const interval = setInterval(() => {
      dispatch(tick());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLimited, dispatch]);
};
