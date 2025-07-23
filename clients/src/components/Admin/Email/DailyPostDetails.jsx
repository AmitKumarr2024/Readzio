import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaSearch, FaSort, FaEnvelope } from 'react-icons/fa';
import { getDailyPostEmailReport } from '../../../store/adminSlice';

export default function DailyPostDetails() {
  const dispatch = useDispatch();
  const { emailReports, totalEmailReports, currentPageEmailReports, totalPagesEmailReports, emailLoading, emailError } = useSelector((state) => state.admin);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDateOrder, setSortByDateOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const limit = 10;

  useEffect(() => {
    dispatch(getDailyPostEmailReport({ page, limit, date }));
  }, [dispatch, page, date]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setPage(1);
  };

  const filteredReports = emailReports
    .filter((report) => report.email.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.sentAt);
      const dateB = new Date(b.sentAt);
      return sortByDateOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center">
        <FaEnvelope className="mr-2 text-blue-600" />
        Daily Post Email Report
      </h2>

      {/* Search, Sort, and Date Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-64">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-main-light dark:text-text-main-dark" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={handleDateChange}
          className="w-full sm:w-48 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
        />
        <button
          onClick={() => setSortByDateOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300"
        >
          <FaSort />
          Sort by Date: {sortByDateOrder === "asc" ? "Oldest First" : "Newest First"}
        </button>
      </div>

      {/* Email Reports Table */}
      <div className="rounded-2xl shadow-lg border border-gray-100 p-5 h-[calc(100vh-250px)] sm:h-[500px] overflow-y-auto">
        {emailLoading ? (
          <div className="text-center">Loading...</div>
        ) : emailError ? (
          <div className="text-center text-red-500 rounded-lg p-3 bg-red-100 dark:bg-red-900">{emailError}</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center">No email reports found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-200 p-3">Email</th>
                  <th className="border border-gray-200 p-3">Status</th>
                  <th className="border border-gray-200 p-3">Attempts</th>
                  <th className="border border-gray-200 p-3">Sent At</th>
                  <th className="border border-gray-200 p-3">Posts Included</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report._id}
                    className={`border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      report.emailStatus === 'sent' ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'
                    }`}
                  >
                    <td className="border border-gray-200 p-3">{report.email}</td>
                    <td className="border border-gray-200 p-3">{report.emailStatus}</td>
                    <td className="border border-gray-200 p-3">{report.emailAttempts}</td>
                    <td className="border border-gray-200 p-3">{new Date(report.sentAt).toLocaleString()}</td>
                    <td className="border border-gray-200 p-3">{report.postSlugs?.length || 0} posts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-all duration-300"
        >
          Previous
        </button>
        <span>Page {currentPageEmailReports} of {totalPagesEmailReports}</span>
        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPagesEmailReports))}
          disabled={page === totalPagesEmailReports}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-all duration-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}