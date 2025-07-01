import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllUsers,
  toggleBlockUser,
  toggleUserRole,
  deleteUser,
  clearError,
} from '../../store/adminSlice';
import Pagination from '../../Utils/Pagination';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    console.log('[useEffect] Fetching users with params:', {
      page,
      limit: 10,
      search: searchQuery,
      sortField,
      sortOrder,
    });
    dispatch(getAllUsers({ page, limit: 10, search: searchQuery, sortField, sortOrder }));
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

 const handleToggleBlock = async (userId) => {
  console.log("[handleToggleBlock] Toggling block for userId:", userId);
  try {
    const result = await dispatch(toggleBlockUser(userId)).unwrap();
    toast.success(`User ${result.blocked ? "blocked" : "unblocked"} successfully`);
    console.log("[handleToggleBlock] ✅ Toggle successful:", result);
    await dispatch(getAllUsers({ page, limit: 10, search: searchQuery, sortField, sortOrder }));
    console.log("[handleToggleBlock] 🔄 Refetched user list after toggle");
  } catch (err) {
    console.error("[handleToggleBlock] ❌ Error toggling user:", err);
    toast.error("Toggle failed: " + err.message);
  }
};

  const handleToggleRole = (userId) => {
    console.log('[handleToggleRole] Toggling role for userId:', userId);
    dispatch(toggleUserRole(userId));
  };

  const handleDelete = (userId) => {
    console.log('[handleDelete] Attempt to delete userId:', userId);
    if (window.confirm('Are you sure you want to delete this user?')) {
      dispatch(deleteUser(userId));
    }
  };

  const handlePageChange = (newPage) => {
    console.log('[handlePageChange] New page:', newPage);
    setPage(newPage);
  };

  const handleSort = (field) => {
    console.log('[handleSort] Sorting by:', field);
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const filteredUsers = users.filter(user => {
    const match =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    console.log(`[filter] User ${user._id} match:`, match);
    return match;
  });

  console.log('[render] Filtered users:', filteredUsers);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">User Management ({totalUsers})</h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              console.log('[search] Query changed to:', e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === 'name' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Name
          </button>
          <button
            onClick={() => handleSort('email')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === 'email' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Email
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => {
              console.log('[clearError] Clearing error');
              dispatch(clearError());
            }}
            className="text-red-900 font-semibold hover:text-red-700 transition"
          >
            Clear
          </button>
        </div>
      )}

      {loading && <p className="text-gray-500 text-center py-4">Loading...</p>}
      {!loading && filteredUsers.length === 0 && (
        <div className="p-4 text-center text-gray-600">No users found.</div>
      )}
      {!loading && filteredUsers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 text-left text-sm font-semibold">Name</th>
                <th className="p-4 text-left text-sm font-semibold">Email</th>
                <th className="p-4 text-left text-sm font-semibold">Role</th>
                <th className="p-4 text-left text-sm font-semibold">Status</th>
                <th className="p-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-4 text-sm">{user.name}</td>
                  <td className="p-4 text-sm">{user.email}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${user.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleBlock(user._id)}
                        className={`px-3 py-1 rounded-lg text-sm text-white ${user.blocked ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                      >
                        {user.blocked ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => handleToggleRole(user._id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                      >
                        {user.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalUsers > 100 && (
        <Pagination
          currentPage={page}
          totalPages={totalPagesUsers}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default UserManagement;
