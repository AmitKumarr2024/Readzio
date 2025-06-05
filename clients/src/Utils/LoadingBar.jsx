import React, { useEffect, useState } from "react";

const LoadingBar = ({ loading }) => {
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    if (loading) {
      setShowBar(true);
    } else {
      // Wait a bit so the bar can complete animation before disappearing
      const timeout = setTimeout(() => setShowBar(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  return (
    <>
      {showBar && (
        <div className="fixed top-[56px] left-0 right-0 h-1 bg-blue-600 animate-loadingBar z-50" />
      )}
      <style>{`
        @keyframes loadingBar {
          0% { width: 0; }
          100% { width: 100%; }
        }
        .animate-loadingBar {
          animation: loadingBar 1.5s ease forwards;
        }
      `}</style>
    </>
  );
};

export default LoadingBar;
