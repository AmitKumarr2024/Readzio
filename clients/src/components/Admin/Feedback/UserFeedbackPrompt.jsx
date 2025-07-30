import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllUserFeedback,
  getAllUsers,
  sendManualFeedbackPrompt,
} from "../../../store/userSlice";
import { initializeSocket } from "../../../store/socketSlice";
import { toast } from "react-hot-toast";
import Pagination from "../../../Utils/Pagination";
import { motion } from "framer-motion";

const UserFeedbackPrompt = () => {
  const dispatch = useDispatch();
  const {
    users,
    loading,
    error,
    totalPages = 1,
  } = useSelector((state) => state.user);
  const { isConnected } = useSelector((state) => state.socket);
  const [sending, setSending] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Initialize WebSocket and fetch users
  useEffect(() => {
    dispatch(initializeSocket());
    dispatch(
      getAllUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      })
    );
    dispatch(fetchAllUserFeedback());
  }, [dispatch, currentPage, searchTerm]);

  const handleSendFeedbackPrompt = async (userId) => {
    try {
      setSending((prev) => ({ ...prev, [userId]: true }));
      await dispatch(
        sendManualFeedbackPrompt({
          userId,
          message: "We'd love your feedback!",
        })
      ).unwrap();
      toast.success("📨 Feedback request sent");
      // Refetch users to update status
      dispatch(
        getAllUsers({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
        })
      );
      dispatch(fetchAllUserFeedback());
    } catch (err) {
      toast.error("Failed to send feedback prompt");
    } finally {
      setSending((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6 text-center">
          Send Feedback Prompts
        </h2>
        {!isConnected && (
          <p className="text-center text-yellow-500 mb-4">
            WebSocket disconnected. Real-time updates may be delayed.
          </p>
        )}

        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-md p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
        </div>

        {loading && (
          <p className="text-center text-gray-600 dark:text-gray-400 animate-pulse">
            Loading users...
          </p>
        )}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && users.length === 0 && (
          <p className="text-center text-gray-600 dark:text-gray-400">
            {searchTerm ? "No users match your search." : "No users found."}
          </p>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto rounded-xl shadow-lg">
            <table className="w-full bg-white dark:bg-gray-800">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm uppercase tracking-wider">
                  <th className="p-4 text-left font-semibold">Name</th>
                  <th className="p-4 text-left font-semibold">Email</th>
                  <th className="p-4 text-left font-semibold">Prompt Status</th>
                  <th className="p-4 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <motion.tr
                    key={user._id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      {user.feedbackPrompt?.shown ? "Send" : "Not Send"}
                    </td>
                    <td className="p-4">
                      <motion.button
                        onClick={() => handleSendFeedbackPrompt(user._id)}
                        disabled={
                          sending[user._id] || user.feedbackPrompt?.shown
                        }
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {sending[user._id] ? "Sending..." : "Send Prompt"}
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, totalPages)}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserFeedbackPrompt;
