import React, { useEffect, useState } from "react";
import SafeInFeedAd from "./SafeInFeedAd";

const FloatAd = () => {
  const [visible, setVisible] = useState(true); // Show ad immediately
  const [showClose, setShowClose] = useState(false); // Delay close button

  // Show close button after 10s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClose(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-2 right-20 z-50 max-w-[300px] animate-slide-up">
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg p-2">
        {/* Close button after 10s */}
        {showClose && (
          <button
            onClick={() => setVisible(false)}
            className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition"
          >
            ✕
          </button>
        )}

        {/* Ad Component */}
        <SafeInFeedAd/>
      </div>
    </div>
  );
};

export default FloatAd;
