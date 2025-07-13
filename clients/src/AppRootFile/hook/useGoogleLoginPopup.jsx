// hooks/useGoogleLoginPopup.js
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useGoogleLoginPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => setShowPopup(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  return showPopup;
};
