import React from "react";
import { motion } from "framer-motion";
import { MdWarning } from "react-icons/md";

const PageNotFound = () => {
  return (
    <div className="w-full h-screen relative flex items-center justify-center overflow-hidden">
      {/* Animated rainbow background */}
      <motion.div
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{
          repeat: Infinity,
          duration: 15,
          ease: "linear",
        }}
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(270deg, #ff6ec4, #7873f5, #2af598, #ff9a9e, #fbc2eb, #a18cd1)",
          backgroundSize: "1200% 1200%",
        }}
      ></motion.div>

      {/* Main 404 Message */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center z-10 bg-white bg-opacity-90 p-8 rounded-xl shadow-2xl"
      >
        <MdWarning className="text-6xl text-red-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-6xl font-bold text-gray-800 mb-2">404 - Page Not Found</h1>
        <p className="text-gray-600 text-2xl mt-6">Oops! Looks like this page got lost in the rainbow.</p>
      </motion.div>
    </div>
  );
};

export default PageNotFound;
