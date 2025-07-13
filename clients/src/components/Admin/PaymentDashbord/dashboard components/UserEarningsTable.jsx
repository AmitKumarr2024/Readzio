import React from "react";
import { motion } from "framer-motion";
import { FaCheck, FaEdit, FaEye, FaHistory } from "react-icons/fa";

const UserEarningsTable = ({
  filteredEarningsArray,
  selectedUsers,
  handleSelectUser,
  payoutAmounts,
  handlePayoutAmountChange,
  editingAmounts,
  toggleEditAmount,
  checkedUsers,
  openModal,
  openPayoutHistoryModal,
  handleBulkPayout,
  filterStatus,
  setFilterStatus,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="p-4 sm:p-6 rounded-2xl shadow-lg bg-background-light dark:bg-background-dark backdrop-blur-md border border-gray-200 dark:border-gray-700"
  >
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <h2 className="text-xl sm:text-2xl font-bold text-text-main-light dark:text-text-main-dark">
        User Earnings & Bulk Payouts
      </h2>
      <div className="flex items-center gap-3">
        <button
          onClick={handleBulkPayout}
          disabled={!selectedUsers.some((id) => checkedUsers[id] === true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-sm ${
            selectedUsers.some((id) => checkedUsers[id] === true)
              ? "bg-blue-600 text-text-main-light dark:text-text-main-dark hover:bg-blue-700 dark:hover:bg-blue-800"
              : "bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark cursor-not-allowed"
          }`}
          aria-disabled={!selectedUsers.some((id) => checkedUsers[id] === true)}
        >
          <FaCheck className="w-4 h-4" />
          Process Bulk Payouts
        </button>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
          aria-label="Filter users by bank status"
        >
          <option value="all">All Users</option>
          <option value="present">Bank Account Present</option>
          <option value="none">No Bank Account</option>
          <option value="notChecked">Not Checked</option>
        </select>
      </div>
    </div>
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm text-left table-auto">
        <thead className="bg-background-light dark:bg-background-dark text-blue-700 dark:text-blue-300 font-semibold sticky top-0 z-10">
          <tr>
            <th className="p-3 sm:p-4 w-16" scope="col">Select</th>
            <th className="p-3 sm:p-4 min-w-[200px]" scope="col">User</th>
            <th className="p-3 sm:p-4 w-28" scope="col">

Subscription</th>
            <th className="p-3 sm:p-4 w-28" scope="col">Ads</th>
            <th className="p-3 sm:p-4 w-28" scope="col">Total</th>
            <th className="p-3 sm:p-4 w-32" scope="col">Bank Status</th>
            <th className="p-3 sm:p-4 w-48" scope="col">Actions</th>
            <th className="p-3 sm:p-4 w-40" scope="col">Payout Amount</th>
          </tr>
        </thead>
        <tbody>
          {filteredEarningsArray.length ? (
            filteredEarningsArray.map((earning, index) => (
              <motion.tr
                key={earning.user._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-t border-gray-200 dark:border-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-200 ${
                  index % 2 === 0 ? "bg-gray-50 dark:bg-background-dark/50" : "bg-background-light dark:bg-background-dark"
                }`}
              >
                <td className="p-3 sm:p-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(earning.user._id)}
                    onChange={() => handleSelectUser(earning.user._id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    aria-label={`Select user ${earning.user?.username || "Unknown"}`}
                  />
                </td>
                <td className="p-3 sm:p-4">
                  {earning.user ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-text-main-light dark:text-text-main-dark">{earning.user.username}</span>
                      <span className="text-xs text-text-main-light dark:text-text-main-dark/80">{earning.user.email}</span>
                    </div>
                  ) : (
                    "Unknown User"
                  )}
                </td>
                <td className="p-3 sm:p-4">₹{(typeof earning.subscription === "number" ? earning.subscription : 0).toFixed(2)}</td>
                <td className="p-3 sm:p-4">₹{(typeof earning.ads === "number" ? earning.ads : 0).toFixed(2)}</td>
                <td className="p-3 sm:p-4 font-semibold">₹{(typeof earning.total === "number" ? earning.total : 0).toFixed(2)}</td>
                <td className="p-3 sm:p-4">
                  <span
                    className={`text-sm font-medium ${
                      earning.user._id in checkedUsers
                        ? checkedUsers[earning.user._id]
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    aria-label={`Bank status: ${
                      earning.user._id in checkedUsers
                        ? checkedUsers[earning.user._id]
                          ? "Present"
                          : "None"
                        : "Checking"
                    }`}
                  >
                    {earning.user._id in checkedUsers
                      ? checkedUsers[earning.user._id]
                        ? "Present"
                        : "None"
                      : "Checking..."}
                  </span>
                </td>
                <td className="p-3 sm:p-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() =>
                      openModal({
                        userId: earning.user._id,
                        username: earning.user.username,
                        email: earning.user.email,
                      })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-300 shadow-sm"
                    title="View bank details"
                    aria-label={`View bank details for ${earning.user?.username || "user"}`}
                  >
                    <FaEye className="w-4 h-4" />
                    View Bank
                  </button>
                  <button
                    onClick={() =>
                      openPayoutHistoryModal({
                        userId: earning.user._id,
                        username: earning.user.username,
                        email: earning.user.email,
                      })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-all duration-300 shadow-sm"
                    title="View payout history"
                    aria-label={`View payout history for ${earning.user?.username || "user"}`}
                  >
                    <FaHistory className="w-4 h-4" />
                    View History
                  </button>
                </td>
                <td className="p-3 sm:p-4">
                  <div className="flex items-center space-x-3">
                    {editingAmounts[earning.user._id] ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payoutAmounts[earning.user._id] || ""}
                        onChange={(e) => handlePayoutAmountChange(earning.user._id, e.target.value)}
                        className="w-20 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm text-right"
                        placeholder="₹0.00"
                        aria-label={`Edit payout amount for ${earning.user?.username || "user"}`}
                      />
                    ) : (
                      <span className="w-20 text-sm font-medium text-text-main-light dark:text-text-main-dark text-right">
                        ₹{payoutAmounts[earning.user._id] || "0.00"}
                      </span>
                    )}
                    <button
                      onClick={() => toggleEditAmount(earning.user._id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-blue-300 dark:hover:bg-blue-600 transition-all duration-300 shadow-sm"
                      title={editingAmounts[earning.user._id] ? "Save amount" : "Edit amount"}
                      aria-label={editingAmounts[earning.user._id] ? "Save payout amount" : "Edit payout amount"}
                    >
                      <FaEdit className="w-3 h-3" />
                      {editingAmounts[earning.user._id] ? "Save" : "Edit"}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="p-4 sm:p-6 text-center text-blue-500 dark:text彼此

:text-blue-300 text-sm">
                No earnings data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </motion.div>
);

export default UserEarningsTable;