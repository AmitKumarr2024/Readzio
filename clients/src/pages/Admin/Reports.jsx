import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchReportedPosts, reviewReport, clearError } from '../../store/adminSlice';
import ReviewNotificationModal from './ReviewNotificationModal';
import Pagination from '../../Utils/Pagination';
import { Search, SortAsc, SortDesc } from 'lucide-react';

const Reports = () => {
  const dispatch = useDispatch();
  const { reports, loading, error, currentPageReports, totalPagesReports, totalReports } = useSelector(
    (state) => state.admin || {
      reports: [], loading: false, error: null, currentPageReports: 1, totalPagesReports: 1, totalReports: 0
    }
  );
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [page, setPage] = useState(currentPageReports);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    dispatch(fetchReportedPosts({ page, limit: 10, search: searchQuery, sortField, sortOrder }));
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    setPage(currentPageReports);
  }, [currentPageReports]);

  const handleReview = (reportId, forwardToAuthor) => {
    const report = reports.find((r) => r._id === reportId);
    setSelectedReport(report);
    setReviewAction({ reportId, forwardToAuthor });
  };

  const handleReviewAndClose = () => {
    if (reviewAction) {
      dispatch(reviewReport({
        reportId: reviewAction.reportId,
        forwardToAuthor: reviewAction.forwardToAuthor,
      }));
    }
    setSelectedReport(null);
    setReviewAction(null);
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
    report.reporter?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-text-main-light dark:text-text-main-dark mb-6">Reported Posts ({totalReports})</h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition"
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} className="text-red-900 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
            Clear
          </button>
        </div>
      )}

      {loading && <p className="text-text-main-light dark:text-text-main-dark text-center py-4">Loading...</p>}
      {!loading && filteredReports.length === 0 && <p className="text-text-main-light dark:text-text-main-dark text-center py-4">No reports found.</p>}
      {!loading && filteredReports.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-background-light dark:bg-background-dark rounded-lg shadow border border-gray-100 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-text-main-light dark:text-text-main-dark">
                <th className="p-4 text-left text-sm font-semibold">Post Title</th>
                <th className="p-4 text-left text-sm font-semibold">Reporter</th>
                <th className="p-4 text-left text-sm font-semibold">Reason</th>
                <th className="p-4 text-left text-sm font-semibold">Details</th>
                <th className="p-4 text-left text-sm font-semibold">Status</th>
                <th className="p-4 text-left text-sm font-semibold">Forwarded</th>
                <th className="p-4 text-left text-sm font-semibold">Reported</th>
                <th className="p-4 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.post?.title || 'N/A'}</td>
                  <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.reporter?.name || 'N/A'} ({report.reporter?.email || 'N/A'})</td>
                  <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{report.reason}</td>
                  <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark truncate max-w-xs">{report.details || 'N/A'}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${report.isReviewed ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'}`}>
                      {report.isReviewed ? 'Reviewed' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${report.forwardedToAuthor ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200'}`}>
                      {report.forwardedToAuthor ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-main-light dark:text-text-main-dark">{new Date(report.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    {!report.isReviewed && (
                      <div className="flex space-x-2">
                        <button
                          className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-blue-600 dark:hover:bg-blue-500 transition"
                          onClick={() => handleReview(report._id, true)}
                        >
                          Review & Forward
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-500 dark:bg-gray-600 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-gray-600 dark:hover:bg-gray-500 transition"
                          onClick={() => handleReview(report._id, false)}
                        >
                          Review Only
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalReports > 10 && (
        <Pagination currentPage={page} totalPages={totalPagesReports} onPageChange={handlePageChange} />
      )}
      {selectedReport && (
        <ReviewNotificationModal
          report={selectedReport}
          onClose={() => {
            setSelectedReport(null);
            setReviewAction(null);
          }}
          onReview={handleReviewAndClose}
        />
      )}
    </div>
  );
};

export default Reports;