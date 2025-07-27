import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllUsers,
  sendManualFeedbackPrompt,
} from "../../../store/userSlice";
import { toast } from "react-hot-toast";
import Pagination from "../../../Utils/Pagination";
import { motion } from "framer-motion";

const UserFeedbackPrompt = () => {
  const dispatch = useDispatch();
  const { users, loading, error, totalPages } = useSelector(
    (state) => state.user
  );
  const [sending, setSending] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    dispatch(
      getAllUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      })
    );
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
      toast.success("📨 Feedback request sent", {
        position: "top-right",
        duration: 3000,
      });
    } catch (err) {
      toast.error("Failed to send feedback prompt", {
        position: "top-right",
        duration: 3000,
      });
    } finally {
      setSending((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Send Feedback Prompts
        </h2>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-full max-w-md mx-auto p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {loading && (
          <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">
            Loading users...
          </p>
        )}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && users.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? "No users match your search." : "No users found."}
          </p>
        )}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full bg-white dark:bg-gray-800">
              <thead>
                <tr className="bg-blue-600 text-white text-sm uppercase tracking-wider">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Email</th>
                  <th className="p-4 text-left font-medium">Action</th>
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
                    <td className="p-4">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <motion.button
                        onClick={() => handleSendFeedbackPrompt(user._id)}
                        disabled={sending[user._id]}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserFeedbackPrompt;
