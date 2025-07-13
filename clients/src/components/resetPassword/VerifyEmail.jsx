import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendVerifyOtp, verifyEmail } from "../../store/authSlice";
import toast from "react-hot-toast";
import { FaKey, FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const handleInputChange = (index, value) => {
    if (/^\d*$/.test(value)) {
      const newOtp = [...otpDigits];
      newOtp[index] = value;
      setOtpDigits(newOtp);
      if (value && index < 5) inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      setOtpDigits(pastedData.split(""));
      inputRefs.current[5].focus();
    }
  };

  const handleSendOtp = async () => {
    if (!user?._id) {
      toast.error("User ID missing");
      return;
    }
    try {
      await dispatch(sendVerifyOtp({ userId: user._id })).unwrap();
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (!otp || otp.length !== 6) {
      toast.error("Enter a valid 6-digit OTP");
      return;
    }
    try {
      await dispatch(verifyEmail({ userId: user._id, otp })).unwrap();
      toast.success("Email verified successfully");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Invalid OTP");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start mt-20 min-h-screen bg-gradient-to-b from-indigo-100 to-gray-50 dark:from-gray-900 dark:to-black px-4">
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white flex items-center justify-center">
          <FaEnvelope className="mr-2 text-indigo-600 text-2xl" />
          Verify Your Email
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-300 text-sm">
          Enter the 6-digit OTP sent to your email
        </p>
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                ref={(el) => (inputRefs.current[index] = el)}
                className="w-12 h-12 text-center text-lg font-medium border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-400 transition-all duration-200 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            ))}
          </div>
          {error && (
            <p className="text-red-500 dark:text-red-400 text-center text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSendOtp}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-base hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-md"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                />
              </svg>
            ) : (
              <FaKey className="mr-2 text-lg" />
            )}
            {loading ? "Sending..." : "Send OTP"}
          </button>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-md"
            disabled={loading || otpDigits.some((d) => !d)}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                />
              </svg>
            ) : (
              <FaKey className="mr-2 text-lg" />
            )}
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;
