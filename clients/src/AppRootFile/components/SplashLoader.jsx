import React from "react";
import { motion } from "framer-motion";
import LoadingBar from "../../Utils/LoadingBar";

export default function SplashLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black"
    >
      <LoadingBar loading={true} text="Opening your reading world..." />
    </motion.div>
  );
}
