import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllUsers } from '../../../store/adminSlice';
import { FaUser } from 'react-icons/fa';

export default function UserMessagePanel({ onUserSelect, selectedUserId, searchTerm, sortOrder }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { users = [], loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(getAllUsers({ page, limit: 10, mode: 'paged' }));
  }, [dispatch, page]);

  const filteredUsers = users
    .filter((u) => u._id !== user?._id)
    .filter((u) =>
      searchTerm
        ? (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  return (
    <div className="space-y-4 h-full overflow-y-auto pr-2">
      <h3 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
        <FaUser className="text-blue-600" />
        Users
      </h3>
      {loading ? (
        <p className="text-sm text-text-main-light dark:text-text-main-dark text-center animate-pulse">Loading users...</p>
      ) : (
        <ul className="space-y-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <li
                key={u._id}
                onClick={() => onUserSelect(u._id)}
                className={`p-3 border border-gray-200 rounded-lg text-text-main-light dark:text-text-main-dark cursor-pointer text-sm transition-all duration-200 ${
                  selectedUserId === u._id
                    ? 'bg-background-light dark:bg-background-dark  border-blue-500 font-medium shadow-sm'
                    : 'hover:bg-gray-400 hover:shadow'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaUser className="text-text-main-light dark:text-text-main-dark" />
                  <div>
                    {u.name || 'Unknown'} <br />
                    <span className="text-xs text-text-main-light dark:text-text-main-dark">{u.email}</span>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-text-main-light dark:text-text-main-dark text-center">No users found.</p>
          )}
        </ul>
      )}
    </div>
  );
}