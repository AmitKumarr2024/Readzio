import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HashLoader } from "react-spinners";

export default function SplashLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;

    // Step progress from 0 → 98% over ~4.9s
    interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 98) return prev + 1;
        return prev;
      });
    }, 50); // <- changed from 70ms to 50ms

    // Simulate app finish after 5.5s (adjust to match backend)
    const completeTimeout = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
    }, 5500); // ~600ms after 98% to simulate final phase

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimeout);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-background-light dark:bg-background-dark"
    >
      <HashLoader color="#f30000" size={60} speedMultiplier={1} />
      <motion.p
        className="mt-4 text-sm text-text-main-light dark:text-text-main-dark"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.p>
      <div className="w-64 h-2 bg-gray-300 rounded-full overflow-hidden mt-4">
        <motion.div
          className="h-full bg-[#f30000]"
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
}
