import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserActivity, clearUserActivity } from "../../../store/userSlice";
import Pagination from "../../../Utils/Pagination";
import DateFilter from "../../../Utils/DateFilter";
import { motion } from "framer-motion";
import { FaHistory,FaSpinner } from "react-icons/fa";

const PAGE_SIZE = 30;
const AUTO_CLEAR_DAYS = 30; // Days after which activities are auto-cleared

// Utility function to calculate days remaining until auto-clear
const getDaysRemaining = (createdAt) => {
  const createdDate = new Date(createdAt);
  const clearDate = new Date(createdDate);
  clearDate.setDate(createdDate.getDate() + AUTO_CLEAR_DAYS);
  const now = new Date();
  const diffTime = clearDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
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
      className="min-h-screen bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark flex items-center gap-3">
              <FaHistory className="text-indigo-600" /> Activity History
            </h2>
            <motion.button
              onClick={handleClearHistory}
              disabled={clearing}
              className="px-4 py-2 bg-red-600   text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-red-700 disabled:bg-red-400"
              whileHover={{ scale: 1.05 }}
            >
              {clearing ? "Clearing..." : "Clear History"}
            </motion.button>
          </div>

          <div className="sticky top-0 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-xl p-4 mb-6 z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <motion.input
                type="text"
                placeholder="Search by type or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                whileHover={{ scale: 0.99 }}
              />
              <DateFilter
                sortFilter={sortFilter}
                onSortChange={setSortFilter}
                dateFilter={dateFilter}
                onDateChange={setDateFilter}
              />
            </div>
            <p className="text-sm   text-text-main-light dark:text-text-main-dark mt-2 italic">
              Activities older than {AUTO_CLEAR_DAYS} days are automatically cleared.
            </p>
          </div>

          {activityLoading && (
           <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark">Loading...</p>
        </motion.div>
      </div>
          )}

          {activityError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-red-600 font-semibold text-lg py-6"
            >
              {activityError}
            </motion.p>
          )}

          {!activityLoading && !activityError && paginatedActivity.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y text-sm">
                  <thead className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold   text-text-main-light dark:text-text-main-dark uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left font-semibold">
                        Content
                      </th>
                      <th className="px-6 py-4 text-left font-semibold">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left font-semibold">
                        Auto-Clear In
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark">
                    {paginatedActivity.map((item) => (
                      <motion.tr
                        key={item._id}
                        className="hover:bg-indigo-500  transition-all duration-200"
                        whileHover={{ scale: 1.01 }}
                      >
                        <td className="px-6 py-3 font-semibold uppercase  text-text-main-light dark:text-text-main-dark">
                          {item.action}
                        </td>
                        <td className="px-6 py-3   text-text-main-light dark:text-text-main-dark">{item.message}</td>
                        <td className="px-6 py-3   text-text-main-light dark:text-text-main-dark">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                        </td>
                        <td className="px-6 py-3   text-text-main-light dark:text-text-main-dark">
                          {item.createdAt ? (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                getDaysRemaining(item.createdAt) <= 5
                                  ? "bg-red-100 text-red-600"
                                  : "bg-green-100 text-green-600"
                              }`}
                            >
                              {getDaysRemaining(item.createdAt)} days
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
                  className="mt-6 flex justify-center"
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
                className="text-center   text-text-main-light dark:text-text-main-dark text-lg py-20 italic"
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