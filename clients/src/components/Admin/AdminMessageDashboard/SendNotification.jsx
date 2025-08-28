import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers } from "../../../store/adminSlice";
import {
  sendAdminNotification,
  broadcastNotification,
} from "../../../store/notificationSlice";
import {
  FaPaperPlane,
  FaUsers,
  FaBroadcastTower,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import Pagination from "../../../Utils/Pagination";

export default function SendNotification() {
  const dispatch = useDispatch();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);

  const { user } = useSelector((state) => state.auth || {});
  const {
    users = [],
    loading: userLoading,
    error: userError,
    totalUsers = 0,
    totalPagesUsers = 1,
  } = useSelector((state) => state.admin || {});
  const { loading: notificationLoading, error: notificationError } =
    useSelector((state) => state.notifications || {});

  const filteredUsers = useMemo(() => {
    return Array.isArray(users) ? users.filter((u) => u._id !== user?._id) : [];
  }, [users, user?._id]);

  useEffect(() => {
    if (user?._id) {
      dispatch(getAllUsers({ page, limit: 10, mode: "paged" }));
    }
  }, [dispatch, page, user?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!content.trim()) {
      setError("Message content is required");
      return;
    }

    try {
      if (selectedUsers.length > 0) {
        await Promise.all(
          selectedUsers.map((userId) =>
            dispatch(sendAdminNotification({ userId, content })).unwrap()
          )
        );
        setSuccess("✅ Notifications sent to selected users!");
      } else {
        await dispatch(broadcastNotification({ content })).unwrap();
        setSuccess("✅ Broadcast sent to all users!");
      }
      setSelectedUsers([]);
      setContent("");
    } catch (err) {
      console.error("[SendNotification:handleSubmit]", err);
      setError(err.message || "❌ Failed to send notification");
    }
  };

  const isLoading = userLoading || notificationLoading;
  const hasError = error || notificationError || userError;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <FaPaperPlane className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Send Notification
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Send messages to selected users or broadcast to everyone
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {isLoading && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            Processing...
          </span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <FaExclamationTriangle className="text-red-500 text-lg flex-shrink-0" />
          <span className="text-red-700 dark:text-red-300 font-medium">
            {hasError}
          </span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <FaCheck className="text-green-500 text-lg flex-shrink-0" />
          <span className="text-green-700 dark:text-green-300 font-medium">
            {success}
          </span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FaUsers className="text-gray-600 dark:text-gray-400" />
            <label className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Recipients
            </label>
          </div>

          <div className="space-y-4">
            <select
              multiple
              value={selectedUsers}
              onChange={(e) =>
                setSelectedUsers(
                  Array.from(e.target.selectedOptions, (opt) => opt.value)
                )
              }
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
              disabled={isLoading}
            >
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <option key={u._id} value={u._id} className="py-2">
                    {u.name || "Unknown"} ({u.email || "N/A"})
                  </option>
                ))
              ) : (
                <option disabled>No users found</option>
              )}
            </select>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedUsers.length > 0 ? (
                    <>
                      Selected {selectedUsers.length} user
                      {selectedUsers.length !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>Leave empty to broadcast to all users</>
                  )}
                </p>
              </div>

              {selectedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline transition-colors duration-200"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPagesUsers}
              onPageChange={(newPage) => {
                setPage(newPage);
                setSelectedUsers([]);
              }}
            />
          </div>
        </div>

        {/* Message Content Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-3 mb-4">
            <FaPaperPlane className="text-gray-600 dark:text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Message Content
            </span>
          </label>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
            placeholder="Enter your notification message here..."
            rows="6"
            required
          />

          <div className="mt-2 flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {content.length} characters
            </p>
            {content.length > 500 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Consider keeping messages concise
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className={`
              flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              ${
                selectedUsers.length > 0
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              }
            `}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                {selectedUsers.length > 0 ? (
                  <>
                    <FaUsers className="text-lg" />
                    <span>
                      Send to {selectedUsers.length} Selected User
                      {selectedUsers.length !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <FaBroadcastTower className="text-lg" />
                    <span>Broadcast to All Users</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
