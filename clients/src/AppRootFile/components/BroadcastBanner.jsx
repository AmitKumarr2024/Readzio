import React from "react";
import { motion } from "framer-motion";

export default function BroadcastBanner({ newNotification, handleDismiss }) {
  if (!newNotification) return null;

  return (
    <motion.div
      key={newNotification.timestamp}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 p-4 text-sm text-center shadow-md w-full"
    >
      {newNotification.link ? (
        <a
          href={newNotification.link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:text-blue-600 dark:hover:text-blue-300"
        >
          <strong>{newNotification.title}</strong>: {newNotification.message}
        </a>
      ) : (
        <>
          <strong>{newNotification.title}</strong>: {newNotification.message}
        </>
      )}
      <button
        className="ml-4 text-sm underline"
        onClick={() => handleDismiss(newNotification._id)}
      >
        Dismiss
      </button>
    </motion.div>
  );
}
