import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { blockUser, unblockUser } from "../../../store/blockSlice";
import { motion } from "framer-motion";
import { FaUserLock } from "react-icons/fa";
import { Lock, Unlock, User } from "lucide-react";
import toast from "react-hot-toast";

const BlockControl = ({ allUser, refetchUsers }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector((state) => state.auth?.user?._id);
  const { loading, successMessage, error } = useSelector(
    (state) => state.block || {}
  );

  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Get current user's blocked users
  const currentUserData = allUser?.data?.find(
    (user) => user._id === currentUserId
  );
  const myBlockedUsers = currentUserData?.blockedUsers || [];

  // Filter users excluding current user and based on search term
  const filteredUsers = useMemo(() => {
    return (allUser?.data || [])
      .filter((user) => user._id !== currentUserId)
      .filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [allUser, currentUserId, searchTerm]);

  const handleBlock = async () => {
    if (selectedUserId) {
      try {
        await dispatch(blockUser(selectedUserId)).unwrap();
        toast.success("User blocked successfully!");
        refetchUsers?.();
        setSelectedUserId("");
      } catch (err) {
        toast.error(err || "Failed to block user");
      }
    }
  };

  const handleUnblock = async () => {
    if (selectedUserId) {
      try {
        await dispatch(unblockUser(selectedUserId)).unwrap();
        toast.success("User unblocked successfully!");
        refetchUsers?.();
        setSelectedUserId("");
      } catch (err) {
        toast.error(err || "Failed to unblock user");
      }
    }
  };

  const getUserStatus = (user) => {
    if (user.blocked) return { text: "🔒 Blocked You", color: "text-yellow-600" };
    if (myBlockedUsers.includes(user._id))
      return { text: "🚫 You Blocked", color: "text-red-600" };
    return { text: "✅ Active", color: "text-green-600" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-100"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h2 className="text-3xl font-extrabold   text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-3">
            <FaUserLock className="text-indigo-600" /> User Block Control
          </h2>

          <div className="space-y-4">
            <motion.input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              whileHover={{ scale: 0.99 }}
            />

            <motion.select
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              whileHover={{ scale: 0.99 }}
            >
              <option value="">Select a user</option>
              {filteredUsers.map((user) => {
                const status = getUserStatus(user);
                return (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email}) - {status.text}
                  </option>
                );
              })}
            </motion.select>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                onClick={handleBlock}
                disabled={loading || !selectedUserId}
                className={`flex-1 py-3 rounded-full text-white bg-gradient-to-r from-red-600 to-red-700 transition-all duration-300 ${
                  loading || !selectedUserId
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-red-700 hover:to-red-800"
                }`}
                whileHover={{ scale: loading || !selectedUserId ? 1 : 1.1 }}
                whileTap={{ scale: loading || !selectedUserId ? 1 : 0.95 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" /> Block
                </div>
              </motion.button>
              <motion.button
                onClick={handleUnblock}
                disabled={loading || !selectedUserId}
                className={`flex-1 py-3 rounded-full text-white bg-gradient-to-r from-green-600 to-green-700 transition-all duration-300 ${
                  loading || !selectedUserId
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-green-700 hover:to-green-800"
                }`}
                whileHover={{ scale: loading || !selectedUserId ? 1 : 1.1 }}
                whileTap={{ scale: loading || !selectedUserId ? 1 : 0.95 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Unlock className="w-5 h-5" /> Unblock
                </div>
              </motion.button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 mt-6">
            <h3 className="text-2xl font-semibold   text-text-main-light dark:text-text-main-dark mb-4 flex items-center gap-2">
              <User className="text-indigo-600" /> All Users
            </h3>
            {filteredUsers.length > 0 ? (
              <ul className="space-y-3">
                {filteredUsers.map((user) => {
                  const status = getUserStatus(user);
                  return (
                    <motion.li
                      key={user._id}
                      className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-semibold   text-text-main-light dark:text-text-main-dark">
                            {user.name}
                          </span>
                          <span className="text-sm   text-text-main-light dark:text-text-main-dark">
                            {user.email}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center  text-text-main-light dark:text-text-main-dark text-lg py-6"
              >
                No users found. 🔍
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BlockControl;