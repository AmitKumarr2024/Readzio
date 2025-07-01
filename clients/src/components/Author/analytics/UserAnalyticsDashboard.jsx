import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSpinner } from "react-icons/fa";
import {
  fetchUserEngagementStats,
  fetchPostAnalytics,
  selectPostAnalytics,
  selectUserEngagement,
  selectPostAnalyticsPropertiesStatus,
  selectPostAnalyticsPropertiesError,
  selectUserEngagementPropertiesStatus,
  selectUserEngagementPropertiesError,
} from "../../../store/analyticsSlice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

const UserAnalyticsDashboard = ({ posts }) => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const myPostIds = posts
    ?.filter((post) => post?.author?._id === user?._id)
    .map((post) => post._id)
    .join(",");

  const postStats = useSelector(selectPostAnalytics);
  const userEngagement = useSelector(selectUserEngagement);
  const postStatus = useSelector(selectPostAnalyticsPropertiesStatus);
  const postError = useSelector(selectPostAnalyticsPropertiesError);
  const userStatus = useSelector(selectUserEngagementPropertiesStatus);
  const userError = useSelector(selectUserEngagementPropertiesError);

  useEffect(() => {
    if (myPostIds) dispatch(fetchPostAnalytics(myPostIds));
    dispatch(fetchUserEngagementStats());
  }, [dispatch, myPostIds]);

  const engagementData = userEngagement?.data
    ? Object.entries(userEngagement.data).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const topPosts = useMemo(() => {
    return [...(postStats?.stats || [])]
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);
  }, [postStats]);

  const totalStats = useMemo(() => {
    const all = postStats?.stats || [];
    const totalViews = all.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalLikes = all.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = all.reduce(
      (sum, p) => sum + (p.commentsCount || 0),
      0
    );
    const avgViews = all.length ? Math.round(totalViews / all.length) : 0;
    const engagementRate = totalViews
      ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(2)
      : "0";
    return { totalViews, totalLikes, totalComments, avgViews, engagementRate };
  }, [postStats]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark shadow-2xl rounded-2xl">
      <h2 className="text-3xl font-bold  text-text-main-light dark:text-text-main-dark mb-4">
        📈 User Analytics Dashboard
      </h2>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Views" value={totalStats.totalViews} />
        <StatCard label="Total Likes" value={totalStats.totalLikes} />
        <StatCard label="Total Comments" value={totalStats.totalComments} />
        <StatCard label="Avg Views/Post" value={totalStats.avgViews} />
        <StatCard
          label="Engagement Rate"
          value={`${totalStats.engagementRate}%`}
        />
      </section>

      {/* User Engagement Pie Chart */}
      <section>
        <h3 className="text-2xl font-semibold mb-4">Overall Engagement</h3>
        {userStatus === "loading" ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
            <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-lg font-semibold text-gray-700">Loading...</p>
          </div>
        ) : userStatus === "failed" ? (
          <p className="text-red-600">Error: {userError}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                label
              >
                {engagementData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Top Performing Posts */}
      <section>
        <h3 className="text-2xl font-semibold mb-4">🔥 Top Performing Posts</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {topPosts.map((post, idx) => (
            <div
              key={post.postId}
              className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark p-4 rounded-xl border hover:shadow transition"
            >
              <h4 className="text-md font-bold mb-1">
                #{idx + 1} Post ID: {post.postId.slice(0, 6)}...
              </h4>
              <div className="text-sm   text-text-main-light dark:text-text-main-dark">
                Views: {post.views}
              </div>
              <div className="text-sm   text-text-main-light dark:text-text-main-dark">
                Likes: {post.likes}
              </div>
              <div className="text-sm   text-text-main-light dark:text-text-main-dark">
                Comments: {post.commentsCount}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Post Performance Bar Chart */}
      <section>
        <h3 className="text-2xl font-semibold mb-4">
          📊 Post Performance Overview
        </h3>
        {postStatus === "loading" ? (
          <p className="text-gray-500">Loading post stats...</p>
        ) : postStatus === "failed" ? (
          <p className="text-red-600">Error: {postError}</p>
        ) : postStats?.stats?.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={postStats.stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="postId"
                tickFormatter={(id) => id.slice(0, 6) + "..."}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#6366f1" />
              <Bar dataKey="likes" fill="#818cf8" />
              <Bar dataKey="commentsCount" fill="#a5b4fc" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No analytics found for your posts.</p>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark p-4 rounded-xl text-center shadow">
    <div className=" text-text-main-light dark:text-text-main-dark text-sm uppercase">{label}</div>
    <div className="text-xl font-bold text-indigo-800">{value}</div>
  </div>
);

export default UserAnalyticsDashboard;
