import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { sendResetOtp } from "../store/authSlice";
import {toast} from "react-hot-toast";
import { FaEnvelope, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import VerifyOtp from "../components/resetPassword/VerifyOtp";
import ChangePassword from "../components/resetPassword/ChangePassword";

// Requests OTP for password reset
const RequestOtp = ({ setEmail, setStep }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [localEmail, setLocalEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(sendResetOtp({ email: localEmail })).unwrap();
      setEmail(localEmail);
      setStep("verify");
      toast.success("OTP sent to your email!");
    } catch (err) {
      console.error("[RequestOtp] Error:", err.message);
      toast.error(err.message || "Failed to send OTP.");
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-text-main-light dark:text-text-main-dark flex items-center justify-center">
        <FaEnvelope className="mr-2 text-indigo-600  text-2xl" />
        Reset Your Password
      </h2>
      <p className="text-center text-text-main-light dark:text-text-main-dark mb-6">
        Enter your email to receive a one-time password (OTP).
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <FaEnvelope className="absolute top-3 left-3 text-gray-500 text-lg" />
          <input
            type="email"
            required
            value={localEmail}
            onChange={(e) => setLocalEmail(e.target.value)}
            placeholder="Your Email"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base"
          />
        </div>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-base hover:bg-indigo-700 transition duration-300 disabled:opacity-50 flex items-center justify-center"
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
            <FaEnvelope className="mr-2 text-lg" />
          )}
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    </div>
  );
};

// Displays success message
const ResetSuccess = () => (
  <div className="w-full max-w-md text-center ">
    <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
    <h2 className="text-2xl font-bold mb-4 text-gray-900">
      Password Reset Successful
    </h2>
    <p className="text-text-main-light dark:text-text-main-dark mb-6">
      Your password has been successfully reset. You can now log in with your
      new password.
    </p>
    <Link
      to="/login"
      className="inline-block bg-indigo-600 text-text-main-light dark:text-text-main-dark py-2 px-4 rounded-lg font-semibold text-base hover:bg-indigo-700 transition duration-300"
    >
      Go to Login
    </Link>
  </div>
);

// Displays failure message
const ResetFailure = ({ setStep, error }) => (
  <div className="w-full max-w-md text-center">
    <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
    <h2 className="text-2xl font-bold mb-4 text-text-main-light dark:text-text-main-dark">
      Password Reset Failed
    </h2>
    <p className="text-text-main-light dark:text-text-main-dark mb-6">
      {error || "Something went wrong. Please try again."}
    </p>
    <button
      onClick={() => setStep("request")}
      className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold text-base hover:bg-indigo-700 transition duration-300"
    >
      Try Again
    </button>
  </div>
);

// Manages password reset flow
const ResetPassword = () => {
  const [step, setStep] = useState("request"); // Steps: request, verify, change, success, failure
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  return (
    <div className=" flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="max-w-md w-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-2xl p-8">
        {step === "request" && (
          <RequestOtp setEmail={setEmail} setStep={setStep} />
        )}
        {step === "verify" && (
          <VerifyOtp
            email={email}
            setOtp={setOtp}
            setStep={setStep}
            setError={setError}
          />
        )}
        {step === "change" && (
          <ChangePassword
            email={email}
            otp={otp}
            setStep={setStep}
            setError={setError}
          />
        )}
        {step === "success" && <ResetSuccess />}
        {step === "failure" && <ResetFailure setStep={setStep} error={error} />}
        {step !== "success" && step !== "failure" && (
          <p className="mt-6 text-center  text-text-main-light dark:text-text-main-dark">
            Back to{" "}
            <Link
              to={"/login"}
              className="text-indigo-600 hover:underline font-medium"
            >
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
