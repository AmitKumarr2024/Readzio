// components/VerifyBanner.jsx
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const VerifyBanner = () => {
  const navigate = useNavigate();

  // Get authentication and user info from authSlice
  const {
    isAuthenticated,
    user: authUser,
    loading: authLoading,
  } = useSelector((state) => state.auth);

  // Avoid rendering while auth is still loading
  if (authLoading) return null;

  // Only show if user is logged in AND not verified
  if (!isAuthenticated || !authUser || authUser.isAccountVerified) return null;

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
