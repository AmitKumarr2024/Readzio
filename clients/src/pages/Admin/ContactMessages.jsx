import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchContactMessages,
  toggleContactMessageHandled,
  clearError,
} from "../../store/adminSlice";
import ContactReplyModal from "./ContactReplyModal";
import Pagination from "../../Utils/Pagination";
import { Search, SortAsc, SortDesc } from "lucide-react";

const ContactMessages = () => {
  const dispatch = useDispatch();
  const {
    contactMessages,
    totalMessages,
    loading,
    error,
    currentPageMessages,
    totalPagesMessages,
  } = useSelector(
    (state) =>
      state.admin || {
        contactMessages: [],
        totalMessages: 0,
        loading: false,
        error: null,
        currentPageMessages: 1,
        totalPagesMessages: 1,
      }
  );
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [page, setPage] = useState(currentPageMessages);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    dispatch(
      fetchContactMessages({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    setPage(currentPageMessages);
  }, [currentPageMessages]);

  const handleToggleHandled = (id) => {
    dispatch(toggleContactMessageHandled(id));
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
  };

  const refreshMessages = () => {
    dispatch(
      fetchContactMessages({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  };
  const filteredMessages = contactMessages.filter(
    (msg) =>
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Contact Messages ({totalMessages})
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("createdAt")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === "createdAt" && sortOrder === "asc" ? (
              <SortAsc className="w-5 h-5" />
            ) : (
              <SortDesc className="w-5 h-5" />
            )}
            Date
          </button>
          <button
            onClick={() => handleSort("name")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === "name" && sortOrder === "asc" ? (
              <SortAsc className="w-5 h-5" />
            ) : (
              <SortDesc className="w-5 h-5" />
            )}
            Name
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearError())}
            className="text-red-900 font-semibold hover:text-red-700 transition"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 flex items-center justify-center gap-2 text-gray-500">
          <svg
            className="animate-spin w-5 h-5 text-blue-500"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M4 12a8 8 0 018-8"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <span>Loading...</span>
        </div>
      ) : filteredMessages.length === 0 ? (
        <p className="text-gray-600 text-center py-4">
          No contact messages found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            {/* your table content */}
          </table>
        </div>
      )}

      {!loading && filteredMessages.length === 0 && (
        <p className="text-gray-600 text-center py-4">
          No contact messages found.
        </p>
      )}
      {!loading && filteredMessages.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 text-left text-sm font-semibold">Name</th>
                <th className="p-4 text-left text-sm font-semibold">Email</th>
                <th className="p-4 text-left text-sm font-semibold">Subject</th>
                <th className="p-4 text-left text-sm font-semibold">Message</th>
                <th className="p-4 text-left text-sm font-semibold">Status</th>
                <th className="p-4 text-left text-sm font-semibold">
                  Received
                </th>
                <th className="p-4 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg) => (
                <tr
                  key={msg._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-4 text-sm">{msg.name}</td>
                  <td className="p-4 text-sm">{msg.email}</td>
                  <td className="p-4 text-sm">{msg.subject || "N/A"}</td>
                  <td className="p-4 text-sm truncate max-w-xs">
                    {msg.message}
                  </td>
                  <td className="p-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        msg.isHandled
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {msg.isHandled ? "Handled" : "Pending"}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    {new Date(msg.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button
                        className={`px-3 py-1 rounded-lg text-sm text-white ${
                          msg.isHandled
                            ? "bg-gray-500 hover:bg-gray-600"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                        onClick={() => handleToggleHandled(msg._id)}
                      >
                        {msg.isHandled ? "Mark Pending" : "Mark Handled"}
                      </button>
                      <button
                        className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        onClick={() => setSelectedMessage(msg)}
                      >
                        Reply
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalMessages > 100 && (
        <Pagination
          currentPage={page}
          totalPages={totalPagesMessages}
          onPageChange={handlePageChange}
        />
      )}
      {selectedMessage && (
        <ContactReplyModal
          message={selectedMessage}
          onClose={() => {
            setSelectedMessage(null);
            refreshMessages();
          }}
        />
      )}
    </div>
  );
};

export default ContactMessages;
