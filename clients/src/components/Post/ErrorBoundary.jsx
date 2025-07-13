import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Reset error state on route change to prevent stale errors
    setError(null);
    setErrorInfo(null);
  }, [location.pathname]);

  const handleError = (err, info) => {
    console.error("[ErrorBoundary] Caught error:", err, info);
    setError(err);
    setErrorInfo(info);
  };

  // React's error boundary equivalent in functional component
  try {
    return children;
  } catch (err) {
    handleError(err, { componentStack: err.stack });
    return null;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 text-red-800 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
        <p className="mb-4">{error.message || "An unexpected error occurred"}</p>
        <div className="flex gap-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              setError(null);
              setErrorInfo(null);
              window.location.reload();
            }}
          >
            Refresh Page
          </button>
          <button
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            onClick={() => {
              setError(null);
              setErrorInfo(null);
              navigate("/"); // Use react-router-dom for navigation
            }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// Wrap with error boundary logic
export default class ErrorBoundaryWrapper extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  state = { hasError: false, error: null, errorInfo: null };

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("[ErrorBoundaryWrapper] Caught error:", error, errorInfo);
  }

  render() {
    return <ErrorBoundary {...this.props} error={this.state.error} errorInfo={this.state.errorInfo} />;
  }
}