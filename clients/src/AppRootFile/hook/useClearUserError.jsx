import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearUserError } from "../../store/userSlice";

// Clears user-related errors after a delay
export const useClearUserError = () => {
  const { error } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // Effect to clear errors after 3s
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => dispatch(clearUserError()), 3000);
      return () => clearTimeout(timeout);
    }
  }, [error, dispatch]); // Run on error or dispatch change
};