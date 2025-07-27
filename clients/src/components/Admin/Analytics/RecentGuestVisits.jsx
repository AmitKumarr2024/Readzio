import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectSocketState, addGuestVisit } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";
import Pagination from "../../../Utils/Pagination"; // Ensure correct path

const RecentGuestVisits = () => {
  const { guestVisits = [] } = useSelector(selectSocketState);
  const dispatch = useDispatch();

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("lastVisit"); // or "visitCount"
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const simulateGuest = () => {
    dispatch(
      addGuestVisit({
        guestId: "debug-guest",
        ip: "127.0.0.1",
        location: "IN",
        visitCount: 1,
        lastVisit: new Date().toISOString(),
        userAgent: "ManualTest/1.0",
      })
    );
  };

  // Search + Sort + Pagination logic
  const filteredGuests = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return guestVisits
      .filter((guest) =>
        [guest.ip, guest.location, guest.userAgent]
          .join(" ")
          .toLowerCase()
          .includes(lowerSearch)
      )
      .sort((a, b) => {
        const valA = sortKey === "visitCount" ? a.visitCount : new Date(a.lastVisit);
        const valB = sortKey === "visitCount" ? b.visitCount : new Date(b.lastVisit);
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
  }, [guestVisits, searchTerm, sortKey, sortOrder]);

  const totalPages = Math.ceil(filteredGuests.length / pageSize);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          👥 Recent Guest Visits
        </h2>
        <button
          onClick={simulateGuest}
          className="text-xs px-2 py-1 border rounded text-blue-600 border-blue-500 hover:bg-blue-50"
        >
          + Test Guest
        </button>
      </div>

      {/* 👤 Selected Guest Box */}
      {selectedGuest && (
        <div className="mb-4 p-4 border rounded bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-sm font-semibold mb-1">Selected Guest Details:</h3>
          <div className="text-xs">
            <p><strong>ID:</strong> {selectedGuest.guestId}</p>
            <p><strong>IP:</strong> {selectedGuest.ip}</p>
            <p><strong>Location:</strong> {selectedGuest.location}</p>
            <p><strong>Visits:</strong> {selectedGuest.visitCount}</p>
            <p><strong>Last Visit:</strong> {formatDistanceToNow(new Date(selectedGuest.lastVisit), { addSuffix: true })}</p>
            <p><strong>User Agent:</strong> {selectedGuest.userAgent}</p>
          </div>
        </div>
      )}

      {/* 🔍 Search + Sort Options */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
        <input
          type="text"
          placeholder="Search IP, Location, Agent..."
          className="w-full sm:w-auto flex-1 border px-3 py-1 rounded"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset page on search
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">Sort By:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="lastVisit">Last Visit</option>
            <option value="visitCount">Visit Count</option>
          </select>
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="text-xs text-blue-600 underline"
          >
            {sortOrder === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </div>
      </div>

      {/* 🧾 Table */}
      {paginatedGuests.length === 0 ? (
        <div className="text-gray-400 text-center py-4">
          No guest visits match your search.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-scroll custom-scrollbar">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2 text-left">Guest ID</th>
                <th className="px-4 py-2 text-left">IP</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Visits</th>
                <th className="px-4 py-2 text-left">Last Visit</th>
                <th className="px-4 py-2 text-left">User Agent</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-200">
              {paginatedGuests.map((guest) => (
                <tr
                  key={guest.guestId}
                  className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedGuest(guest)}
                >
                  <td className="px-4 py-2 font-mono text-xs">
                    {guest.guestId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2">{guest.ip || "—"}</td>
                  <td className="px-4 py-2">{guest.location || "—"}</td>
                  <td className="px-4 py-2">{guest.visitCount}</td>
                  <td className="px-4 py-2">
                    {guest.lastVisit
                      ? formatDistanceToNow(new Date(guest.lastVisit), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs truncate max-w-[180px]">
                    {guest.userAgent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔄 Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
};

export default RecentGuestVisits;
