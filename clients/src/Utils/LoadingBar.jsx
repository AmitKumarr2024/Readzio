import React, { useEffect, useState, useRef } from "react";
import { PacmanLoader } from "react-spinners";
import { motion } from "framer-motion";

const LoadingBar = ({
  loading,
  text = "Loading...",
  step = 5, // % increase per tick
  intervalTime = 500, // ms per tick
}) => {
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setShowBar(true);
      setProgress(0);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => Math.min(prev + step, 100));
      }, intervalTime);
    } else {
      clearInterval(intervalRef.current);
      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        setShowBar(false);
        setProgress(0);
      }, 800);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [loading, step, intervalTime]);

  return (
    showBar && (
      <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <PacmanLoader color="#ff002b" size={40} />
          <p className="text-white text-lg font-semibold">{text}</p>
          <div className="w-64 h-2 bg-gray-300 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#ff002b]"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut", duration: 0.8 }}
            />
          </div>
        </div>
      </div>
    )
  );
};

export default LoadingBar;
