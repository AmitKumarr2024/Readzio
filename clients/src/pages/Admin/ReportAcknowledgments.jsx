import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReportedPosts,
  reviewReport,
  sendReportNotification,
  acknowledgeReport,
  clearError,
  clearNotificationStatus,
} from "../../store/adminSlice";
import Pagination from "../../Utils/Pagination";
import {
  Search,
  SortAsc,
  SortDesc,
  X,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";

// Optimized debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ReportMultiSelect = ({
  selectedReportIds,
  onChange,
  searchQuery,
  setSearchQuery,
}) => {
  const dispatch = useDispatch();
  const { reports, loading, totalReports } = useSelector(
    (state) => state.admin || { reports: [], loading: false, totalReports: 0 }
  );
  const [dropdownPage, setDropdownPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [localReports, setLocalReports] = useState([]);
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  // Memoized selected reports for display
  const selectedReports = useMemo(() => {
    return selectedReportIds.map((id) => {
      const report =
        localReports.find((r) => r._id === id) ||
        reports.find((r) => r._id === id);
      return report || { _id: id, post: { title: "Unknown" } };
    });
  }, [selectedReportIds, localReports, reports]);

  // Optimized fetch with debouncing
  const fetchDropdownReports = useCallback(
    (page, query) => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(() => {
        setIsLoadingDropdown(true);
        dispatch(
          fetchReportedPosts({ page, limit: 10, search: query })
        ).finally(() => setIsLoadingDropdown(false));
      }, 300);
    },
    [dispatch]
  );

  // Update local reports when reports change
  useEffect(() => {
    if (reports.length > 0 && isOpen) {
      setLocalReports(reports);
    }
  }, [reports, isOpen]);

  // Fetch on open or search change
  useEffect(() => {
    if (isOpen) {
      fetchDropdownReports(dropdownPage, searchQuery);
    }
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [dropdownPage, searchQuery, isOpen, fetchDropdownReports]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (reportId) => {
    if (!selectedReportIds.includes(reportId)) {
      onChange([...selectedReportIds, reportId]);
    }
    setIsOpen(false);
  };

  const handleRemove = (reportId) => {
    onChange(selectedReportIds.filter((id) => id !== reportId));
  };

  return (
    <div className="relative">
      {/* Selected Reports Pills */}
      {selectedReports.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          {selectedReports.map((report) => (
            <div
              key={report._id}
              className="group flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <span className="max-w-[200px] truncate">
                {report.post?.title || "Untitled"}
              </span>
              <button
                onClick={() => handleRemove(report._id)}
                className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-blue-600 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Remove report"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search and select reports..."
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
          aria-label="Search reports to select"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-80 overflow-hidden"
        >
          <div className="max-h-80 overflow-y-auto">
            {isLoadingDropdown ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading reports...
                </span>
              </div>
            ) : localReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-12 h-12 mb-2 text-gray-400" />
                <p className="font-medium">No reports found</p>
                <p className="text-sm">Try adjusting your search</p>
              </div>
            ) : (
              <>
                {localReports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => handleSelect(report._id)}
                    className={`p-3 cursor-pointer transition-all duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                      ${
                        selectedReportIds.includes(report._id)
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {report.post?.title || "Untitled"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          ID: {report._id}
                        </p>
                      </div>
                      {selectedReportIds.includes(report._id) && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </div>
                ))}
                {totalReports > 10 && (
                  <div className="p-3 border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                    <Pagination
                      currentPage={dropdownPage}
                      totalPages={Math.ceil(totalReports / 10)}
                      onPageChange={setDropdownPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ReportAcknowledgments = () => {
  const dispatch = useDispatch();
  const {
    reports,
    loading,
    error,
    notificationStatus,
    currentPageReports,
    totalPagesReports,
    totalReports,
  } = useSelector(
    (state) =>
      state.admin || {
        reports: [],
        loading: false,
        error: null,
        notificationStatus: null,
        currentPageReports: 1,
        totalPagesReports: 1,
        totalReports: 0,
      }
  );

  const [notificationData, setNotificationData] = useState({
    reportIds: [],
    subject: "",
    message: "",
  });
  const [page, setPage] = useState(currentPageReports);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        setPage(1);
        dispatch(
          fetchReportedPosts({
            page: 1,
            limit: 10,
            search: query,
            sortField,
            sortOrder,
          })
        );
      }, 500),
    [dispatch, sortField, sortOrder]
  );

  // Initial fetch only
  useEffect(() => {
    dispatch(
      fetchReportedPosts({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  }, [dispatch, page, sortField, sortOrder]);

  // Handle search changes
  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (error || notificationStatus) {
      const timer = setTimeout(() => {
        dispatch(clearError());
        dispatch(clearNotificationStatus());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, notificationStatus, dispatch]);

  const handleReview = async (reportId, forwardToAuthor) => {
    setLocalLoading(true);
    await dispatch(reviewReport({ reportId, forwardToAuthor }));
    setLocalLoading(false);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (
      notificationData.reportIds.length === 0 ||
      !notificationData.subject ||
      !notificationData.message
    ) {
      return;
    }
    setLocalLoading(true);
    await dispatch(sendReportNotification(notificationData));
    setNotificationData({ reportIds: [], subject: "", message: "" });
    setReportSearchQuery("");
    setLocalLoading(false);
  };

  const handleAcknowledge = async (reportId) => {
    setLocalLoading(true);
    await dispatch(acknowledgeReport({ reportId }));
    setLocalLoading(false);
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
  };

  // Client-side filtering for instant feedback
  const filteredReports = useMemo(() => {
    return reports.filter(
      (report) =>
        report.post?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.post?.author?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [reports, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            Report Acknowledgments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-semibold">
              {totalReports} Total Reports
            </span>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300 font-medium">
              {error}
            </p>
          </div>
        )}
        {notificationStatus && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 dark:text-green-300 font-medium">
              {notificationStatus}
            </p>
          </div>
        )}

        {/* Notification Form */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-6 h-6" />
              Send Notification
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Select Reports
              </label>
              <ReportMultiSelect
                selectedReportIds={notificationData.reportIds}
                onChange={(reportIds) =>
                  setNotificationData({ ...notificationData, reportIds })
                }
                searchQuery={reportSearchQuery}
                setSearchQuery={setReportSearchQuery}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={notificationData.subject}
                onChange={(e) =>
                  setNotificationData({
                    ...notificationData,
                    subject: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
                placeholder="Enter notification subject"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={notificationData.message}
                onChange={(e) =>
                  setNotificationData({
                    ...notificationData,
                    message: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
                placeholder="Enter notification message"
                required
              />
            </div>
            <button
              onClick={handleSendNotification}
              disabled={
                notificationData.reportIds.length === 0 ||
                localLoading ||
                !notificationData.subject ||
                !notificationData.message
              }
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {localLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
              aria-label="Search reports"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort("createdAt")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                sortField === "createdAt"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {sortField === "createdAt" && sortOrder === "asc" ? (
                <SortAsc className="w-5 h-5" />
              ) : (
                <SortDesc className="w-5 h-5" />
              )}
              Date
            </button>
            <button
              onClick={() => handleSort("reason")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                sortField === "reason"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {sortField === "reason" && sortOrder === "asc" ? (
                <SortAsc className="w-5 h-5" />
              ) : (
                <SortDesc className="w-5 h-5" />
              )}
              Reason
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading && filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Loading reports...
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                No reports found
              </p>
              <p className="text-gray-500 dark:text-gray-500 mt-2">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b-2 border-gray-200 dark:border-gray-600">
                      <th className="p-4 text-left text-sm font-bold text-gray-700 dark:text-gray-200">
                        Post Title
                      </th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700 dark:text-gray-200">
                        Reason
                      </th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700 dark:text-gray-200">
                        Author
                      </th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700 dark:text-gray-200">
                        Status
                      </th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700 dark:text-gray-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <tr
                        key={report._id}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-150 ${
                          index % 2 === 0
                            ? "bg-white dark:bg-gray-800"
                            : "bg-gray-50/50 dark:bg-gray-800/50"
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {report.post?.title || "N/A"}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            {report.reason}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-300">
                          {report.post?.author?.name || "N/A"}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 w-fit ${
                                report.isReviewed
                                  ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                  : "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300"
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {report.isReviewed ? "Reviewed" : "Pending"}
                            </span>
                            {report.forwardedToAuthor && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 inline-flex items-center gap-1 w-fit">
                                Forwarded
                              </span>
                            )}
                            {report.isAcknowledged && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1 w-fit">
                                Acknowledged
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {!report.isReviewed && (
                              <button
                                onClick={() => handleReview(report._id, true)}
                                disabled={localLoading}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                Review & Forward
                              </button>
                            )}
                            {!report.isAcknowledged && (
                              <button
                                onClick={() => handleAcknowledge(report._id)}
                                disabled={localLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalReports > 10 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPagesReports}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportAcknowledgments;
