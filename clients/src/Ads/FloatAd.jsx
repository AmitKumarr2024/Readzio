import React, { useEffect, useState } from "react";
import SafeInFeedAd from "./SafeInFeedAd";

const FloatAd = () => {
  const [visible, setVisible] = useState(false); // start hidden
  const [showClose, setShowClose] = useState(false);

  // Show ad after 3s
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 5000);

    return () => clearTimeout(showTimer);
  }, []);

  // Show close button after 10s of appearing
  useEffect(() => {
    if (!visible) return;

    const closeTimer = setTimeout(() => {
      setShowClose(true);
    }, 15000);

    return () => clearTimeout(closeTimer);
  }, [visible]);

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
        <SafeInFeedAd />
      </div>
    </div>
  );
};

export default FloatAd;
