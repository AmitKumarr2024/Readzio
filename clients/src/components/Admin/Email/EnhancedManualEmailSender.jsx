import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaPaperPlane,
  FaUsers,
  FaEnvelope,
  FaChartLine,
  FaExclamationTriangle,
  FaCog,
  FaPlay,
  FaShieldAlt,
} from "react-icons/fa";
import {
  sendEnhancedDailyPostEmail,
  getEmailSystemHealth,
  getBounceStatistics,
  clearNotificationStatus,
} from "../../../store/adminSlice";

export function EnhancedManualEmailSender() {
  const dispatch = useDispatch();
  const {
    emailLoading,
    emailError,
    notificationStatus,
    dailyEmailStatus,
    emailSystemHealth,
    bounceStatistics,
  } = useSelector((state) => state.admin);

  const [options, setOptions] = useState({
    forceRun: false,
    testMode: false,
    maxUsers: null,
    skipEligibilityCheck: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    dispatch(getEmailSystemHealth());
    dispatch(getBounceStatistics({ days: 7 }));
  }, [dispatch]);

  const handleSendEmails = async () => {
    dispatch(sendEnhancedDailyPostEmail(options));
  };

  const clearStatus = () => {
    dispatch(clearNotificationStatus());
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 text-text-main-light dark:text-text-main-dark p-6 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
          <FaPaperPlane className="mr-3 text-blue-600" />
          Enhanced Email Sender
        </h2>
        <div className="flex items-center space-x-2">
          {emailSystemHealth && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                emailSystemHealth.health === "good"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              <FaShieldAlt className="inline mr-1" />
              System {emailSystemHealth.health}
            </div>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {emailSystemHealth && (
          <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Today's Emails
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {emailSystemHealth.stats?.emailsSentToday || 0}
                  </p>
                </div>
                <FaEnvelope className="text-3xl text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Eligible Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {emailSystemHealth.stats?.eligibleUsers || 0}
                  </p>
                </div>
                <FaUsers className="text-3xl text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Suppressed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {bounceStatistics?.stats?.suppressedEmails || 0}
                  </p>
                </div>
                <FaExclamationTriangle className="text-3xl text-red-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      {notificationStatus && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-green-800 dark:text-green-200 font-medium">
              {notificationStatus}
            </p>
            <button
              onClick={clearStatus}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {emailError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-800 dark:text-red-200 font-medium">
            {emailError}
          </p>
        </div>
      )}

      {/* Previous Run Results */}
      {dailyEmailStatus && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaChartLine className="mr-2 text-blue-500" />
            Last Run Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dailyEmailStatus.results?.successful || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Successful
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {dailyEmailStatus.results?.failed || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Failed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dailyEmailStatus.postCount || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Posts Sent
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dailyEmailStatus.results?.successRate || "0%"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Success Rate
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Options */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Email Options</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <FaCog className="mr-1" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.forceRun}
                onChange={(e) =>
                  setOptions({ ...options, forceRun: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">
                Force Run (ignore daily limit)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.testMode}
                onChange={(e) =>
                  setOptions({ ...options, testMode: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Test Mode</span>
            </label>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Users (optional)
                  </label>
                  <input
                    type="number"
                    value={options.maxUsers || ""}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        maxUsers: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                    placeholder="Leave empty for all users"
                    min="1"
                    max="10000"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.skipEligibilityCheck}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          skipEligibilityCheck: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-red-600">
                      Skip Eligibility Check (Dangerous)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Button */}
      <div className="text-center">
        <button
          onClick={handleSendEmails}
          disabled={emailLoading}
          className={`px-8 py-4 rounded-xl font-semibold text-white shadow-lg transform transition-all duration-200 ${
            emailLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-xl active:scale-95"
          }`}
        >
          {emailLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center">
              <FaPlay className="mr-2" />
              Send Enhanced Daily Emails
            </div>
          )}
        </button>

        {options.testMode && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            Test mode enabled - emails will be simulated
          </p>
        )}
      </div>
    </div>
  );
}
