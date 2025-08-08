// components/VerifyBanner.jsx
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const VerifyBanner = () => {
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.auth);

  // Don't render if still loading auth state
  if (loading) return null;

  // Only show if logged in & explicitly not verified
  if (!user || user.isAccountVerified === true) return null;

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
