import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers } from "../../../store/adminSlice";
import {
  FaUser,
  FaUserCheck,
  FaUsers,
  FaSearch,
  FaChevronRight,
} from "react-icons/fa";

export default function UserMessagePanel({
  onUserSelect,
  selectedUserId,
  searchTerm,
  sortOrder,
}) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { users = [], loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(getAllUsers({ page, limit: 10, mode: "paged" }));
  }, [dispatch, page]);

  const filteredUsers = users
    .filter((u) => u._id !== user?._id)
    .filter((u) =>
      searchTerm
        ? (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-teal-500",
    ];
    const index = id ? id.length % colors.length : 0;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (filteredUsers.length === 0 && !loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-2xl inline-block">
            <FaSearch className="text-4xl text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchTerm ? "No Users Found" : "No Users Available"}
            </h4>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              {searchTerm
                ? `No users match "${searchTerm}"`
                : "No users are currently available to message"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaUsers className="text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
              found
            </span>
          </div>
          {searchTerm && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Filtered
            </div>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u._id}
            onClick={() => onUserSelect(u._id)}
            className={`
              group relative cursor-pointer p-4 rounded-xl border transition-all duration-200 
              ${
                selectedUserId === u._id
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-md transform scale-[1.02]"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md hover:transform hover:scale-[1.01]"
              }
            `}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm
                ${getAvatarColor(u._id)} shadow-sm
              `}
              >
                {getInitials(u.name)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className={`
                    font-medium truncate
                    ${
                      selectedUserId === u._id
                        ? "text-blue-900 dark:text-blue-100"
                        : "text-gray-900 dark:text-white"
                    }
                  `}
                  >
                    {u.name || "Unknown User"}
                  </h4>
                  {selectedUserId === u._id && (
                    <FaUserCheck className="text-blue-500 text-sm flex-shrink-0" />
                  )}
                </div>
                <p
                  className={`
                  text-sm truncate
                  ${
                    selectedUserId === u._id
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-gray-500 dark:text-gray-400"
                  }
                `}
                >
                  {u.email || "No email"}
                </p>
              </div>

              {/* Selection Indicator */}
              <div
                className={`
                flex-shrink-0 transition-all duration-200
                ${
                  selectedUserId === u._id
                    ? "text-blue-500 transform scale-110"
                    : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                }
              `}
              >
                <FaChevronRight className="text-sm" />
              </div>
            </div>

            {/* Selection Border Effect */}
            {selectedUserId === u._id && (
              <div className="absolute inset-0 rounded-xl border-2 border-blue-400 dark:border-blue-500 pointer-events-none"></div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredUsers.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {selectedUserId
                ? "User selected - view messages on the right"
                : "Click on a user to view their message history"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
