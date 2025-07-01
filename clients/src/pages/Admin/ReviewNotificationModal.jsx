import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { sendReportNotification, clearNotificationStatus } from '../../store/adminSlice';

const ReviewNotificationModal = ({ report, onClose, onReview }) => {
  const dispatch = useDispatch();
  const { loading, notificationStatus, error } = useSelector((state) => state.admin || {});
  const [subject, setSubject] = useState(`Report Review: ${report.post?.title || 'Untitled Post'}`);
  const [message, setMessage] = useState(
    `Dear ${report.post?.author?.name || 'Author'},\n\nYour post titled "${report.post?.title || 'Untitled'}" was reported for "${report.reason}" with the following details: "${report.details || 'N/A'}".\n\nAfter review, we have taken the following action: [Add action details here].\n\nPlease address this issue or contact us for further clarification.\n\nBest regards,\nAdmin Team`
  );

  const handleSend = async () => {
    try {
      await dispatch(sendReportNotification({ reportId: report._id, subject, message })).unwrap();
      await dispatch(onReview()).unwrap();
      setTimeout(() => {
        dispatch(clearNotificationStatus());
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition"
          onClick={() => {
            dispatch(clearNotificationStatus());
            onClose();
          }}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Review Notification</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="text"
            value={report.post?.author?.email || 'N/A'}
            disabled
            className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Write your message..."
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {notificationStatus && <p className="text-green-500 text-sm mb-3">{notificationStatus}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              dispatch(clearNotificationStatus());
              onClose();
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewNotificationModal;