import React, { useState, useEffect } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { googleLogin, login, loginTestUser } from "../store/authSlice";
import { toast } from "react-hot-toast";
import {
  FaUserCircle,
  FaLock,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const query = new URLSearchParams(location.search);
      const redirectPath = query.get("redirect") || "/";
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate, location.search]);

  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      if (
        email.trim().toLowerCase() === "test@inksha.com" &&
        password === "test123"
      ) {
        await dispatch(loginTestUser()).unwrap();
        toast.success("Logged in as Test User!");
      } else {
        await dispatch(login({ email, password })).unwrap();
        toast.success("Login successful!");
      }

      const query = new URLSearchParams(location.search);
      const redirectPath = query.get("redirect") || "/";
      navigate(redirectPath);
    } catch (err) {
      console.error("[LoginPage] Login failed:", err?.message);
      toast.error(err?.message || "Login failed. Check email/password.");
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      await dispatch(
        googleLogin({ token: credentialResponse.credential, sendEmail: "true" })
      ).unwrap();
      toast.success("Google login successful!");
      const query = new URLSearchParams(location.search);
      const redirectPath = query.get("redirect") || "/";
      navigate(redirectPath);
    } catch (err) {
      console.error("[LoginPage] Google login failed:", err?.message);
      toast.error(err?.message || "Google login failed.");
    }
  };

  const handleGoogleLoginFailure = () => {
    console.error("[LoginPage] Google login failed");
    toast.error("Google login failed");
  };

  return (
    <GoogleOAuthProvider clientId="44790425597-foad407541te4lpt84dbhk77v28m5hl7.apps.googleusercontent.com">
      <div className="min-h-screen flex items-center justify-center bg-gray-200">
        <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left section */}
          <div className="md:w-1/2 relative flex items-center justify-center p-8">
            <img
              src="https://images.unsplash.com/photo-1631237631392-30f4f13cf509?q=80&w=1936&auto=format&fit=crop"
              alt="Blogging inspiration"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="relative text-center text-white z-10 mt-[450px]">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center justify-center">
                <FaSignInAlt className="mr-2 text-indigo-400 text-2xl md:text-3xl" />
                Welcome Back to myblogApp
              </h2>
              <p className="text-base md:text-lg font-medium">
                Continue Your Story
              </p>
            </div>
          </div>

          {/* Right section */}
          <div className="md:w-1/2 flex items-center justify-center bg-gray-50 p-8">
            <div className="w-full max-w-sm">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-900 flex items-center justify-center">
                <FaSignInAlt className="mr-2 text-indigo-600 text-2xl md:text-3xl" />
                Login to myblogApp
              </h2>
              <form onSubmit={handleManualLogin} className="space-y-5">
                <div className="relative">
                  <FaUserCircle className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your Email"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 text-base md:text-lg bg-gray-50"
                  />
                </div>
                <div className="relative">
                  <FaLock className="absolute top-3 left-3 text-gray-500 text-lg md:text-xl" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    <FaSignInAlt className="mr-2 text-lg md:text-xl" />
                  )}
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              {/* Google login */}
              <div className="my-6 text-center text-gray-500">or</div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={handleGoogleLoginFailure}
                />
              </div>

              {/* Links */}
              <div className="mt-6 text-center text-gray-600 space-y-2">
                <p>
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </p>
                <p>
                  Forgot your password?{" "}
                  <Link
                    to={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Reset Password
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
