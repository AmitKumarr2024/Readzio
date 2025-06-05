import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserActivity } from "../../../store/userSlice";
import Pagination from "../../../Utils/Pagination";
import DateFilter from "../../../Utils/DateFilter"; // Adjust path as needed

const PAGE_SIZE = 30;

function AuthorActivityHistory({ userId }) {
  const dispatch = useDispatch();

  const activity = useSelector((state) => state.user.activity);
  const activityLoading = useSelector((state) => state.user.activityLoading);
  const activityError = useSelector((state) => state.user.activityError);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortFilter, setSortFilter] = useState("newest");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (userId) dispatch(fetchUserActivity(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, sortFilter]);

  const dataToUse = Array.isArray(activity) ? activity : [];

  let filteredActivity = dataToUse.filter((item) => {
    const action = typeof item.action === "string" ? item.action.toLowerCase() : "";
    const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
    const term = searchTerm.toLowerCase();

    const matchesSearch = action.includes(term) || message.includes(term);

    const matchesDate = dateFilter
      ? new Date(item.createdAt).toISOString().slice(0, 10) === dateFilter
      : true;

    return matchesSearch && matchesDate;
  });

  filteredActivity.sort((a, b) => {
    if (sortFilter === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const totalPages = Math.ceil(filteredActivity.length / PAGE_SIZE);

  const paginatedActivity = filteredActivity.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Activity History</h2>

      <div className="flex flex-col md:flex-row md:items-center md:space-x-6 mb-6">
        <input
          type="text"
          placeholder="Search by type or content"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />

        <div className="mt-4 md:mt-0 md:flex-1">
          <DateFilter
            sortValue={sortFilter}
            onSortChange={setSortFilter}
            dateValue={dateFilter}
            onDateChange={setDateFilter}
          />
        </div>
      </div>

      {activityLoading && (
        <p className="text-center text-blue-600 font-medium">Loading activities...</p>
      )}

      {activityError && (
        <p className="text-center text-red-600 font-semibold">{activityError}</p>
      )}

      {!activityLoading && !activityError && paginatedActivity.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 uppercase tracking-wide">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedActivity.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-semibold uppercase text-gray-800">
                      {item.action}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{item.message}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        !activityLoading && (
          <p className="text-center text-gray-500 italic py-20">
            No activity found. 📅
          </p>
        )
      )}
    </div>
  );
}

export default AuthorActivityHistory;
