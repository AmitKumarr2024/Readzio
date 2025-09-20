import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaSort,
  FaEnvelope,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaFilter,
  FaDownload,
} from "react-icons/fa";
import { getDailyPostEmailReport } from "../../../store/adminSlice";

export function EnhancedDailyPostDetails() {
  const dispatch = useDispatch();
  const {
    emailReports,
    totalEmailReports,
    currentPageEmailReports,
    totalPagesEmailReports,
    emailLoading,
    emailError,
    emailReportStats,
    emailDailyStats,
  } = useSelector((state) => state.admin);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortByDateOrder, setSortByDateOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 10;

  useEffect(() => {
    dispatch(
      getDailyPostEmailReport({
        page,
        limit,
        date: date || undefined,
        status: statusFilter || undefined,
        includeStats: true,
      })
    );
  }, [dispatch, page, date, statusFilter]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(statusFilter === status ? "" : status);
    setPage(1);
  };

  const filteredReports = emailReports
    .filter(
      (report) =>
        report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortByDateOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <FaCheckCircle className="text-green-500" />;
      case "failed":
        return <FaTimesCircle className="text-red-500" />;
      case "pending":
        return <FaInfoCircle className="text-yellow-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
        return "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800";
      case "failed":
        return "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      case "pending":
        return "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800";
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-800 dark:to-gray-900 text-text-main-light dark:text-text-main-dark p-6 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center">
          <FaEnvelope className="mr-3 text-purple-600" />
          Daily Email Analytics
        </h2>
      </div>

      {/* Stats Cards */}
      {emailReportStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Sent
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {emailReportStats.sent || 0}
                </p>
              </div>
              <FaCheckCircle className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Failed
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {emailReportStats.failed || 0}
                </p>
              </div>
              <FaTimesCircle className="text-3xl text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {emailReportStats.successRate || "0%"}
                </p>
              </div>
              <FaInfoCircle className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {emailReportStats.total || 0}
                </p>
              </div>
              <FaEnvelope className="text-3xl text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails or names..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white dark:bg-gray-700"
            />
          </div>

          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            className="px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white dark:bg-gray-700"
          />

          <button
            onClick={() =>
              setSortByDateOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <FaSort />
            {sortByDateOrder === "asc" ? "Oldest First" : "Newest First"}
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter("sent")}
            className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
              statusFilter === "sent"
                ? "bg-green-600 text-white border-green-600"
                : "border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900"
            }`}
          >
            <FaCheckCircle className="inline mr-1" />
            Sent
          </button>

          <button
            onClick={() => handleStatusFilter("failed")}
            className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
              statusFilter === "failed"
                ? "bg-red-600 text-white border-red-600"
                : "border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
            }`}
          >
            <FaTimesCircle className="inline mr-1" />
            Failed
          </button>

          <button
            onClick={() => handleStatusFilter("pending")}
            className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
              statusFilter === "pending"
                ? "bg-yellow-600 text-white border-yellow-600"
                : "border-yellow-300 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900"
            }`}
          >
            <FaInfoCircle className="inline mr-1" />
            Pending
          </button>

          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Email Reports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {emailLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            Loading email reports...
          </div>
        ) : emailError ? (
          <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/30">
            <FaTimesCircle className="mx-auto mb-2 text-2xl" />
            {emailError}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FaInfoCircle className="mx-auto mb-2 text-2xl" />
            No email reports found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Attempts
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report) => (
                  <tr
                    key={report._id}
                    className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${getStatusColor(
                      report.emailStatus
                    )}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {report.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {report.user?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(report.emailStatus)}
                        <span className="ml-2 text-sm font-medium capitalize">
                          {report.emailStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {report.emailAttempts || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
                      {report.emailLastError || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || emailLoading}
          className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl disabled:opacity-50 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Page {currentPageEmailReports} of {totalPagesEmailReports}
          </span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
            {totalEmailReports} total
          </span>
        </div>

        <button
          onClick={() =>
            setPage((prev) => Math.min(prev + 1, totalPagesEmailReports))
          }
          disabled={page === totalPagesEmailReports || emailLoading}
          className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl disabled:opacity-50 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
