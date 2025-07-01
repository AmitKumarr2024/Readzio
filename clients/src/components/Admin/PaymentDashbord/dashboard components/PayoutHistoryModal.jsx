import React from "react";
import { motion } from "framer-motion";

const PayoutHistoryModal = ({ payoutHistoryUser, payoutHistory, historyLoading, closePayoutHistoryModal }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-white border border-gray-100 shadow-2xl backdrop-blur-sm"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          Payout History for {payoutHistoryUser.username}
        </h3>
        <button
          onClick={closePayoutHistoryModal}
          className="text-gray-600 hover:text-gray-800 transition-all duration-300"
        >
          ✕
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-blue-50 text-blue-700 font-semibold">
              <th className="p-3 sm:p-4">Date</th>
              <th className="p-3 sm:p-4">Amount</th>
              <th className="p-3 sm:p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr>
                <td colSpan="3" className="p-4 sm:p-6 text-center text-blue-500">
                  Loading...
                </td>
              </tr>
            ) : payoutHistory.length ? (
              payoutHistory.map((payout) => (
                <motion.tr
                  key={payout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-100 text-gray-800 hover:bg-blue-50/50 transition-all duration-200"
                >
                  <td className="p-3 sm:p-4">{payout.date}</td>
                  <td className="p-3 sm:p-4">₹{payout.amount}</td>
                  <td className="p-3 sm:p-4">
                    <span
                      className={`text-sm ${
                        payout.status === "processed" || payout.status === "payout_done"
                          ? "text-green-600"
                          : payout.status === "queued" || payout.status === "payout_created"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {payout.status}
                    </span>
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="p-4 sm:p-6 text-center text-blue-500">
                  No payout history available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  </div>
);

export default PayoutHistoryModal;