import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUserNotificationHistory } from '../../../store/notificationSlice';
import { FaHistory } from 'react-icons/fa';

export default function MessageHistory({ userId }) {
  const dispatch = useDispatch();
  const { userNotificationHistory = [], loading } = useSelector((state) => state.notifications || {});

  useEffect(() => {
    if (userId) {
      dispatch(getUserNotificationHistory(userId));
    }
  }, [dispatch, userId]);

  if (!userId) return (
    <p className="bg-background-light dark:bg-background-dark italic text-center mt-4">Select a user to view messages.</p>
  );

  return (
    <div className="space-y-4 h-full overflow-y-auto pr-2">
      <h3 className="text-lg font-semibold bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark flex items-center gap-2">
        <FaHistory className="text-blue-600" />
        Message History
      </h3>
      {loading ? (
        <p className="text-sm bg-background-light dark:bg-background-dark text-center animate-pulse">Loading messages...</p>
      ) : userNotificationHistory.length > 0 ? (
        <ul className="space-y-3">
          {userNotificationHistory.map((msg) => (
            <li
              key={msg._id}
              className="border border-gray-200 rounded-lg p-4 bg-background-light dark:bg-background-dark  shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="text-sm  text-text-main-light dark:text-text-main-dark mb-1">{msg.content}</div>
              <div className="text-xs text-text-main-light dark:text-text-main-dark">
                {new Date(msg.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-main-light dark:text-text-main-dark text-center">No messages found for this user.</p>
      )}
    </div>
  );
}