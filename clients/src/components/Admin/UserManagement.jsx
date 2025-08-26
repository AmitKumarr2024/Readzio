import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllUsers,
  toggleBlockUser,
  toggleUserRole,
  deleteUser,
  clearError,
} from "../../store/adminSlice";
import Pagination from "../../Utils/Pagination";
import {
  Search,
  SortAsc,
  SortDesc,
  Shield,
  Users,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

const UserManagement = () => {
  const dispatch = useDispatch();
  const {
    users = [],
    loading = false,
    error = null,
    currentPageUsers = 1,
    totalPagesUsers = 1,
    totalUsers = 0,
  } = useSelector((state) => state.admin);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    dispatch(
      getAllUsers({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

  const handleToggleBlock = async (userId) => {
    try {
      const result = await dispatch(toggleBlockUser(userId)).unwrap();
      toast.success(
        `User ${result.blocked ? "blocked" : "unblocked"} successfully`
      );
      await dispatch(
        getAllUsers({
          page,
          limit: 10,
          search: searchQuery,
          sortField,
          sortOrder,
        })
      );
    } catch (err) {
      console.error("[handleToggleBlock] Error toggling user:", err);
      toast.error("Toggle failed: " + err.message);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const actionText =
      currentRole === "admin"
        ? "demote this admin to user"
        : "promote this user to admin";
    const confirmMessage = `Are you sure you want to ${actionText}? This will ${
      currentRole === "admin"
        ? "remove admin privileges and move them to the regular users section"
        : "grant admin privileges and move them to the protected admin section"
    }.`;

    if (window.confirm(confirmMessage)) {
      try {
        const result = await dispatch(toggleUserRole(userId)).unwrap();
        const newRole =
          result.role || (currentRole === "admin" ? "user" : "admin");
        toast.success(
          `User ${
            currentRole === "admin" ? "demoted to user" : "promoted to admin"
          } successfully`
        );

        // Show additional message about section movement
        setTimeout(() => {
          toast.success(
            `User moved to ${
              newRole === "admin" ? "Admin" : "Regular Users"
            } section`
          );
        }, 1000);

        await dispatch(
          getAllUsers({
            page,
            limit: 10,
            search: searchQuery,
            sortField,
            sortOrder,
          })
        );
      } catch (err) {
        console.error("[handleToggleRole] Error toggling role:", err);
        toast.error("Role update failed: " + err.message);
      }
    }
  };

  const handleDelete = async (userId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      try {
        await dispatch(deleteUser(userId)).unwrap();
        toast.success("User deleted successfully");
        await dispatch(
          getAllUsers({
            page,
            limit: 10,
            search: searchQuery,
            sortField,
            sortOrder,
          })
        );
      } catch (err) {
        console.error("[handleDelete] Error deleting user:", err);
        toast.error("Delete failed: " + err.message);
      }
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
  };

  const filteredUsers = users.filter((user) => {
    const match =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return match;
  });

  // Separate admins and regular users with real-time updates
  const adminUsers = filteredUsers.filter((user) => user.role === "admin");
  const regularUsers = filteredUsers.filter((user) => user.role !== "admin");

  // Get counts for display
  const adminCount = users.filter((user) => user.role === "admin").length;
  const regularUserCount = totalUsers - adminCount;

  const getSerialNumber = (index, isAdmin = false) => {
    if (isAdmin) return index + 1;
    return (page - 1) * 10 + index + 1;
  };

  const UserRow = ({ user, index, isAdmin = false, serialNumber }) => (
    <tr
      key={user._id}
      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200"
    >
      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
        #{serialNumber}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                user.role === "admin"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
              }`}
            >
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span>{user.name}</span>
              {user.role === "admin" && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {user.email}
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            user.role === "admin"
              ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-800 dark:text-purple-300"
              : "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-700 dark:to-slate-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {user.role === "admin" ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </>
          ) : (
            <>
              <Users className="w-3 h-3 mr-1" />
              User
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            user.blocked
              ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
              : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              user.blocked ? "bg-red-500" : "bg-green-500"
            }`}
          ></div>
          {user.blocked ? "Blocked" : "Active"}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <>
              <button
                onClick={() => handleToggleBlock(user._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-200 hover:scale-105 ${
                  user.blocked
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-200 dark:shadow-green-900/50"
                    : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-yellow-200 dark:shadow-yellow-900/50"
                } shadow-md`}
              >
                {user.blocked ? "Unblock" : "Block"}
              </button>
              <button
                onClick={() => handleToggleRole(user._id, user.role)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 shadow-md shadow-blue-200 dark:shadow-blue-900/50"
              >
                {user.role === "admin" ? "Demote to User" : "Promote to Admin"}
              </button>
              <button
                onClick={() => handleDelete(user._id)}
                className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 shadow-md shadow-red-200 dark:shadow-red-900/50"
              >
                Delete
              </button>
            </>
          )}
          {isAdmin && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-medium">
              <Shield className="w-3 h-3" />
              Protected
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            User Management
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Total Users:{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {totalUsers}
          </span>
          {adminCount > 0 && (
            <>
              {" "}
              • Admins:{" "}
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {adminCount}
              </span>
            </>
          )}
          {regularUserCount > 0 && (
            <>
              {" "}
              • Regular Users:{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {regularUserCount}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("name")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              sortField === "name"
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {sortField === "name" && sortOrder === "asc" ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
            Name
          </button>
          <button
            onClick={() => handleSort("email")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              sortField === "email"
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {sortField === "email" && sortOrder === "asc" ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
            Email
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => dispatch(clearError())}
            className="text-red-600 dark:text-red-400 font-semibold hover:text-red-800 dark:hover:text-red-200 transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* No Users Found */}
      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search criteria.
          </p>
        </div>
      )}

      {/* Admin Users Section */}
      {!loading && adminUsers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Admin Users ({adminUsers.length})
              </h3>
              <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                Protected from deletion
              </span>
            </div>
            {searchQuery && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Filtered from {adminCount} total admins
              </span>
            )}
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800">
            <table className="min-w-full">
              <thead className="bg-purple-100 dark:bg-purple-900/40">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-purple-200 dark:divide-purple-800">
                {adminUsers.map((user, index) => (
                  <UserRow
                    key={`admin-${user._id}`}
                    user={user}
                    index={index}
                    isAdmin={true}
                    serialNumber={getSerialNumber(index, true)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regular Users Section */}
      {!loading && regularUsers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Regular Users ({regularUsers.length})
              </h3>
            </div>
            {searchQuery && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Filtered from {regularUserCount} total users
              </span>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {regularUsers.map((user, index) => (
                  <UserRow
                    key={`user-${user._id}`}
                    user={user}
                    index={index}
                    isAdmin={false}
                    serialNumber={getSerialNumber(index, false)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalUsers > 10 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPagesUsers}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default UserManagement;
