import React, { useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";
import { motion, useAnimation } from "framer-motion";

const LoadingBar = ({ loading, text = "Loading..." }) => {
  const [showBar, setShowBar] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (loading) {
      setShowBar(true);

      // Step 1: slowly animate to ~95% while loading
      controls.start({
        width: "95%",
        transition: { duration: 5, ease: "linear" },
      });
    } else {
      // Step 2: quickly finish to 100%
      controls.start({
        width: "100%",
        transition: { duration: 0.5 },
      });

      // Step 3: after short delay, hide bar
      const timeout = setTimeout(() => {
        setShowBar(false);
        controls.set({ width: "0%" }); // reset width after hiding
      }, 500);
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
