// hooks/useClearUserError.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearUserError } from "../../store/userSlice";

export const useClearUserError = () => {
  const { error } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => dispatch(clearUserError()), 3000);
      return () => clearTimeout(timeout);
    }
  }, [error, dispatch]);
};
