// components/Admin/PostSizeSummary.jsx
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#FF6666",
  "#AA66CC",
  "#66CCFF",
  "#99CC00",
  "#FF4444",
  "#33B5E5",
];

const PostSizeSummary = ({ posts }) => {
  const postsWithSize = posts.filter((p) => typeof p.sizeInKB === "number");

  // Group posts into size ranges for better visualization
  const sizeRangeData = useMemo(() => {
    if (postsWithSize.length === 0) return [];

    const ranges = [
      { min: 0, max: 10, label: "0-10 KB", color: "#0088FE" },
      { min: 10, max: 50, label: "10-50 KB", color: "#00C49F" },
      { min: 50, max: 100, label: "50-100 KB", color: "#FFBB28" },
      { min: 100, max: 500, label: "100-500 KB", color: "#FF8042" },
      { min: 500, max: 1000, label: "500KB-1MB", color: "#FF6666" },
      { min: 1000, max: Infinity, label: "1MB+", color: "#AA66CC" },
    ];

    return ranges
      .map((range) => {
        const count = postsWithSize.filter(
          (post) => post.sizeInKB >= range.min && post.sizeInKB < range.max
        ).length;

        return {
          name: range.label,
          value: count,
          color: range.color,
          percentage: ((count / postsWithSize.length) * 100).toFixed(1),
        };
      })
      .filter((range) => range.value > 0); // Only show ranges with posts
  }, [postsWithSize]);

  // Get top 10 largest posts instead of top 5
  const topPosts = useMemo(() => {
    return [...postsWithSize]
      .sort((a, b) => b.sizeInKB - a.sizeInKB)
      .slice(0, 10);
  }, [postsWithSize]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (postsWithSize.length === 0) return null;

    const sizes = postsWithSize.map((p) => p.sizeInKB);
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const average = total / sizes.length;
    const median = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)];
    const max = Math.max(...sizes);
    const min = Math.min(...sizes);

    return { total, average, median, max, min, count: sizes.length };
  }, [postsWithSize]);

  if (postsWithSize.length === 0) {
    return (
      <div className="w-full mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h3 className="text-xl font-semibold text-text-main-light dark:text-text-main-dark">
          Post Size Summary
        </h3>
        <p className="text-gray-500 mt-4">
          No posts with size information available.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      {/* Statistics Overview */}
      <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
        <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
          Post Size Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Posts
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {stats.count.toLocaleString()}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Size
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {(stats.total / 1024).toFixed(1)} MB
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Average
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {stats.average.toFixed(1)} KB
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Median
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {stats.median.toFixed(1)} KB
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Largest
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {stats.max.toFixed(1)} KB
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Smallest
            </div>
            <div className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
              {stats.min.toFixed(1)} KB
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Size Distribution Pie Chart (by ranges) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
            Size Distribution by Ranges
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sizeRangeData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                labelLine={false}
              >
                {sizeRangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} posts (${(
                    (value / postsWithSize.length) *
                    100
                  ).toFixed(1)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Size Distribution Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
            Posts per Size Range
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sizeRangeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} posts`, "Count"]}
                labelFormatter={(label) => `Size Range: ${label}`}
              />
              <Bar dataKey="value" fill="#0088FE">
                {sizeRangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Largest Posts Table */}
      <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
          Top 10 Largest Posts
        </h3>
        <div className="overflow-x-auto">
          <div className="overflow-y-auto max-h-80 border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full text-sm text-text-main-light dark:text-text-main-dark">
              <thead className="bg-gray-100 dark:bg-gray-700 text-left sticky top-0">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Size (KB)</th>
                  <th className="px-4 py-2">Size (MB)</th>
                  <th className="px-4 py-2">Author</th>
                  <th className="px-4 py-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post, index) => (
                  <tr
                    key={post._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2" title={post.title}>
                      {post.title.length > 50
                        ? post.title.slice(0, 50) + "..."
                        : post.title}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {post.sizeInKB.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {(post.sizeInKB / 1024).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{post.author?.name || "N/A"}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {((post.sizeInKB / stats.total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {postsWithSize.length > 10 && (
          <p className="text-sm text-gray-500 mt-2">
            Showing top 10 of {postsWithSize.length.toLocaleString()} posts with
            size information
          </p>
        )}
      </div>
    </div>
  );
};

export default PostSizeSummary;
