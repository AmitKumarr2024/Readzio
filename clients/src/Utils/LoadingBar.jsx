import React, { useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";

// ✅ Accept `text` as a prop with a default value
const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    console.log("[DEBUG] LoadingBar: loading state changed:", loading);
    if (loading) {
      setShowBar(true);
    } else {
      const timeout = setTimeout(() => setShowBar(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  return (
    <>
      {showBar && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <PacmanLoader color="#ff002b" size={40} />
            <p className="text-white text-lg font-semibold">{text}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadingBar;
