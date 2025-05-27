import React, { useEffect } from "react";
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { googleLogin, login, checkAuth } from "../store/authSlice";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  useEffect(() => {
    if (token) {
      // Dispatch checkAuth to refresh user data from server
      dispatch(checkAuth());
      // Then navigate to homepage
      navigate("/");
    }
  }, [token, dispatch, navigate]);

  const handleManualLogin = (e) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  const handleGoogleLoginSuccess = (credentialResponse) => {
    dispatch(googleLogin(credentialResponse.credential));
  };

  const handleGoogleLoginFailure = () => {
    console.error('Google login failed');
  };

  return (
    <GoogleOAuthProvider clientId="784687781898-u7t28i5ahphgu5hbpcauppftgme77plr.apps.googleusercontent.com">
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800">Login</h2>

          <form onSubmit={handleManualLogin} className="space-y-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border rounded-md"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border rounded-md"
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {error && <p className="text-red-500 text-center mt-4">{error}</p>}

          <div className="my-6 text-center text-gray-400">or</div>

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
              width="300"
            />
          </div>

          <p className="mt-4 text-center text-gray-600">
            Don't have an account? <a href="/signup" className="text-indigo-600 hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
