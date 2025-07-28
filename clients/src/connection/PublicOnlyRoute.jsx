// src/routes/PublicOnlyRoute.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { checkAuth } from "../store/authSlice";

const PublicOnlyRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, authInitialized, isCheckingAuth } = useSelector(
    (state) => state.auth
  );

  // console.log("isAuthenticated:", isAuthenticated);
  // console.log("authInitialized:", authInitialized);
  // console.log("location.state:", location.state);

  useEffect(() => {
    if (!authInitialized && !isCheckingAuth) {
      dispatch(checkAuth());
    }
  }, [authInitialized, isCheckingAuth, dispatch]);

  if (!authInitialized) return null;

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
