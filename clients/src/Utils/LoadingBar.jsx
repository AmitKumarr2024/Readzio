import React, { useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";
import { motion } from "framer-motion";

// Displays loading overlay with synced progress bar
const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    let interval;
    if (loading) {
      setShowBar(true);
      setProgress(0);

      // Gradually increase progress toward 95%
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 50); // 1% every 50ms ≈ 5s to 95%
    } else {
      // Finish remaining progress to 100%
      clearInterval(interval);
      setProgress(100);

      // Hide after short delay
      const timeout = setTimeout(() => {
        setShowBar(false);
        setProgress(0); // reset
      }, 600);
      return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <>
      {showBar && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <PacmanLoader color="#ff002b" size={40} />
            <p className="text-white text-lg font-semibold">{text}</p>
            <div className="w-64 h-2 bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#ff002b]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.2 }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadingBar;
