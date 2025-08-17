import React, { useEffect, useState } from "react";
import InFeedAd from "./InFeedAd";

const FloatAd = () => {
  const [visible, setVisible] = useState(false);

  // Delay before showing
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 10000); // Appear after 10s
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[300px]">
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg p-2">
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition"
        >
          ✕
        </button>

        {/* Reuse InFeedAd */}
        <InFeedAd postId="float-sponsored" />
      </div>
    </div>
  );
};

export default FloatAd;