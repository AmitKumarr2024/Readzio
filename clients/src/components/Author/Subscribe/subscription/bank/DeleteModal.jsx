import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const DeleteModal = ({
  showDeleteModal,
  paymentId,
  setShowDeleteModal,
  confirmDelete,
}) => {
  return (
    <AnimatePresence>
      {showDeleteModal && (
        <motion.div
          className="fixed inset-0 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="p-4 sm:p-8 rounded-2xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-xl max-w-sm w-full"
            initial={{ scale: 0.7, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 50 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-4  text-text-main-light dark:text-text-main-dark">
              Confirm Deletion
            </h3>
            <p className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark text-sm sm:text-base">
              Are you sure you want to delete the bank details for Payment ID:{" "}
              <strong>{paymentId}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4 mt-4 sm:mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1 sm:px-4 sm:py-2 rounded-xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-300 text-sm sm:text-base"
              >
                Cancel
              </button>
              <motion.button
                onClick={confirmDelete}
                className="px-3 py-1 sm:px-4 sm:py-2 rounded-xl bg-red-600  text-text-main-light dark:text-text-main-dark hover:bg-red-700 text-sm sm:text-base"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(DeleteModal);