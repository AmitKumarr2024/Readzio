import React, { useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";
import { motion, useAnimation } from "framer-motion";

// Displays loading overlay with text and animated progress bar
const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [showBar, setShowBar] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (loading) {
      setShowBar(true);

      // Immediately reset to 0% before starting animation
      controls.set({ width: "0%" });

      controls.start({
        width: "100%",
        transition: { duration: 3, ease: "linear" },
      });
    } else {
      controls.start({
        width: "0%",
        transition: { duration: 0.3 },
      });

      const timeout = setTimeout(() => setShowBar(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [loading, controls]);

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
                initial={{ width: "0%" }}
                animate={controls}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadingBar;
