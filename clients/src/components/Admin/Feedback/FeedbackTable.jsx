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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">
          📋 User Feedback
        </h2>
        <p className="text-lg font-semibold">Total: {feedbackList.length}</p>
      </div>

      {selectedFeedback && (
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-xl"></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Feedback Details
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Name:
              </span>
              {selectedFeedback.name}
            </p>
            <p className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Email:
              </span>
              {selectedFeedback.email}
            </p>
            <p className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Rating:
              </span>
              <span className="text-yellow-500">
                {"★".repeat(selectedFeedback.rating)}
                {"☆".repeat(5 - selectedFeedback.rating)}
              </span>
            </p>
            <p className="flex items-start">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Message:
              </span>
              <span className="max-w-2xl">{selectedFeedback.message}</span>
            </p>
            <p className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Submitted:
              </span>
              {new Date(selectedFeedback.submittedAt).toLocaleString()}
            </p>
            <p className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">
                Prompt Status:
              </span>
              {selectedFeedback.shown
                ? selectedFeedback.responded
                  ? "Sent & Responded"
                  : "Sent & Pending"
                : "Not Sent"}
            </p>
          </div>
          <button
            onClick={() => setSelectedFeedback(null)}
            className="mt-6 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200"
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
          className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
        />
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="rating">Rating</option>
            <option value="submittedAt">Date</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {loading && (
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && filteredFeedback.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">No feedback yet.</p>
      )}
      {!loading && filteredFeedback.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <th className="p-4 text-left font-semibold">Name</th>
                <th className="p-4 text-left font-semibold">Email</th>
                <th className="p-4 text-left font-semibold">Rating</th>
                <th className="p-4 text-left font-semibold">Message</th>
                <th className="p-4 text-left font-semibold">Submitted At</th>
                <th className="p-4 text-left font-semibold">Prompt Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFeedback.map((feedback) => (
                <tr
                  key={feedback._id}
                  onClick={() => handleRowClick(feedback)}
                  className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <td className="p-4 font-medium">{feedback.name}</td>
                  <td className="p-4">{feedback.email}</td>
                  <td className="p-4 text-yellow-500">
                    {"★".repeat(feedback.rating)}
                    {"☆".repeat(5 - feedback.rating)}
                  </td>
                  <td className="p-4 truncate max-w-xs">{feedback.message}</td>
                  <td className="p-4">
                    {new Date(feedback.submittedAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    {feedback.shown
                      ? feedback.responded
                        ? "Sent & Responded"
                        : "Sent & Pending"
                      : "Not Sent"}
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
