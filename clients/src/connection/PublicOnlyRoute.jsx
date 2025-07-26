import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, authInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  // 1. Wait for checkAuth to finish
  if (!authInitialized) return null;

  // 2. Redirect if already logged in
  if (isAuthenticated) {
    const from = location?.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // 3. Allow access for guests
  return children;
};

export default PublicOnlyRoute;
