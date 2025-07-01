import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllUsers } from '../../../store/adminSlice';
import { sendAdminNotification, broadcastNotification } from '../../../store/notificationSlice';
import { FaPaperPlane } from 'react-icons/fa';
import Pagination from '../../../Utils/Pagination';

export default function SendNotification() {
  const dispatch = useDispatch();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [content, setContent] = useState('');
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
  const { loading: notificationLoading, error: notificationError } = useSelector(
    (state) => state.notifications || {}
  );

  const filteredUsers = useMemo(() => {
    return Array.isArray(users) ? users.filter((u) => u._id !== user?._id) : [];
  }, [users, user?._id]);

  useEffect(() => {
    if (user?._id) {
      dispatch(getAllUsers({ page, limit: 10, mode: 'paged' }));
    }
  }, [dispatch, page, user?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!content.trim()) {
      setError('Message content is required');
      return;
    }

    try {
      if (selectedUsers.length > 0) {
        await Promise.all(
          selectedUsers.map((userId) =>
            dispatch(sendAdminNotification({ userId, content })).unwrap()
          )
        );
        setSuccess('✅ Notifications sent to selected users!');
      } else {
        await dispatch(broadcastNotification({ content })).unwrap();
        setSuccess('✅ Broadcast sent to all users!');
      }
      setSelectedUsers([]);
      setContent('');
    } catch (err) {
      console.error('[SendNotification:handleSubmit]', err);
      setError(err.message || '❌ Failed to send notification');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
        <FaPaperPlane className="text-blue-600" />
        Send Notification
      </h2>

      {(userLoading || notificationLoading) && (
        <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
      )}
      {(error || notificationError || userError) && (
        <p className="text-sm text-red-500">{error || notificationError || userError}</p>
      )}
      {success && <p className="text-sm text-green-500">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Select Users (optional)</label>
          <select
            multiple
            value={selectedUsers}
            onChange={(e) =>
              setSelectedUsers(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            disabled={userLoading || notificationLoading}
          >
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <option key={u._id} value={u._id} className="py-1">
                  {u.name || 'Unknown'} ({u.email || 'N/A'})
                </option>
              ))
            ) : (
              <option disabled>No users found</option>
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">Leave empty to send to all users.</p>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPagesUsers}
          onPageChange={(newPage) => {
            setPage(newPage);
            setSelectedUsers([]);
          }}
        />

        <div>
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            placeholder="Enter notification message"
            rows="4"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2"
          disabled={userLoading || notificationLoading}
        >
          <FaPaperPlane />
          Send {selectedUsers.length > 0 ? 'to Selected Users' : 'to All Users'}
        </button>
      </form>
    </div>
  );
}