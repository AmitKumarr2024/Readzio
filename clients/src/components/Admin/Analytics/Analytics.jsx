import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSiteAnalytics, getAllUsers, clearError } from "../../../store/adminSlice";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, BarChart, Users, Clock, FileText } from "lucide-react";
import { IoCloseCircleOutline } from "react-icons/io5";
import { FiMaximize2 } from "react-icons/fi";

// Custom hook for count-up animation
const useCountUp = (target = 0, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(target) || 0;
    if (start === end) return;

    const incrementTime = duration / (end || 1);
    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / incrementTime));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
};

// Utility to format time in hours, minutes, seconds
const formatTime = (seconds) => {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0)
    return "0 hr 0 min 0 sec";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hrs) parts.push(`${hrs} ${hrs === 1 ? "hr" : "hrs"}`);
  if (mins || (hrs && !secs))
    parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);
  if (secs || (!hrs && !mins))
    parts.push(`${secs} ${secs === 1 ? "sec" : "secs"}`);

  return parts.join(" ");
};

const Analytics = () => {
  const dispatch = useDispatch();
  const { analytics, analyticsLoading, analyticsError, totalUsers = 0 } = useSelector((state) => state.admin);
  const { onlineUsersCount = 0, guestUsersCount = 0 } = useSelector((state) => state.socket);
  const { currentPost: post, sessionTime } = useSelector((state) => state.post);
  const { user: currentUser } = useSelector((state) => state.auth);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [modalType, setModalType] = useState(null);

  const onlineCount = useCountUp(onlineUsersCount, 1000);
  const guestCount = useCountUp(guestUsersCount, 1000);
  const totalUsersCount = useCountUp(totalUsers, 1000);
  const offlineUsers = Math.max(0, totalUsers - onlineUsersCount);
  const offlineCount = useCountUp(offlineUsers, 1000);

  useEffect(() => {
    dispatch(fetchSiteAnalytics({ startDate: dateRange.startDate, endDate: dateRange.endDate }));
    dispatch(getAllUsers({ page: 1, limit: 10 }));
  }, [dispatch, dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const pieData = [
    { name: "Total Visits", value: analytics.traffic?.totalVisits || 0 },
    { name: "Unique Users", value: analytics.traffic?.uniqueUsersCount || 0 },
    { name: "Unique Posts", value: analytics.traffic?.uniquePostsCount || 0 },
    { name: "Guest Users", value: guestUsersCount || 0 },
  ];

  const COLORS = ["#5b21b6", "#4ade80", "#facc15", "#ff6b6b"];

  // CPM calculation: $2.50 per 1000 impressions, 1 impression per 30 seconds
  const CPM_RATE = 2.50;
  const IMPRESSION_INTERVAL = 30; // seconds
  const calculateAdEarnings = (totalTimeSpent) => {
    const impressions = Math.floor(totalTimeSpent / IMPRESSION_INTERVAL);
    return (impressions * CPM_RATE / 1000).toFixed(2);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  const numberVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } },
  };

  const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen"
    >
      {/* Hero Section: Online, Offline, Total, Guest Users */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Online Users Card */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(0, 128, 64, 0.2)" }}
          className="relative p-6 rounded-2xl bg-gradient-to-r from-green-100 to-emerald-200 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-green-600" /> Online Users
              </h3>
              <div className="relative h-16">
                <AnimatePresence>
                  <motion.span
                    key={onlineCount}
                    variants={numberVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute text-5xl font-extrabold text-green-700"
                  >
                    {onlineCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={() => setModalType("online")}
              className="btn btn-ghost btn-circle text-green-600 hover:bg-green-300"
            >
              <FiMaximize2 className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

        {/* Offline Users Card */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(107, 114, 128, 0.2)" }}
          className="relative p-6 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-gray-600" /> Offline Users
              </h3>
              <div className="relative h-16">
                <AnimatePresence>
                  <motion.span
                    key={offlineCount}
                    variants={numberVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute text-5xl font-extrabold text-gray-700"
                  >
                    {offlineCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={() => setModalType("offline")}
              className="btn btn-ghost btn-circle text-gray-600 hover:bg-gray-300"
            >
              <FiMaximize2 className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

        {/* Total Registered Users Card */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(59, 130, 246, 0.2)" }}
          className="relative p-6 rounded-2xl bg-gradient-to-r from-blue-100 to-indigo-200 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-blue-600" /> Total Users
              </h3>
              <div className="relative h-16">
                <AnimatePresence>
                  <motion.span
                    key={totalUsersCount}
                    variants={numberVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute text-5xl font-extrabold text-blue-700"
                  >
                    {totalUsersCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={() => setModalType("total")}
              className="btn btn-ghost btn-circle text-blue-600 hover:bg-blue-300"
            >
              <FiMaximize2 className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

        {/* Guest Users Card */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(255, 107, 107, 0.2)" }}
          className="relative p-6 rounded-2xl bg-gradient-to-r from-red-100 to-pink-200 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-red-600" /> Guest Users
              </h3>
              <div className="relative h-16">
                <AnimatePresence>
                  <motion.span
                    key={guestCount}
                    variants={numberVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute text-5xl font-extrabold text-red-700"
                  >
                    {guestCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={() => setModalType("guest")}
              className="btn btn-ghost btn-circle text-red-600 hover:bg-red-300"
            >
              <FiMaximize2 className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Full-Screen Modals */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          >
            <motion.div
              variants={modalVariants}
              className={`p-12 rounded-xl text-center w-full h-full flex flex-col items-center justify-center ${
                modalType === "online"
                  ? "bg-gradient-to-br from-green-200 to-emerald-300"
                  : modalType === "offline"
                  ? "bg-gradient-to-br from-gray-200 to-gray-300"
                  : modalType === "total"
                  ? "bg-gradient-to-br from-blue-200 to-indigo-300"
                  : "bg-gradient-to-br from-red-200 to-pink-300"
              }`}
            >
              <button
                onClick={() => setModalType(null)}
                className="absolute top-4 right-4 btn btn-circle text-gray-800 hover:bg-gray-200"
              >
                <IoCloseCircleOutline size={32} />
              </button>
              <h2 className="text-4xl md:text-6xl font-bold mb-8 text-gray-800">
                {modalType === "online"
                  ? "Online Users"
                  : modalType === "offline"
                  ? "Offline Users"
                  : modalType === "total"
                  ? "Total Registered Users"
                  : "Guest Users"}
              </h2>
              <div className="relative h-32">
                <AnimatePresence>
                  <motion.span
                    key={
                      modalType === "online"
                        ? onlineCount
                        : modalType === "offline"
                        ? offlineCount
                        : modalType === "total"
                        ? totalUsersCount
                        : guestCount
                    }
                    variants={numberVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute text-8xl md:text-9xl font-extrabold tracking-tight text-gray-900"
                  >
                    {modalType === "online"
                      ? onlineCount
                      : modalType === "offline"
                      ? offlineCount
                      : modalType === "total"
                      ? totalUsersCount
                      : guestCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Content */}
      <motion.div className="bg-white rounded-xl p-8 shadow-lg">
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
          <BarChart className="w-8 h-8 text-blue-600" /> Site Analytics
        </h2>

        {/* Date Range Filter */}
        <motion.div variants={itemVariants} className="mb-6 flex gap-4 flex-wrap">
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="input input-bordered bg-white border-gray-200 text-gray-700 focus:ring-blue-500"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="input input-bordered bg-white border-gray-200 text-gray-700 focus:ring-blue-500"
          />
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {analyticsError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center"
            >
              <span>{analyticsError}</span>
              <button
                onClick={() => dispatch(clearError())}
                className="btn btn-ghost btn-sm text-red-700 hover:bg-red-200"
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {analyticsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admin-Only Post Analytics */}
            {currentUser?.role === "admin" && post && (
              <motion.div
                variants={itemVariants}
                className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
                  <FileText className="w-6 h-6 text-blue-600" /> Post Analytics
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p className="text-lg">
                    <span className="font-medium">Post Title:</span>{" "}
                    <span className="text-blue-600 font-bold">{post.title || "N/A"}</span>
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Your Read Time:</span>{" "}
                    <span className="text-blue-600 font-bold">{formatTime(sessionTime || 0)}</span>
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Total Time Spent:</span>{" "}
                    <span className="text-blue-600 font-bold">{formatTime(post.timeSpent || 0)}</span>
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Estimated Impressions:</span>{" "}
                    <span className="text-blue-600 font-bold">{Math.floor((post.timeSpent || 0) / IMPRESSION_INTERVAL)}</span>
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Ad Earnings (CPM $2.50):</span>{" "}
                    <span className="text-blue-600 font-bold">${calculateAdEarnings(post.timeSpent || 0)}</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Traffic Overview */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-blue-600" /> Traffic Overview
              </h3>
              <div className="space-y-3 text-gray-700">
                <p className="text-lg">
                  <span className="font-medium">Total Visits:</span>{" "}
                  <span className="text-blue-600 font-bold">{analytics.traffic?.totalVisits || 0}</span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Total Time Spent:</span>{" "}
                  <span className="text-blue-600 font-bold">
                    {(analytics.traffic?.totalTimeSpent ? analytics.traffic.totalTimeSpent / 60 : 0).toFixed(2)} minutes
                  </span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Unique Users:</span>{" "}
                  <span className="text-blue-600 font-bold">{analytics.traffic?.uniqueUsersCount || 0}</span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Unique Posts:</span>{" "}
                  <span className="text-blue-600 font-bold">{analytics.traffic?.uniquePostsCount || 0}</span>
                </p>
                <p className="text-lg">
                  <span className="font-medium">Guest Users:</span>{" "}
                  <span className="text-blue-600 font-bold">{guestUsersCount || 0}</span>
                </p>
              </div>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <BarChart className="w-6 h-6 text-blue-600" /> Traffic Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Posts */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <FileText className="w-6 h-6 text-blue-600" /> Top Posts
              </h3>
              {analytics.topPosts?.length > 0 ? (
                <ul className="space-y-4">
                  {analytics.topPosts.map((post) => (
                    <motion.li
                      key={post.postId}
                      variants={itemVariants}
                      className="border-l-4 border-blue-500 pl-4"
                    >
                      <span className="font-medium text-gray-800">{post.title}</span>
                      <p className="text-sm text-gray-600">Visits: {post.visitCount || 0}</p>
                      <p className="text-sm text-gray-600">
                        Time Spent: {(post.totalTimeSpent ? post.totalTimeSpent / 60 : 0).toFixed(2)} minutes
                      </p>
                      <p className="text-sm text-gray-600">
                        Ad Earnings: ${calculateAdEarnings(post.totalTimeSpent || 0)}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No data available</p>
              )}
            </motion.div>

            {/* Top Users */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <Users className="w-6 h-6 text-blue-600" /> Top Active Users
              </h3>
              {analytics.topUsers?.length > 0 ? (
                <ul className="space-y-4">
                  {analytics.topUsers.map((user) => (
                    <motion.li
                      key={user._id}
                      variants={itemVariants}
                      className="border-l-4 border-green-500 pl-4"
                    >
                      <span className="font-medium text-gray-800">
                        {user.name || "Unknown"} ({user.email || "No email"})
                      </span>
                      <p className="text-sm text-gray-600">Visits: {user.totalVisits || 0}</p>
                      <p className="text-sm text-gray-600">
                        Time Spent: {(user.totalTimeSpent ? user.totalTimeSpent / 60 : 0).toFixed(2)} minutes
                      </p>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No data available</p>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Analytics;