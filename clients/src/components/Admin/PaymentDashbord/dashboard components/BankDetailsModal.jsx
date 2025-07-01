import React from "react";
import { motion } from "framer-motion";
import ViewBankDetailsStandalone from "../ViewBankDetailsStandalone";

const BankDetailsModal = ({ modalUser, fetchedBankDetails, bankLoading, closeModal }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-white border border-gray-100 shadow-2xl backdrop-blur-sm"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          Bank Details for {modalUser.username}
        </h3>
        <button
          onClick={closeModal}
          className="text-gray-600 hover:text-gray-800 transition-all duration-300"
        >
          ✕
        </button>
      </div>
      <ViewBankDetailsStandalone
        bankDetails={fetchedBankDetails}
        loading={bankLoading}
        copyToClipboard={(val) => navigator.clipboard.writeText(val)}
        userId={modalUser?.userId}
      />
    </motion.div>
  </div>
);

export default BankDetailsModal;