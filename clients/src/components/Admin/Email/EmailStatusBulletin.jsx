import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaSearch, FaHistory, FaSync } from "react-icons/fa";
import { checkAuth } from "../../../store/authSlice";
import {
  checkEmailStatus,
  getAllEmailStatuses,
  retryFailedEmails,
} from "../../../store/adminSlice";

export default function EmailStatusBulletin() {
  const dispatch = useDispatch();
  const {
    role,
    isAuthenticated,
    loading: authLoading,
    error: authError,
  } = useSelector((state) => state.auth);
  const {
    emailStatuses,
    totalEmails,
    currentPageEmails,
    totalPagesEmails,
    currentEmailStatus,
    emailLoading,
    emailError,
    notificationStatus,
  } = useSelector((state) => state.admin);
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // console.log("emailStatuses",emailStatuses);
  
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(checkAuth());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (role === "admin") {
      dispatch(getAllEmailStatuses({ page, limit, type: type || undefined }));
    }
  }, [dispatch, role, page, type]);

  const sanitize = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const handleFetchStatus = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email");
      return;
    }
    if (!type) {
      alert("Please select an email type");
      return;
    }
    await dispatch(checkEmailStatus({ email: email.toLowerCase(), type }));
  };

  const handleRetryFailedEmails = async () => {
    await dispatch(retryFailedEmails({ type: type || undefined }));
  };

  const successfulEmails = emailStatuses.filter(
    (status) => status.emailStatus === "sent"
  ).length;

  if (authLoading)
    return (
      <div className="text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
        Checking authentication...
      </div>
    );
  if (authError)
    return (
      <div className=" text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
        Error: {authError}
      </div>
    );
  if (!isAuthenticated || role !== "admin")
    return (
      <div className=" text-center mt-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
        Access denied: Admin only
      </div>
    );

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center">
        <FaHistory className="mr-2 text-blue-600" />
        Email Status Bulletin
      </h2>
      {notificationStatus && (
        <p className="text-green-500 mb-4 rounded-lg p-3 bg-green-100 dark:bg-green-900">
          {sanitize(notificationStatus)}
        </p>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-64">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-main-light dark:text-text-main-dark" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="Enter email to check status"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full sm:w-48 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
        >
          <option value="">Select email type</option>
          <option value="signup">Signup</option>
          <option value="payout">Payout</option>
          <option value="subscription">Subscription</option>
          <option value="contact_reply">Contact Reply</option>
          <option value="report">Report</option>
        </select>
        <button
          onClick={handleFetchStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
          disabled={emailLoading || authLoading}
        >
          Check Status
        </button>
        <button
          onClick={handleRetryFailedEmails}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-300 disabled:opacity-50"
          disabled={emailLoading || authLoading}
        >
          <FaSync className="inline-block mr-2" />
          Retry Failed
        </button>
      </div>

      {/* Single Email Status */}
      {currentEmailStatus && (
        <div className="mb-6 p-4 rounded-lg border border-gray-100 bg-background-light dark:bg-background-dark shadow-md">
          <h3 className="text-lg font-semibold mb-2">
            Status for {sanitize(currentEmailStatus.email)} (
            {sanitize(currentEmailStatus.type)})
          </h3>
          <p>
            <strong>Status:</strong> {sanitize(currentEmailStatus.emailStatus)}
          </p>
          <p>
            <strong>Attempts:</strong> {currentEmailStatus.emailAttempts}
          </p>
          {currentEmailStatus.emailLastError && (
            <p>
              <strong>Error:</strong>{" "}
              {sanitize(currentEmailStatus.emailLastError)}
            </p>
          )}
          <p>
            <strong>Stopped:</strong>{" "}
            {currentEmailStatus.stopEmailAttempts ? "Yes" : "No"}
          </p>
        </div>
      )}
      {emailError && (
        <p className="text-red-500 mb-4 rounded-lg p-3 bg-red-100 dark:bg-red-900">
          {emailError === "Email log not found" ||
          emailError === "No email log found for this email and type"
            ? "No email log found for this email and type"
            : sanitize(emailError)}
        </p>
      )}

      {/* All Email Statuses */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <FaHistory className="mr-2 text-blue-600" />
          All Email Statuses
        </h3>
        <p className="mb-2">
          Successful Emails: {successfulEmails} / {totalEmails}
        </p>
        {emailLoading ? (
          <div className="text-center">Loading...</div>
        ) : emailStatuses.length === 0 ? (
          <div className="text-center">No email statuses found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-200 p-3">Email</th>
                  <th className="border border-gray-200 p-3">Type</th>
                  <th className="border border-gray-200 p-3">Status</th>
                  <th className="border border-gray-200 p-3">Attempts</th>
                  <th className="border border-gray-200 p-3">Error</th>
                  <th className="border border-gray-200 p-3">Stopped</th>
                  <th className="border border-gray-200 p-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {emailStatuses.map((status, index) => (
                  <tr
                    key={index}
                    className={`border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      status.emailStatus === "sent"
                        ? "bg-green-50 dark:bg-green-900"
                        : "bg-red-50 dark:bg-red-900"
                    }`}
                  >
                    <td className="border border-gray-200 p-3">
                      {sanitize(status.email)}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {sanitize(status.type)}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {sanitize(status.emailStatus)}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {status.emailAttempts}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {sanitize(status.emailLastError || "N/A")}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {status.stopEmailAttempts ? "Yes" : "No"}
                    </td>
                    <td className="border border-gray-200 p-3">
                      {status.createdAt
                        ? new Date(status?.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1 || emailLoading || authLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-all duration-300"
          >
            Previous
          </button>
          <span>
            Page {currentPageEmails} of {totalPagesEmails}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPagesEmails))}
            disabled={page === totalPagesEmails || emailLoading || authLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-all duration-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
