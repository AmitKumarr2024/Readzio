// components/VerifyBanner.jsx
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const VerifyBanner = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth); // from your authSlice

  // If not logged in or already verified → don't show banner
  if (!user || user.isAccountVerified) return null;

  return (
    <div className="bg-yellow-500 text-black p-3 flex justify-between items-center">
      <span>Your email is not verified. Please verify your account to continue enjoying all features.</span>
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
