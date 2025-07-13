import React from "react";
import { motion } from "framer-motion";

export default function LocationErrorPopup({ locationError, onDismiss }) {
  if (!locationError) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white rounded-lg p-4 shadow-lg z-50 max-w-sm w-full"
    >
      <p className="text-sm">{locationError}</p>
      <button onClick={onDismiss} className="mt-2 text-sm underline">
        Dismiss
      </button>
    </motion.div>
  );
}
