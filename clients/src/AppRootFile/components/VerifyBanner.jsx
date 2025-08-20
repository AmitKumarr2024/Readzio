// components/VerifyBanner.jsx
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const VerifyBanner = () => {
  const navigate = useNavigate();

  // Get login state from authSlice
  const { isAuthenticated, loading: authLoading } = useSelector(
    (state) => state.auth || {}
  );

  // Get user details from userSlice
  const { user, loading: userLoading } = useSelector(
    (state) => state.user || {}
  );

  // Avoid rendering while auth or user is loading
  if (authLoading || userLoading) return null;

  // Only show if logged in AND not verified
  if (!isAuthenticated || !user || user.isAccountVerified) return null;

  return (
    <div className="bg-yellow-500 text-black p-3 flex justify-between items-center">
      <span>
        Your email is not verified. Please verify your account to continue
        enjoying all features.
      </span>
      <button
        onClick={() => navigate("/verify")}
        className="bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
      >
        Verify Now
      </button>
    </div>
  );
};

export default VerifyBanner;
