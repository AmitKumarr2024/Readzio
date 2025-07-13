
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReportedPosts,
  reviewReport,
  sendReportNotification,
  acknowledgeReport,
  clearError,
  clearNotificationStatus,
} from '../../store/adminSlice';
import Pagination from '../../Utils/Pagination';
import { Search, SortAsc, SortDesc, X } from 'lucide-react';

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ReportMultiSelect = ({ selectedReportIds, onChange, searchQuery, setSearchQuery }) => {
  const dispatch = useDispatch();
  const { reports, loading, totalReports } = useSelector(
    (state) => state.admin || { reports: [], loading: false, totalReports: 0 }
  );
  const [dropdownPage, setDropdownPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [cachedReports, setCachedReports] = useState({});
  const dropdownRef = useRef(null);

  // Cache reports to avoid redundant fetches
  const getCachedReports = useCallback((page, query) => {
    const cacheKey = `${page}-${query}`;
    return cachedReports[cacheKey] || [];
  }, [cachedReports]);

  const updateCachedReports = useCallback((page, query, newReports) => {
    const cacheKey = `${page}-${query}`;
    setCachedReports((prev) => ({ ...prev, [cacheKey]: newReports }));
  }, []);

  // Debounced fetch for dropdown reports
  const fetchDropdownReports = useCallback(
    debounce((page, query) => {
      const cacheKey = `${page}-${query}`;
      if (!cachedReports[cacheKey]) {
        dispatch(fetchReportedPosts({ page, limit: 10, search: query }));
      }
    }, 300),
    [dispatch, cachedReports]
  );

  useEffect(() => {
    fetchDropdownReports(dropdownPage, searchQuery);
  }, [dropdownPage, searchQuery, fetchDropdownReports]);

  // Update cache when new reports are fetched
  useEffect(() => {
    if (reports.length > 0) {
      updateCachedReports(dropdownPage, searchQuery, reports);
    }
  }, [reports, dropdownPage, searchQuery, updateCachedReports]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (reportId) => {
    if (!selectedReportIds.includes(reportId)) {
      onChange([...selectedReportIds, reportId]);
    }
  };

  const handleRemove = (reportId) => {
    onChange(selectedReportIds.filter((id) => id !== reportId));
  };

  const handlePageChange = (newPage) => {
    setDropdownPage(newPage);
  };

  const displayedReports = getCachedReports(dropdownPage, searchQuery).length
    ? getCachedReports(dropdownPage, searchQuery)
    : reports;

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedReportIds.map((id) => {
          const report = displayedReports.find((r) => r._id === id) || { _id: id, post: { title: 'Unknown' } };
          return (
            <div
              key={report._id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-full text-sm"
            >
              <span>{report.post?.title || 'Untitled'}</span>
              <button
                onClick={() => handleRemove(report._id)}
                className="text-blue-900 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search reports to select..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
          aria-label="Search reports to select"
        />
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {loading && !displayedReports.length ? (
            <p className="p-4 text-text-main-light dark:text-text-main-dark">Loading...</p>
          ) : displayedReports.length === 0 ? (
            <p className="p-4 text-text-main-light dark:text-text-main-dark">No reports found.</p>
          ) : (
            <>
              {displayedReports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => handleSelect(report._id)}
                  className={`p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 text-text-main-light dark:text-text-main-dark ${
                    selectedReportIds.includes(report._id) ? 'bg-gray-100 dark:bg-gray-700/50' : ''
                  }`}
                  role="option"
                  aria-selected={selectedReportIds.includes(report._id)}
                >
                  {report.post?.title || 'Untitled'} (ID: {report._id})
                </div>
              ))}
              {totalReports > 10 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                  <Pagination
                    currentPage={dropdownPage}
                    totalPages={Math.ceil(totalReports / 10)}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ReportAcknowledgments = () => {
  const dispatch = useDispatch();
  const { reports, loading, error, notificationStatus, currentPageReports, totalPagesReports, totalReports } =
    useSelector(
      (state) => state.admin || {
        reports: [], loading: false, error: null, notificationStatus: null, currentPageReports: 1, totalPagesReports: 1, totalReports: 0
      }
    );
  const [notificationData, setNotificationData] = useState({ reportIds: [], subject: '', message: '' });
  const [page, setPage] = useState(currentPageReports);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchReportedPosts({ page, limit: 10, search: searchQuery, sortField, sortOrder }));
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    setPage(currentPageReports);
  }, [currentPageReports]);

  useEffect(() => {
    if (error || notificationStatus) {
      const timer = setTimeout(() => {
        dispatch(clearError());
        dispatch(clearNotificationStatus());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, notificationStatus, dispatch]);

  const handleReview = (reportId, forwardToAuthor) => {
    dispatch(reviewReport({ reportId, forwardToAuthor }));
  };

  const handleSendNotification = (e) => {
    e.preventDefault();
    dispatch(sendReportNotification(notificationData));
    setNotificationData({ reportIds: [], subject: '', message: '' });
    setReportSearchQuery('');
  };

  const handleAcknowledge = (reportId) => {
    dispatch(acknowledgeReport({ reportId }));
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const filteredReports = reports.filter(report =>
    report.post?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.post?.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-text-main-light dark:text-text-main-dark mb-6">Report Acknowledgments ({totalReports})</h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
            aria-label="Search reports"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {sortField === 'createdAt' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Date
          </button>
          <button
            onClick={() => handleSort('reason')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {sortField === 'reason' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Reason
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-xl">{error}</div>}
      {notificationStatus && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-xl">{notificationStatus}</div>
      )}

      {loading && !filteredReports.length ? (
        <p className="text-text-main-light dark:text-text-main-dark text-center py-4">Loading...</p>
      ) : (
        <>
          <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark mb-4">Send Notification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark">Select Reports</label>
                <ReportMultiSelect
                  selectedReportIds={notificationData.reportIds}
                  onChange={(reportIds) => setNotificationData({ ...notificationData, reportIds })}
                  searchQuery={reportSearchQuery}
                  setSearchQuery={setReportSearchQuery}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark">Subject</label>
                <input
                  type="text"
                  value={notificationData.subject}
                  onChange={(e) => setNotificationData({ ...notificationData, subject: e.target.value })}
                  className="mt-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
                  placeholder="Enter subject"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark">Message</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  className="mt-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
                  placeholder="Enter message"
                  required
                />
              </div>
              <button
                onClick={handleSendNotification}
                disabled={notificationData.reportIds.length === 0 || loading}
                className="px-4 py-2 bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-background-light dark:bg-background-dark rounded-lg shadow border border-gray-100 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-text-main-light dark:text-text-main-dark">
                  <th className="p-4 text-left text-sm font-semibold">Post Title</th>
                  <th className="p-4 text-left text-sm font-semibold">Reason</th>
                  <th className="p-4 text-left text-sm font-semibold">Author</th>
                  <th className="p-4 text-left text-sm font-semibold">Reviewed</th>
                  <th className="p-4 text-left text-sm font-semibold">Forwarded</th>
                  <th className="p-4 text-left text-sm font-semibold">Acknowledged</th>
                  <th className="p-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.post?.title || 'N/A'}</td>
                    <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.reason}</td>
                    <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.post?.author?.name || 'N/A'}</td>
                    <td className="p-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          report.isReviewed
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'
                        }`}
                      >
                        {report.isReviewed ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          report.forwardedToAuthor
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'
                        }`}
                      >
                        {report.forwardedToAuthor ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          report.isAcknowledged
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'
                        }`}
                      >
                        {report.isAcknowledged ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        {!report.isReviewed && (
                          <button
                            onClick={() => handleReview(report._id, true)}
                            className="px-3 py-1 bg-green-500 dark:bg-green-600 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-green-600 dark:hover:bg-green-500 transition"
                          >
                            Review & Forward
                          </button>
                        )}
                        {!report.isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledge(report._id)}
                            className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-blue-600 dark:hover:bg-blue-500 transition"
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
            <Pagination currentPage={page} totalPages={totalPagesReports} onPageChange={handlePageChange} />
          )}
        </>
      )}
    </div>
  );
};

export default ReportAcknowledgments;
