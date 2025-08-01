import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { HashLoader } from "react-spinners";

export default function SplashLoader() {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      width: "100%",
      transition: { duration: 3, ease: "linear" },
    });
  }, [controls]);

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
          initial={{ width: "0%" }}
          animate={controls}
        />
      </div>
    </motion.div>
  );
}
