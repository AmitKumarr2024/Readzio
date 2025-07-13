import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaPaperPlane } from 'react-icons/fa';
import { setNotificationStatus, setEmailError } from '../../../store/adminSlice';

export default function ManualEmailSender() {
  const dispatch = useDispatch();
  const { emailLoading, emailError, notificationStatus } = useSelector((state) => state.admin);
  const [isSending, setIsSending] = useState(false);

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/dailyMail/daily-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send emails');
      dispatch(setNotificationStatus(`Daily post emails processed: ${data.results.length} users, ${data.postCount} posts`));
    } catch (error) {
      dispatch(setEmailError(error.message));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center">
        <FaPaperPlane className="mr-2 text-blue-600" />
        Manual Email Sender
      </h2>
      {notificationStatus && (
        <p className="text-green-500 mb-4 rounded-lg p-3 bg-green-100 dark:bg-green-900">
          {notificationStatus}
        </p>
      )}
      {emailError && (
        <p className="text-red-500 mb-4 rounded-lg p-3 bg-red-100 dark:bg-red-900">
          {emailError}
        </p>
      )}
      <div className="mb-6">
        <p className="mb-4">Trigger a manual send of the daily post email to all verified users.</p>
        <button
          onClick={handleSendEmails}
          disabled={isSending || emailLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
        >
          <FaPaperPlane className="inline-block mr-2" />
          {isSending ? 'Sending...' : 'Send Daily Post Emails'}
        </button>
      </div>
    </div>
  );
}