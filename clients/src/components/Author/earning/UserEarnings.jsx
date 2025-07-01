import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserEarnings, clearError, clearSuccess, resetEarnings } from "../../../store/earningSlice";
import { motion } from "framer-motion";
import { FaMoneyBillWave } from "react-icons/fa";

const UserEarnings = ({ userId }) => {
  const dispatch = useDispatch();
  const earningsState = useSelector((state) => state.earnings || {});
  const { userEarnings, loading, error, success } = earningsState;

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserEarnings());
    }
  }, [dispatch, userId]);

  const handleReset = () => dispatch(resetEarnings());
  const handleClearMessages = () => {
    dispatch(clearError());
    dispatch(clearSuccess());
  };

  const defaultEarnings = {
    subscriptionEarnings: 0,
    adsEarnings: 0,
    totalEarnings: 0,
    paymentRecords: [],
  };

  const dummyPaymentRecord = [
    {
      orderId: "order_ABC123XYZ",
      notes: { type: "subscription" },
      amount: 150000,
      status: "paid",
      createdAt: "2025-06-01T10:30:00Z",
    },
  ];

  const earnings = userEarnings || defaultEarnings;
  const paymentRecords = earnings.paymentRecords.length > 0 ? earnings.paymentRecords : dummyPaymentRecord;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h1 className="text-3xl font-extrabold   text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-3">
            <FaMoneyBillWave className="text-indigo-600" /> Your Earnings
          </h1>

          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-indigo-600 text-lg text-center py-6"
            >
              Loading...
            </motion.p>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-background-light dark:bg-background-dark   text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center"
            >
              <span>{error}</span>
              <motion.button
                onClick={handleClearMessages}
                className="text-indigo-600 underline"
                whileHover={{ scale: 1.1 }}
              >
                Clear
              </motion.button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-background-light dark:bg-background-dark   text-green-700 p-4 rounded-xl mb-6 flex justify-between items-center"
            >
              <span>{success}</span>
              <motion.button
                onClick={handleClearMessages}
                className="text-indigo-600 underline"
                whileHover={{ scale: 1.1 }}
              >
                Clear
              </motion.button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: "Subscription Earnings", value: earnings.subscriptionEarnings.toFixed(2) },
              { label: "Ads Earnings", value: earnings.adsEarnings.toFixed(2) },
              { label: "Total Earnings", value: earnings.totalEarnings.toFixed(2) },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <h2 className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark">{label}</h2>
                <p className="text-2xl font-extrabold text-indigo-600">₹{value}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <motion.button
              onClick={() => dispatch(fetchUserEarnings())}
              disabled={loading}
              className={`px-6 py-3 rounded-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              Refresh Earnings
            </motion.button>
            <motion.button
              onClick={handleReset}
              className="px-6 py-3 rounded-full text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              Reset Earnings
            </motion.button>
          </div>

          <h2 className="text-2xl font-semibold  text-text-main-light dark:text-text-main-dark mb-4">Payment Records</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="min-w-full bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark divide-y divide-gray-200">
              <thead className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark">
                <tr>
                  {["Order ID", "Type", "Amount (₹)", "Status", "Date"].map((head) => (
                    <th
                      key={head}
                      className="px-6 py-4 text-left text-xs font-semibold   text-text-main-light dark:text-text-main-dark uppercase tracking-wide"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentRecords.map((record) => (
                  <motion.tr
                    key={record.orderId}
                    className="hover:bg-indigo-50 transition-all duration-200"
                    whileHover={{ scale: 1.01 }}
                  >
                    <td className="px-6 py-4">{record.orderId}</td>
                    <td className="px-6 py-4">{record.notes?.type || "N/A"}</td>
                    <td className="px-6 py-4">{(record.amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-4">{record.status}</td>
                    <td className="px-6 py-4">{new Date(record.createdAt).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {paymentRecords === dummyPaymentRecord && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-500 text-sm mt-2 text-center"
            >
              *This is a sample entry. No real payment records found.
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserEarnings;