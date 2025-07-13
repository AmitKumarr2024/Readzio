
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { replyContactMessage, clearNotificationStatus } from '../../store/adminSlice';
import LoadingBar from '../../Utils/LoadingBar';

const ContactReplyModal = ({ message, onClose }) => {
  const dispatch = useDispatch();
  const { loading, notificationStatus, error } = useSelector((state) => state.admin || {});
  const [subject, setSubject] = useState(`Re: ${message.subject || 'Your Inquiry'}`);
  const [replyMessage, setReplyMessage] = useState(
    `Thank you for your message: "${message.message}".\n\n[Add your response here].`
  );

  const [done, setDone] = useState(false);

  const handleSend = async () => {
    setDone(false);
    try {
      await dispatch(
        replyContactMessage({
          messageId: message._id,
          subject,
          message: replyMessage,
        })
      ).unwrap();
    } catch (err) {
      console.error('Failed to send reply:', err);
      setDone(true);
    }
  };

  useEffect(() => {
    if (notificationStatus) {
      const timeout = setTimeout(() => {
        dispatch(clearNotificationStatus());
        setDone(true);
        onClose();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [notificationStatus, dispatch, onClose]);

  return (
    <>
      <LoadingBar loading={loading && !done} text="Sending reply..." />
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="relative bg-background-light dark:bg-background-dark rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-700">
          <button
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
            onClick={() => {
              dispatch(clearNotificationStatus());
              onClose();
            }}
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark mb-4">Reply to Contact Message</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">To</label>
            <input
              type="text"
              value={message.email}
              disabled
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-text-main-light dark:text-text-main-dark"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-1">Message</label>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
              placeholder="Write your reply..."
            />
          </div>

          {error && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>}
          {notificationStatus && <p className="text-green-500 dark:text-green-400 text-sm mb-3">{notificationStatus}</p>}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                dispatch(clearNotificationStatus());
                onClose();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading && !done}
              className="px-4 py-2 bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition disabled:opacity-50"
            >
              {loading && !done ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactReplyModal;
