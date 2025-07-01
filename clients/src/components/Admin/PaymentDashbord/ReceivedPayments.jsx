import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import { motion } from "framer-motion";
import { FaSearch, FaSort } from "react-icons/fa";
import { FiDollarSign } from "react-icons/fi";
import { fetchAllPaymentRecords } from "../../../store/paymentSlice";
import toast from "react-hot-toast";

const selectPaymentState = (state) => state.payment || {};

const selectPayments = createSelector([selectPaymentState], (payment) => ({
  paymentRecords: Array.isArray(payment.paymentRecords) ? payment.paymentRecords : [], // Ensure array
  paymentRecordsStatus: payment.paymentRecordsStatus,
  paymentRecordsError: payment.paymentRecordsError,
}));

const ReceivedPayments = () => {
  const dispatch = useDispatch();
  const { paymentRecords, paymentRecordsStatus, paymentRecordsError } = useSelector(selectPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    dispatch(fetchAllPaymentRecords({ page, limit, status: filterStatus === "all" ? "" : filterStatus }));
  }, [dispatch, page, filterStatus]);

  const filteredPayments = paymentRecords
    .filter((payment) =>
      searchTerm
        ? (payment.userId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (payment.paymentId || "").toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const fieldA = a[sortField] || "";
      const fieldB = b[sortField] || "";
      if (sortField === "createdAt") {
        return sortOrder === "asc"
          ? new Date(fieldA) - new Date(fieldB)
          : new Date(fieldB) - new Date(fieldA);
      }
      if (sortField === "amount") {
        return sortOrder === "asc" ? fieldA - fieldB : fieldB - fieldA;
      }
      return sortOrder === "asc"
        ? fieldA.toString().localeCompare(fieldB.toString())
        : fieldB.toString().localeCompare(fieldA.toString());
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-100"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 flex items-center gap-3">
            <FiDollarSign className="w-8 h-8 text-blue-600" /> Received Payments
          </h1>
        </motion.div>

        {/* Error Messages */}
        {paymentRecordsError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 text-red-800 rounded-2xl shadow-md flex justify-between items-center"
          >
            <span className="font-medium">{paymentRecordsError}</span>
            <button
              onClick={() => dispatch(fetchAllPaymentRecords({ page, limit, status: filterStatus === "all" ? "" : filterStatus }))}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {paymentRecordsStatus === "loading" && (
          <div className="text-center py-12">
            <svg className="w-10 h-10 animate-spin mx-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="text-lg font-medium text-blue-600">Loading...</span>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user ID or payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="createdAt">Date</option>
              <option value="userId">User ID</option>
              <option value="paymentId">Payment ID</option>
              <option value="amount">Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
            >
              <FaSort />
              Sort {sortOrder === "asc" ? "A-Z" : "Z-A"}
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Payment Records Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-6 rounded-2xl shadow-xl bg-white backdrop-blur-sm"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
            Payment Records
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-blue-50 text-blue-700 font-semibold">
                  <th className="p-3 sm:p-4">User ID</th>
                  <th className="p-3 sm:p-4">Payment ID</th>
                  <th className="p-3 sm:p-4">Order ID</th>
                  <th className="p-3 sm:p-4">Amount</th>
                  <th className="p-3 sm:p-4">Status</th>
                  <th className="p-3 sm:p-4">Date</th>
                  <th className="p-3 sm:p-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length ? (
                  filteredPayments.map((payment) => (
                    <motion.tr
                      key={payment.paymentId || payment._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 text-gray-800 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <td className="p-3 sm:p-4">{payment.userId || "N/A"}</td>
                      <td className="p-3 sm:p-4">{payment.paymentId || "N/A"}</td>
                      <td className="p-3 sm:p-4">{payment.orderId || "N/A"}</td>
                      <td className="p-3 sm:p-4">₹{(payment.amount / 100).toFixed(2)}</td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`text-sm ${
                            payment.status === "paid" || payment.status === "processed"
                              ? "text-green-600"
                              : payment.status === "queued" || payment.status === "payout_created"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="p-3 sm:p-4">{payment.type || "N/A"}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-4 sm:p-6 text-center text-blue-500">
                      No payment records available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">Page {page}</span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={filteredPayments.length < limit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300"
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ReceivedPayments;