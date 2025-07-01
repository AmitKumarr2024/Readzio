import React from "react";
import { motion } from "framer-motion";
import { FaExclamationTriangle } from "react-icons/fa";
import { FaArrowsSplitUpAndLeft } from "react-icons/fa6";

const DeleteBankDetails = ({ paymentId, loading, handleDelete }) => {
  const disabled = loading || !paymentId || paymentId === "null";

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.h2
        className="text-2xl sm:text-4xl font-extrabold text-center  text-text-main-light dark:text-text-main-dark bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Delete Bank Details
      </motion.h2>

      <motion.div
        className="p-6 sm:p-8 rounded-2xl bg-background-light dark:bg-background-dark  shadow-xl border border-gray-200 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {paymentId && paymentId !== "null" ? (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 text-red-600 mb-6">
              <FaExclamationTriangle className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
              <p className="text-sm sm:text-base  text-text-main-light dark:text-text-main-dark">
                This will <span className="font-semibold text-red-700">permanently delete</span> bank details for:
                <br />
                <span className="text-xs sm:text-sm font-medium  text-text-main-light dark:text-text-main-dark">
                  Payment ID: <strong>{paymentId}</strong>
                </span>
              </p>
            </div>

            <motion.button
              onClick={handleDelete}
              disabled={disabled}
              className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-lg transition-all duration-300 ${
                disabled
                  ? "bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark cursor-not-allowed"
                  : "bg-red-600  text-text-main-light dark:text-text-main-dark hover:bg-red-700 hover:shadow-xl"
              }`}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
            >
              {loading ? (
                <FaArrowsSplitUpAndLeft className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto" />
              ) : (
                "Delete Account"
              )}
            </motion.button>
          </>
        ) : (
          <p className="text-base sm:text-lg  text-text-main-light dark:text-text-main-dark">
            No bank details found to delete. Please create bank details first.
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(DeleteBankDetails);