import React, { useState } from "react";
import Pagination from "../../../Utils/Pagination";

const FeedbackTable = ({ feedbackList, loading, error }) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const itemsPerPage = 10;

  const handleRowClick = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const filteredFeedback = feedbackList
    .filter(
      (feedback) =>
        feedback.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortField === "submittedAt") {
        return sortOrder === "desc"
          ? new Date(bValue) - new Date(aValue)
          : new Date(aValue) - new Date(bValue);
      }
      return sortOrder === "desc"
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    });

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen text-text-main-light dark:text-text-main-dark">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">📋 User Feedback</h2>
        <p className="text-lg font-medium">
          Total Feedback Received: {feedbackList.length}
        </p>
      </div>

      {selectedFeedback && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Feedback Details</h3>
          <p>
            <strong>Name:</strong> {selectedFeedback.name}
          </p>
          <p>
            <strong>Email:</strong> {selectedFeedback.email}
          </p>
          <p>
            <strong>Rating:</strong> {selectedFeedback.rating} / 5
          </p>
          <p>
            <strong>Message:</strong> {selectedFeedback.message}
          </p>
          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(selectedFeedback.submittedAt).toLocaleString()}
          </p>
          <button
            onClick={() => setSelectedFeedback(null)}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
        />
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="rating">Rating</option>
            <option value="submittedAt">Date</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading feedbacks...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && filteredFeedback.length === 0 && <p>No feedback yet.</p>}
      {!loading && filteredFeedback.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <thead>
              <tr className="bg-blue-500 text-white">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFeedback.map((feedback) => (
                <tr
                  key={feedback._id}
                  onClick={() => handleRowClick(feedback)}
                  className="border-b cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-600"
                >
                  <td className="p-3">{feedback.name}</td>
                  <td className="p-3">{feedback.email}</td>
                  <td className="p-3">{feedback.rating}</td>
                  <td className="p-3 truncate max-w-xs">{feedback.message}</td>
                  <td className="p-3">
                    {new Date(feedback.submittedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredFeedback.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default FeedbackTable;
