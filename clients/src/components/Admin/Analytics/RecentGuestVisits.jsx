import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectSocketState, addGuestVisit } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";

// Virtual scrolling hook for better performance with large datasets
const useVirtualScrolling = (items, containerHeight = 400, itemHeight = 60) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + 2,
      items.length
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    containerRef,
    visibleRange,
    handleScroll,
    totalHeight: items.length * itemHeight,
  };
};

const RecentGuestVisits = () => {
  const { guestVisits = [] } = useSelector(selectSocketState);
  const dispatch = useDispatch();
  const currentGuestId =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("guestId")
      : null;

  // State management
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "lastVisit",
    direction: "desc",
  });
  const [viewMode, setViewMode] = useState("table"); // table or cards
  const [isLoading, setIsLoading] = useState(false);

  // Simulate adding multiple guests for testing infinite data
  const simulateMultipleGuests = useCallback(() => {
    setIsLoading(true);
    const locations = ["US", "IN", "GB", "CA", "AU", "DE", "FR", "JP"];
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    ];

    // Add 50 mock guests
    for (let i = 0; i < 50; i++) {
      const randomDate = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      );
      dispatch(
        addGuestVisit({
          guestId: `guest-${Date.now()}-${i}`,
          ip: `${Math.floor(Math.random() * 256)}.${Math.floor(
            Math.random() * 256
          )}.${Math.floor(Math.random() * 256)}.${Math.floor(
            Math.random() * 256
          )}`,
          location: locations[Math.floor(Math.random() * locations.length)],
          visitCount: Math.floor(Math.random() * 20) + 1,
          lastVisit: randomDate.toISOString(),
          userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
        })
      );
    }
    setTimeout(() => setIsLoading(false), 500);
  }, [dispatch]);

  // Enhanced filtering and sorting with performance optimization
  const processedGuests = useMemo(() => {
    const filtered = guestVisits.filter((guest) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return [guest.ip, guest.location, guest.userAgent, guest.guestId].some(
        (field) => field?.toLowerCase().includes(searchLower)
      );
    });

    return filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      let aVal, bVal;

      switch (key) {
        case "visitCount":
          aVal = a.visitCount || 0;
          bVal = b.visitCount || 0;
          break;
        case "location":
          aVal = a.location || "";
          bVal = b.location || "";
          break;
        case "ip":
          // Sort IP addresses properly
          aVal =
            a.ip
              ?.split(".")
              .map((num) => parseInt(num).toString().padStart(3, "0"))
              .join(".") || "";
          bVal =
            b.ip
              ?.split(".")
              .map((num) => parseInt(num).toString().padStart(3, "0"))
              .join(".") || "";
          break;
        default: // lastVisit
          aVal = new Date(a.lastVisit || 0);
          bVal = new Date(b.lastVisit || 0);
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [guestVisits, searchTerm, sortConfig]);

  const { containerRef, visibleRange, handleScroll, totalHeight } =
    useVirtualScrolling(processedGuests, 400, 60);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const formatGuestId = (guestId, isCurrent = false) => {
    if (!guestId) return "—";
    return isCurrent ? guestId : `${guestId.slice(0, 8)}...`;
  };

  const GuestCard = ({ guest, isSelected, onClick, isCurrent }) => (
    <div
      className={`
        group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
        ${
          isCurrent
            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-700"
            : isSelected
            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-600"
            : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }
        hover:shadow-lg hover:scale-[1.02]
      `}
      onClick={onClick}
    >
      {isCurrent && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
          You
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-sm text-gray-600 dark:text-gray-300">
          {formatGuestId(guest.guestId, isCurrent)}
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded-full">
            {guest.location || "—"}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">
            {guest.visitCount} visits
          </span>
        </div>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
        IP: {guest.ip || "—"}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {guest.lastVisit
          ? formatDistanceToNow(new Date(guest.lastVisit), { addSuffix: true })
          : "—"}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
        {guest.userAgent || "—"}
      </div>
    </div>
  );

  const TableRow = ({ guest, isSelected, onClick, isCurrent, style }) => (
    <div
      style={style}
      className={`
        flex items-center px-4 py-3 border-b cursor-pointer transition-colors
        ${
          isCurrent
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            : isSelected
            ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }
      `}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 grid grid-cols-6 gap-4 text-sm">
        <div className="font-mono text-xs truncate">
          {isCurrent && <span className="text-amber-600 mr-1">★</span>}
          {formatGuestId(guest.guestId, isCurrent)}
        </div>
        <div className="truncate">{guest.ip || "—"}</div>
        <div className="truncate">
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
            {guest.location || "—"}
          </span>
        </div>
        <div className="font-medium">{guest.visitCount}</div>
        <div className="text-xs">
          {guest.lastVisit
            ? formatDistanceToNow(new Date(guest.lastVisit), {
                addSuffix: true,
              })
            : "—"}
        </div>
        <div className="text-xs truncate max-w-[120px]">
          {guest.userAgent || "—"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            👥 Guest Visits
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {processedGuests.length} total visitors
            {searchTerm && ` (filtered from ${guestVisits.length})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={simulateMultipleGuests}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : "📊 Add Test Data"}
          </button>
        </div>
      </div>

      {/* Selected Guest Details */}
      {selectedGuest && (
        <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              🔍 Guest Details
            </h3>
            <button
              onClick={() => setSelectedGuest(null)}
              className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>ID:</strong>{" "}
              {formatGuestId(
                selectedGuest.guestId,
                currentGuestId === selectedGuest.guestId
              )}
            </div>
            <div>
              <strong>IP Address:</strong> {selectedGuest.ip}
            </div>
            <div>
              <strong>Location:</strong> {selectedGuest.location}
            </div>
            <div>
              <strong>Visit Count:</strong> {selectedGuest.visitCount}
            </div>
            <div>
              <strong>Last Visit:</strong>{" "}
              {selectedGuest.lastVisit
                ? formatDistanceToNow(new Date(selectedGuest.lastVisit), {
                    addSuffix: true,
                  })
                : "—"}
            </div>
            <div className="md:col-span-2">
              <strong>User Agent:</strong>{" "}
              <span className="font-mono text-xs">
                {selectedGuest.userAgent}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 Search by IP, location, agent, or ID..."
            className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              📋 Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              🎴 Cards
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="lastVisit">Last Visit</option>
              <option value="visitCount">Visit Count</option>
              <option value="location">Location</option>
              <option value="ip">IP Address</option>
            </select>
            <button
              onClick={() => handleSort(sortConfig.key)}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {sortConfig.direction === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {processedGuests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👻</div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {searchTerm ? "No matching visitors found" : "No visitors yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Add some test data to get started"}
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* Card View with Virtual Scrolling */
          <div
            ref={containerRef}
            className="h-[400px] overflow-y-auto p-4"
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {processedGuests
                .slice(visibleRange.start, visibleRange.end)
                .map((guest, index) => {
                  const actualIndex = visibleRange.start + index;
                  const isCurrent = currentGuestId === guest.guestId;
                  const isSelected = selectedGuest?.guestId === guest.guestId;

                  return (
                    <div
                      key={guest.guestId}
                      style={{
                        position: "absolute",
                        top: actualIndex * 60,
                        left: 0,
                        right: 0,
                        height: 56,
                      }}
                      className="px-2"
                    >
                      <GuestCard
                        guest={guest}
                        isSelected={isSelected}
                        isCurrent={isCurrent}
                        onClick={() => setSelectedGuest(guest)}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Table View with Virtual Scrolling */
          <div>
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                <button
                  onClick={() => handleSort("guestId")}
                  className="text-left hover:text-blue-600"
                >
                  Guest ID{" "}
                  {sortConfig.key === "guestId" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSort("ip")}
                  className="text-left hover:text-blue-600"
                >
                  IP Address{" "}
                  {sortConfig.key === "ip" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSort("location")}
                  className="text-left hover:text-blue-600"
                >
                  Location{" "}
                  {sortConfig.key === "location" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSort("visitCount")}
                  className="text-left hover:text-blue-600"
                >
                  Visits{" "}
                  {sortConfig.key === "visitCount" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSort("lastVisit")}
                  className="text-left hover:text-blue-600"
                >
                  Last Visit{" "}
                  {sortConfig.key === "lastVisit" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
                <div>User Agent</div>
              </div>
            </div>

            {/* Virtual Scrolled Table Body */}
            <div
              ref={containerRef}
              className="h-[400px] overflow-y-auto"
              onScroll={handleScroll}
            >
              <div style={{ height: totalHeight, position: "relative" }}>
                {processedGuests
                  .slice(visibleRange.start, visibleRange.end)
                  .map((guest, index) => {
                    const actualIndex = visibleRange.start + index;
                    const isCurrent = currentGuestId === guest.guestId;
                    const isSelected = selectedGuest?.guestId === guest.guestId;

                    return (
                      <TableRow
                        key={guest.guestId}
                        guest={guest}
                        isSelected={isSelected}
                        isCurrent={isCurrent}
                        onClick={() => setSelectedGuest(guest)}
                        style={{
                          position: "absolute",
                          top: actualIndex * 60,
                          left: 0,
                          right: 0,
                          height: 60,
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentGuestVisits;
