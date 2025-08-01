import React, { useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";
import { motion } from "framer-motion";

const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [showBar, setShowBar] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeout;

    if (loading) {
      setShowBar(true);
      setProgress(100); // animate to 100%
    } else {
      setProgress(100); // ensure it finishes
      timeout = setTimeout(() => {
        setShowBar(false);
        setProgress(0); // reset after hiding
      }, 300);
    }

    return () => clearTimeout(timeout);
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
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.15 }} // 🔥 150ms
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadingBar;
