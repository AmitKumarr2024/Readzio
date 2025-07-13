import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserActivity, clearUserActivity } from "../../../store/userSlice";
import Pagination from "../../../Utils/Pagination";
import DateFilter from "../../../Utils/DateFilter";
import { motion } from "framer-motion";
import { FaHistory, FaSpinner, FaTrash } from "react-icons/fa";

const PAGE_SIZE = 30;
const AUTO_CLEAR_DAYS = 1; // Days after which activities are auto-cleared

// Utility function to calculate hours remaining until auto-clear
const getHoursRemaining = (createdAt) => {
  const createdDate = new Date(createdAt);
  const clearDate = new Date(createdDate);
  clearDate.setDate(createdDate.getDate() + AUTO_CLEAR_DAYS);
  const now = new Date();
  const diffTime = clearDate - now;
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return diffHours > 0 ? diffHours : 0;
};

function AuthorActivityHistory({ userId }) {
  const dispatch = useDispatch();
  const activity = useSelector((state) => state.user.activity);
  const activityLoading = useSelector((state) => state.user.activityLoading);
  const activityError = useSelector((state) => state.user.activityError);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortFilter, setSortFilter] = useState("newest");
  const [dateFilter, setDateFilter] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (userId) dispatch(fetchUserActivity(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, sortFilter]);

  const handleClearHistory = async () => {
    if (window.confirm("Clear all activity history? This cannot be undone.")) {
      setClearing(true);
      try {
        await dispatch(clearUserActivity()).unwrap();
        dispatch(fetchUserActivity(userId));
      } catch (error) {
        console.error("Clear history failed:", error);
      } finally {
        setClearing(false);
      }
    }
  };

  const dataToUse = Array.isArray(activity) ? activity : [];
  let filteredActivity = dataToUse.filter((item) => {
    const action = typeof item.action === "string" ? item.action.toLowerCase() : "";
    const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
    const term = searchTerm.toLowerCase();
    const matchesSearch = action.includes(term) || message.includes(term);
    const matchesDate = dateFilter
      ? new Date(item.createdAt).toISOString().slice(0, 10) === dateFilter
      : true;
    return matchesSearch && matchesDate;
  });

  filteredActivity.sort((a, b) => {
    if (sortFilter === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const totalPages = Math.ceil(filteredActivity.length / PAGE_SIZE);
  const paginatedActivity = filteredActivity.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              <FaHistory className="text-indigo-600 dark:text-indigo-400" /> Activity History
            </h2>
            <motion.button
              onClick={handleClearHistory}
              disabled={clearing}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-400 flex items-center gap-2 shadow-md transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {clearing ? (
                <>
                  <FaSpinner className="animate-spin" /> Clearing...
                </>
              ) : (
                <>
                  <FaTrash /> Clear History
                </>
              )}
            </motion.button>
          </div>

          <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl p-6 mb-8 z-10 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <motion.input
                type="text"
                placeholder="Search by type or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                whileHover={{ scale: 1.01 }}
                whileFocus={{ scale: 1.01 }}
              />
              <DateFilter
                sortFilter={sortFilter}
                onSortChange={setSortFilter}
                dateFilter={dateFilter}
                onDateChange={setDateFilter}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 italic">
              Activities older than {AUTO_CLEAR_DAYS} day are automatically cleared.
            </p>
          </div>

          {activityLoading && (
            <div className="min-h-[50vh] flex items-center justify-center">
              <motion.div
                className="flex flex-col items-center space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FaSpinner className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Activities...</p>
              </motion.div>
            </div>
          )}

          {activityError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-red-600 dark:text-red-400 font-semibold text-lg py-6 bg-red-100/50 dark:bg-red-900/20 rounded-xl"
            >
              {activityError}
            </motion.p>
          )}

          {!activityLoading && !activityError && paginatedActivity.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900/80">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Auto-Clear In
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {paginatedActivity.map((item) => (
                      <motion.tr
                        key={item._id}
                        className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200"
                        whileHover={{ scale: 1.01 }}
                      >
                        <td className="px-6 py-4 font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                          {item.action}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{item.message}</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {item.createdAt ? (
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                getHoursRemaining(item.createdAt) <= 4
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                                  : "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                              }`}
                            >
                              {getHoursRemaining(item.createdAt)} hours
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 flex justify-center"
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </motion.div>
              )}
            </>
          ) : (
            !activityLoading && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-600 dark:text-gray-400 text-lg py-20 italic bg-gray-100/50 dark:bg-gray-800/50 rounded-xl"
              >
                No activity found. 📅
              </motion.p>
            )
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AuthorActivityHistory;