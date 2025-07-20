import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

// Shows Google login popup for unauthenticated users after delay
export const useGoogleLoginPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Effect to show popup after 30s if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => setShowPopup(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]); // Run on auth change

  return showPopup;
};