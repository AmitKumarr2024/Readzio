import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingBar from "../../Utils/LoadingBar";

export default function SplashLoader({ isLoading }) {
  // ✅ Use AnimatePresence to properly unmount the loader
  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="splash-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          <LoadingBar loading={true} text="Opening your reading world..." />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
