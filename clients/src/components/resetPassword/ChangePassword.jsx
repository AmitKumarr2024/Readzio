import React, { useState } from "react";
import {toast} from "react-hot-toast";
import { FaLock, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import axiosInstance from "../../connection/axiosInstance";

const ChangePassword = ({ email, otp, setStep, setError }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("[ChangePassword] Submitting new password:", { email });
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters");
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      const res = await axiosInstance.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      // console.log("[ChangePassword] Success:", { email });
      setStep("success");
      toast.success("Password reset successfully!");
    } catch (err) {
      console.error("[ChangePassword] Error:", err.response?.data?.message);
      const message = err.response?.data?.message || "Failed to reset password.";
      setLocalError(message);
      setError(message);
      toast.error(message);
      setStep("failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-extrabold text-center mb-4 text-gray-900 flex items-center justify-center">
        <FaLock className="mr-2 text-indigo-600 text-2xl" />
        Set New Password
      </h2>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Enter a new password for {email}
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <FaLock className="absolute top-3 left-3 text-gray-500 text-lg" />
          <input
            type={showNewPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => {
              // console.log("[ChangePassword] New password input changed");
              setNewPassword(e.target.value);
            }}
            placeholder="New Password"
            className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 text-gray-900 text-base"
          />
          <button
            type="button"
            onClick={() => {
              // console.log("[ChangePassword] Toggling new password visibility:", { showNewPassword: !showNewPassword });
              setShowNewPassword(!showNewPassword);
            }}
            className="absolute top-3 right-3 text-gray-500 hover:text-indigo-600 transition-colors duration-200"
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
          </button>
        </div>
        <div className="relative">
          <FaLock className="absolute top-3 left-3 text-gray-500 text-lg" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => {
              // console.log("[ChangePassword] Confirm password input changed");
              setConfirmPassword(e.target.value);
            }}
            placeholder="Confirm Password"
            className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 text-gray-900 text-base"
          />
          <button
            type="button"
            onClick={() => {
              // console.log("[ChangePassword] Toggling confirm password visibility:", { showConfirmPassword: !showConfirmPassword });
              setShowConfirmPassword(!showConfirmPassword);
            }}
            className="absolute top-3 right-3 text-gray-500 hover:text-indigo-600 transition-colors duration-200"
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
          </button>
        </div>
        {localError && <p className="text-red-500 text-center text-sm">{localError}</p>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-md"
          disabled={loading || !newPassword || !confirmPassword}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
            </svg>
          ) : (
            <FaLock className="mr-2 text-lg" />
          )}
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
      <button
        onClick={() => setStep("verify")}
        className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium flex items-center mx-auto transition-colors duration-200"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>
    </div>
  );
};

export default ChangePassword;