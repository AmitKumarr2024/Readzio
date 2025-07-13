import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaEnvelope, FaHistory, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { checkAuth } from '../../../store/authSlice';
import EmailStatusBulletin from './EmailStatusBulletin';
import DailyPostDetails from './DailyPostDetails';
import NotificationManager from './NotificationManager';
import ManualEmailSender from './ManualEmailSender';

export default function AdminEmailDashboard() {
  const dispatch = useDispatch();
  const { role, isAuthenticated, loading: authLoading, error: authError } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('bulletin');

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(checkAuth());
    }
  }, [dispatch, isAuthenticated]);

  if (authLoading) return <div className="text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">Checking authentication...</div>;
  if (authError) return <div className=" text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">Error: {authError}</div>;
  if (!isAuthenticated || role !== 'admin') return <div className=" text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">Access denied: Admin only</div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-text-main-light dark:text-text-main-dark tracking-tight">
          <FaEnvelope className="inline-block mr-2 text-blue-600" />
          Admin Email Dashboard
        </h1>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex justify-center gap-4 flex-wrap">
        <button
          onClick={() => setActiveTab('bulletin')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            activeTab === 'bulletin'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-blue-500 hover:text-white'
          }`}
        >
          <FaHistory className="inline-block mr-2" />
          Email Status Bulletin
        </button>
        <button
          onClick={() => setActiveTab('dailyPost')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            activeTab === 'dailyPost'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-blue-500 hover:text-white'
          }`}
        >
          <FaEnvelope className="inline-block mr-2" />
          Daily Post Report
        </button>
        <button
          onClick={() => setActiveTab('manualSend')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            activeTab === 'manualSend'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-blue-500 hover:text-white'
          }`}
        >
          <FaPaperPlane className="inline-block mr-2" />
          Manual Email Sender
        </button>
        <button
          onClick={() => setActiveTab('notificationManager')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            activeTab === 'notificationManager'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-blue-500 hover:text-white'
          }`}
        >
          <FaTrash className="inline-block mr-2" />
          Notification Manager
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-background-light dark:bg-background-dark rounded-2xl shadow-lg border border-gray-100 p-5">
        {activeTab === 'bulletin' ? (
          <EmailStatusBulletin />
        ) : activeTab === 'dailyPost' ? (
          <DailyPostDetails />
        ) : activeTab === 'manualSend' ? (
          <ManualEmailSender />
        ) : (
          <NotificationManager />
        )}
      </div>
    </div>
  );
}