// hooks/useAdminAnalytics.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSiteAnalytics } from "../../store/adminSlice";

export const useAdminAnalytics = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      dispatch(fetchSiteAnalytics());
    }
  }, [isAuthenticated, user?.role]);
};
