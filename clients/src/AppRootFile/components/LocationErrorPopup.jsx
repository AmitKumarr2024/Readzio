import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

export default function LocationErrorPopup({ locationError, onDismiss }) {
  return (
    <AnimatePresence>
      {locationError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="flex items-start gap-3 rounded-xl border border-red-400 bg-red-100 p-4 shadow-xl dark:bg-red-600/20 dark:border-red-500 backdrop-blur">
            <AlertCircle className="text-red-600 dark:text-red-400 mt-1" size={20} />
            <div className="flex-1 text-sm text-red-800 dark:text-red-200">
              {locationError}
            </div>
            <button
              onClick={() => {
                onDismiss(); // call state reset (optional if handled elsewhere)
                window.location.reload(); // full page refresh
              }}
              aria-label="Dismiss"
              className="text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
