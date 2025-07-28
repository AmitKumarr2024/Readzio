import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifyResetOtp } from "../../store/authSlice";
import {toast} from "react-hot-toast";
import { FaKey, FaArrowLeft } from "react-icons/fa";

const VerifyOtp = ({ email, setOtp, setStep, setError }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
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
      const newOtp = pastedData.split("");
      setOtpDigits(newOtp);
      inputRefs.current[5].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    // console.log("[VerifyOtp] Submitting OTP:", { email, otp });
    try {
      await dispatch(verifyResetOtp({ email, otp })).unwrap();
      setOtp(otp);
      setStep("change");
      toast.success("OTP verified!");
    } catch (err) {
      console.error("[VerifyOtp] Error:", err.message);
      const message = err.message || "Invalid or expired OTP.";
      setError(message);
      toast.error(message);
      setStep("failure");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-extrabold text-center mb-4 text-gray-900 flex items-center justify-center">
        <FaKey className="mr-2 text-indigo-600 text-2xl" />
        Verify OTP
      </h2>
      <p className="text-center text-gray-500 mb-6 text-sm">Enter the 6-digit OTP sent to {email}</p>
      <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-12 h-12 text-center text-lg font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 text-gray-900"
              required
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-md"
          disabled={loading || otpDigits.some((d) => !d)}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
            </svg>
          ) : (
            <FaKey className="mr-2 text-lg" />
          )}
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>
      <button
        onClick={() => setStep("request")}
        className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium flex items-center mx-auto transition-colors duration-200"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>
    </div>
  );
};

export default VerifyOtp;