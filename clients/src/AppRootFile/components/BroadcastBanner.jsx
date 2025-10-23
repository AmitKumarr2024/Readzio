import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function BroadcastBanner({ newNotification, handleDismiss }) {
  if (!newNotification) return null;

  return (
    <motion.div
      key={newNotification.timestamp}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-medium px-6 py-4 text-center shadow-lg w-full flex justify-center items-center gap-2 relative"
    >
      {newNotification.link ? (
        <a
          href={newNotification.link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-yellow-200"
        >
          <strong>{newNotification.title}</strong>: {newNotification.message}
        </a>
      ) : (
        <>
          <strong>{newNotification.title}</strong>: {newNotification.message}
        </>
      )}

      <button
        className="absolute right-4 text-white hover:text-yellow-200 transition"
        onClick={() => handleDismiss(newNotification._id)}
        aria-label="Dismiss notification"
      >
        <X size={22} />
      </button>
    </motion.div>
  );
}
