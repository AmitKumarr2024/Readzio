import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectSocketState, addGuestVisit } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";
import Pagination from "../../../Utils/Pagination";

const isDev = process.env.NODE_ENV === "development";

const RecentGuestVisits = () => {
  const { guestVisits = [] } = useSelector(selectSocketState);
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "lastVisit",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Simulate guest for testing
  const simulateGuest = () => {
    const guestData = {
      guestId: "test-guest",
      ip: "127.0.0.1",
      location: "IN",
      visitCount: 1,
      lastVisit: new Date().toISOString(),
      userAgent: "ManualTest/1.0",
    };
    console.log("[RecentGuestVisits] Simulating guest visit:", guestData);
    dispatch(addGuestVisit(guestData));
  };

  // Filter and sort data
  const filteredAndSortedVisits = useMemo(() => {
    console.log(
      "[RecentGuestVisits] Filtering and sorting guestVisits:",
      guestVisits
    );
    let filtered = [...guestVisits];

    // Search
    if (searchQuery) {
      filtered = filtered.filter(
        (guest) =>
          guest.guestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.ip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.userAgent?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log("[RecentGuestVisits] After search filter:", filtered);
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";
      if (sortConfig.key === "lastVisit") {
        return sortConfig.direction === "asc"
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    console.log("[RecentGuestVisits] After sorting:", filtered);

    return filtered;
  }, [guestVisits, searchQuery, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedVisits.length / itemsPerPage);
  const paginatedVisits = filteredAndSortedVisits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  console.log(
    "[RecentGuestVisits] Paginated visits for rendering:",
    paginatedVisits
  );

  // Handle sort
  const handleSort = (key) => {
    console.log("[RecentGuestVisits] Sorting by:", key);
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  console.log(
    "[RecentGuestVisits] Rendering component with guestVisits:",
    guestVisits
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          👥 Recent Guest Visits
        </h2>
        <button
          onClick={simulateGuest}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Test Guest
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Guest ID, IP, Location, or User Agent..."
          value={searchQuery}
          onChange={(e) => {
            console.log(
              "[RecentGuestVisits] Search query changed:",
              e.target.value
            );
            setSearchQuery(e.target.value);
          }}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
        />
      </div>

      {filteredAndSortedVisits.length === 0 ? (
        <div className="text-gray-400 text-center py-6">
          No guest visits found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                <tr>
                  {[
                    "Guest ID",
                    "IP",
                    "Location",
                    "Visits",
                    "Last Visit",
                    "User Agent",
                  ].map((header, idx) => (
                    <th
                      key={header}
                      onClick={() =>
                        handleSort(
                          header === "Guest ID"
                            ? "guestId"
                            : header === "Last Visit"
                            ? "lastVisit"
                            : header.toLowerCase()
                        )
                      }
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {header}
                      {sortConfig.key ===
                        (header === "Guest ID"
                          ? "guestId"
                          : header === "Last Visit"
                          ? "lastVisit"
                          : header.toLowerCase()) && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-200">
                {paginatedVisits.map((guest) => (
                  <tr
                    key={guest.guestId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {guest.guestId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">{guest.ip || "—"}</td>
                    <td className="px-4 py-3">{guest.location || "—"}</td>
                    <td className="px-4 py-3">{guest.visitCount}</td>
                    <td className="px-4 py-3">
                      {guest.lastVisit
                        ? formatDistanceToNow(new Date(guest.lastVisit), {
                            addSuffix: true,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs truncate max-w-[200px]">
                      {guest.userAgent || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              console.log("[RecentGuestVisits] Changing page to:", page);
              setCurrentPage(page);
            }}
          />
        </>
      )}
    </div>
  );
};

export default RecentGuestVisits;
