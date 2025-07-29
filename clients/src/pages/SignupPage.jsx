import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useDispatch, useSelector } from "react-redux";
import { googleLogin, signup, login } from "../store/authSlice";
import { toast } from "react-hot-toast";
import {
  FaUserPlus,
  FaUserCircle,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

// Handles user signup with form and Google OAuth
const SignupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/select-category");
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update form data
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    try {
      await dispatch(
        signup({
          fullName: formData.name,
          email: formData.email,
          password: formData.password,
        })
      ).unwrap();
      await dispatch(
        login({
          email: formData.email,
          password: formData.password,
        })
      ).unwrap();
      toast.success("Account created and logged in!");
      navigate("/select-category");
    } catch (err) {
      console.error("[SignupPage] Signup or login failed:", err);
      toast.error(err?.message || "Signup failed, please try again.");
    }
  };

  // Handle Google login success
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      await dispatch(
        googleLogin({ token: credentialResponse.credential })
      ).unwrap();

      toast.success("Google account created and logged in!");
      navigate("/select-category");
    } catch (err) {
      console.error("[SignupPage] Google signup failed:", err);
      toast.error(err?.message || "Google signup failed.");
    }
  };

  // Handle Google login failure
  const handleGoogleLoginFailure = () => {
    console.error("[SignupPage] Google signup failed");
    toast.error("Google signup failed");
  };

  return (
    <GoogleOAuthProvider clientId="44790425597-foad407541te4lpt84dbhk77v28m5hl7.apps.googleusercontent.com">
      {/* Main layout with gradient background */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900">
        <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left section with image */}
          <div className="md:w-1/2 relative flex items-center justify-center p-8">
            <img
              src="https://images.unsplash.com/photo-1631237631392-30f4f13cf509?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Blogging inspiration"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="relative text-center text-slate-500 z-10 mt-[450px]">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center justify-center">
                <FaUserPlus className="mr-2 text-indigo-400 text-2xl md:text-3xl" />
                Join the myblogApp Community
              </h2>
              <p className="text-base md:text-lg font-medium">
                Where Stories Ignite
              </p>
            </div>
          </div>
          {/* Right section with signup form */}
          <div className="md:w-1/2 flex items-center justify-center bg-gray-50 p-8">
            <div className="w-full max-w-sm">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-900 flex items-center justify-center">
                <FaUserPlus className="mr-2 text-indigo-600 text-2xl md:text-3xl" />
                Create an Account
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name input */}
                <div className="relative">
                  <FaUserCircle className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base md:text-lg bg-gray-50"
                  />
                </div>
                {/* Email input */}
                <div className="relative">
                  <FaUserCircle className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your Email"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base md:text-lg bg-gray-50"
                  />
                </div>
                {/* Password input */}
                <div className="relative">
                  <FaLock className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Your Password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base md:text-lg bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-indigo-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash className="text-lg md:text-xl" />
                    ) : (
                      <FaEye className="text-lg md:text-xl" />
                    )}
                  </button>
                </div>
                {/* Confirm password input */}
                <div className="relative">
                  <FaLock className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base md:text-lg bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-indigo-600"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash className="text-lg md:text-xl" />
                    ) : (
                      <FaEye className="text-lg md:text-xl" />
                    )}
                  </button>
                </div>
                {/* Terms checkbox */}
                <div className="flex items-center">
                  <input
                    id="acceptedTerms"
                    name="acceptedTerms"
                    type="checkbox"
                    checked={formData.acceptedTerms}
                    onChange={handleChange}
                    required
                    className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-400"
                  />
                  <label
                    htmlFor="acceptedTerms"
                    className="ml-2 text-sm text-gray-700"
                  >
                    I accept the{" "}
                    <Link
                      to="/terms-and-conditions"
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Terms and Conditions
                    </Link>
                  </label>
                </div>
                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-base md:text-lg hover:bg-indigo-700 transition duration-300 disabled:opacity-50 flex items-center justify-center"
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
                    <FaUserPlus className="mr-2 text-lg md:text-xl" />
                  )}
                  {loading ? "Signing up..." : "Sign Up"}
                </button>
              </form>
              {/* Google login */}
              <div className="my-6 text-center text-gray-500">or</div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={handleGoogleLoginFailure}
                  type="standard"
                  theme="outline"
                  size="large"
                  text="signup_with"
                  shape="rectangular"
                  logo_alignment="left"
                  width="250"
                />
              </div>
              {/* Login link */}
              <p className="mt-6 text-center text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default SignupPage;
