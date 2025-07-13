// components/Admin/PostSizeSummary.jsx
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#FF6666",
  "#AA66CC", "#66CCFF", "#99CC00", "#FF4444", "#33B5E5",
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.02 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const PostSizeSummary = ({ posts }) => {
  const postsWithSize = posts.filter((p) => typeof p.sizeInKB === "number");

  if (postsWithSize.length === 0) return null;

  const sizeData = postsWithSize.map((post) => ({
    name: post.title.length > 40 ? post.title.slice(0, 40) + "..." : post.title,
    value: parseFloat(post.sizeInKB),
  }));

  const topPosts = [...postsWithSize]
    .sort((a, b) => b.sizeInKB - a.sizeInKB)
    .slice(0, 5);

  return (
    <div className="w-full mb-8">
      {/* Pie Chart Section */}
      <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
        <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
          Post Size Distribution (KB)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={sizeData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {sizeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} KB`} />
            <Legend
              verticalAlign="bottom"
              height={60}
              wrapperStyle={{
                fontSize: 12,
                paddingTop: 10,
                maxHeight: 60,
                overflowY: "auto",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Largest Posts Table */}
      <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
          Top 5 Largest Posts
        </h3>
        <div className="overflow-y-auto max-h-60 border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm text-text-main-light dark:text-text-main-dark">
            <thead className="bg-gray-100 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Size (KB)</th>
                <th className="px-4 py-2">Author</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map((post) => (
                <tr
                  key={post._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-2" title={post.title}>
                    {post.title.length > 60 ? post.title.slice(0, 60) + "..." : post.title}
                  </td>
                  <td className="px-4 py-2">{post.sizeInKB}</td>
                  <td className="px-4 py-2">{post.author?.name || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PostSizeSummary;
