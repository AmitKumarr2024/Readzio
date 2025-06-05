import React, { useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { googleLogin, login, checkAuth } from "../store/authSlice";
import toast from "react-hot-toast";

// React Icons
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
  const { token, loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);



  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setAuthChecked(true); // no token, no auth check needed
        return;
      }

      try {
        const result = await dispatch(checkAuth()).unwrap();
        // If checkAuth passes:
        navigate("/");
      } catch (err) {
        toast.error("Session expired or invalid token, please login again.");
        setAuthChecked(true);
      }
    };

    verifyAuth();
  }, [token, dispatch, navigate]);

  // Show a loading message while auth check is in progress
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-700 text-lg">Checking authentication...</p>
      </div>
    );
  }

  const handleManualLogin = (e) => {
    e.preventDefault();
    dispatch(login({ email, password }))
      .unwrap()
      .then(() => {
        toast.success("Login successful!");
      })
      .catch((err) => {
        toast.error(err || "Login failed, please try again.");
      });
  };

  const handleGoogleLoginSuccess = (credentialResponse) => {
    dispatch(googleLogin(credentialResponse.credential))
      .unwrap()
      .then(() => {
        toast.success("Google login successful!");
      })
      .catch(() => {
        toast.error("Google login failed.");
      });
  };

  const handleGoogleLoginFailure = () => {
    toast.error("Google login failed");
  };

  return (
    <GoogleOAuthProvider clientId="784687781898-u7t28i5ahphgu5hbpcauppftgme77plr.apps.googleusercontent.com">
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 via-pink-900">
        <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
          {/* Left Side: Image with Quote */}
          <div className="md:w-1/2 relative flex items-center justify-center p-8">
            <img
              src="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Blogging inspiration"
              className="absolute inset-0 w-full h-full object-cover "
            />
            <div className="relative text-center text-white z-10  pb-72">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center justify-center">
                <FaSignInAlt className="mr-2 text-indigo-400 text-2xl md:text-3xl" />
                Unleash Your Voice
              </h2>
              <p className="text-base md:text-lg font-medium">
                myblogApp - Where Stories Ignite
              </p>
            </div>
          </div>

          {/* Right Side: Login Form */}
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
                    className="absolute top-3 right-3 text-gray-500 hover:text-indigo-600 focus:outline-none"
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

              <div className="my-6 text-center text-gray-500 text-base md:text-lg">
                or
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={handleGoogleLoginFailure}
                  type="standard"
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  logo_alignment="left"
                  width="250"
                />
              </div>

              <p className="mt-6 text-center text-gray-600 text-base md:text-lg">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
