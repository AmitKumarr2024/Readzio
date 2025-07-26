import React from "react";
import { useSelector } from "react-redux";
import { selectSocketState } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";

const RecentGuestVisits = () => {
  const { guestVisits = [] } = useSelector(selectSocketState);
  console.log("[RecentGuestVisits] guestVisits from Redux:", guestVisits);

  if (!guestVisits.length) {
    return (
      <div className="text-gray-400 text-center py-4">
        No guest visits recorded yet.
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        👥 Recent Guest Visits
      </h2>

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
            {guestVisits.map((guest) => (
              <tr
                key={guest.guestId}
                className="border-b border-gray-200 dark:border-gray-700"
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
    </div>
  );
};

export default RecentGuestVisits;
