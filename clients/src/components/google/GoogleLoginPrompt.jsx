import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GoogleLoginPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem("googleLoginPromptDismissed");
    if (!dismissed) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 text-black dark:text-white px-6 py-4 rounded-lg shadow-md z-50 flex items-center gap-4">
      <p>Continue with your Google account for a better experience.</p>
      <button
        onClick={() => navigate("/login")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Sign in with Google
      </button>
      <button
        onClick={() => {
          localStorage.setItem("googleLoginPromptDismissed", "true");
          setShowPrompt(false);
        }}
        className="text-sm underline ml-4"
      >
        Dismiss
      </button>
    </div>
  );
};

export default GoogleLoginPrompt;
