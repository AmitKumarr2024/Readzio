import React, { useEffect, useState } from 'react';
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
import { Search, SortAsc, SortDesc } from 'lucide-react';

const ReportAcknowledgments = () => {
  const dispatch = useDispatch();
  const { reports, loading, error, notificationStatus, currentPageReports, totalPagesReports, totalReports } =
    useSelector(
      (state) => state.admin || {
        reports: [], loading: false, error: null, notificationStatus: null, currentPageReports: 1, totalPagesReports: 1, totalReports: 0
      }
    );
  const [notificationData, setNotificationData] = useState({ reportId: '', subject: '', message: '' });
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
    setNotificationData({ reportId: '', subject: '', message: '' });
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
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Report Acknowledgments ({totalReports})</h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === 'createdAt' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Date
          </button>
          <button
            onClick={() => handleSort('reason')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === 'reason' && sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            Reason
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>}
      {notificationStatus && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl">{notificationStatus}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-4">Loading...</p>
      ) : (
        <>
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Notification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Report</label>
                diagno<input
                  type="text"
                  value={notificationData.reportId}
                  onChange={(e) => setNotificationData({ ...notificationData, reportId: e.target.value })}
                  className="mt-1 p-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter report ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={notificationData.subject}
                  onChange={(e) => setNotificationData({ ...notificationData, subject: e.target.value })}
                  className="mt-1 p-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter subject"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  className="mt-1 p-2 border border-gray-200 rounded-lg w-full resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter message"
                  required
                />
              </div>
              <button
                onClick={handleSendNotification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Send Notification
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
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
                  <tr key={report._id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-4 text-sm">{report.post?.title || 'N/A'}</td>
                    <td className="p-4 text-sm">{report.reason}</td>
                    <td className="p-4 text-sm">{report.post?.author?.name || 'N/A'}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${report.isReviewed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {report.isReviewed ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${report.forwardedToAuthor ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {report.forwardedToAuthor ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${report.isAcknowledged ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {report.isAcknowledged ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        {!report.isReviewed && (
                          <button
                            onClick={() => handleReview(report._id, true)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                          >
                            Review & Forward
                          </button>
                        )}
                        {!report.isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledge(report._id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
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
          {totalReports > 100 && (
            <Pagination currentPage={page} totalPages={totalPagesReports} onPageChange={handlePageChange} />
          )}
        </>
      )}
    </div>
  );
};

export default ReportAcknowledgments;