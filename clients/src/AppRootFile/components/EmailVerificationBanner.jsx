import React from "react";
import { motion } from "framer-motion";

export default function EmailVerificationBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 p-4 text-sm text-center shadow-md w-full"
    >
      Your account is not verified.{" "}
      <a
        href="/verify"
        className="underline font-semibold hover:text-yellow-600 dark:hover:text-yellow-300"
      >
        Click here to verify your email.
      </a>
    </motion.div>
  );
}
