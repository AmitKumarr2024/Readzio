// Component: Manages ad revenue distribution with a bar chart and user earnings table
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  distributeAdsRevenue,
  fetchAllUsersEarnings,
} from "../../../store/earningSlice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Component to handle ad revenue distribution and visualization
const AdsDashboard = () => {
  // Initialize Redux dispatch
  const dispatch = useDispatch();
  // Select earnings state from Redux store
  const { allUsersEarnings, loading, error, success } = useSelector(
    (state) => state.earnings || {}
  );
  // State: Manages revenue amount input
  const [amount, setAmount] = useState("");

  // Effect: Fetch all users' earnings on component mount
  useEffect(() => {
    dispatch(fetchAllUsersEarnings());
  }, [dispatch]);

  // Handle distribution of ad revenue
  const handleDistribute = () => {
    const amt = parseFloat(amount);
    // Validate: Ensure amount is positive and valid
    if (!amt || amt <= 0) {
      alert("Enter a valid ₹ amount");
      return;
    }
    dispatch(distributeAdsRevenue(amt));
  };

  // Prepare data for bar chart, filtering users with positive ad earnings
  const chartData = Array.isArray(allUsersEarnings)
    ? allUsersEarnings
        .filter((u) => u.ads > 0)
        .map((u) => ({
          name: u.user?.username || "Unknown",
          earnings: Math.round(u.ads / 100),
        }))
    : [];

  // Render: Loading state
  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading Ads Dashboard...
      </div>
    );
  }

  // Render: Main dashboard with input, chart, and table
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
        Ads Revenue Distribution
      </h2>

      {/* Input and Button: For entering and distributing revenue */}
      <div className="flex gap-4 items-center">
        <input
          type="number"
          className="border px-3 py-2 rounded-lg dark:bg-gray-800 dark:text-white"
          placeholder="Total Ads Revenue (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          onClick={handleDistribute}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          disabled={loading}
        >
          {loading ? "Processing..." : "Distribute Revenue"}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && <p className="text-green-600">{success}</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Bar Chart: Displays earnings for users with ad revenue */}
      {chartData.length > 0 && (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="earnings" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table: Lists user earnings and payment details */}
      <div className="overflow-auto rounded-lg border dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">User</th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Ads Earnings (₹)
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Total Earnings (₹)
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium">
                Payments
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {(Array.isArray(allUsersEarnings) ? allUsersEarnings : []).map(
              (user) => (
                <tr key={user.user?._id || Math.random()}>
                  <td className="px-4 py-2">
                    {user.user?.username || "N/A"}
                    <br />
                    <span className="text-xs text-gray-500">
                      {user.user?.email || "No email"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    ₹{(user.ads / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    ₹{(user.total / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {user.payments?.length || 0}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdsDashboard;