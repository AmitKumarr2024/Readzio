import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchSiteAnalytics,
  getAllUsers,
  clearError,
} from "../../../store/adminSlice";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, BarChart, Users, Clock, FileText } from "lucide-react";
import { IoCloseCircleOutline } from "react-icons/io5";
import { FiMaximize2 } from "react-icons/fi";
import CountUp from "react-countup";
import ErrorBoundary from "../../Post/ErrorBoundary";
import { trackGuestVisit } from "../../../store/guestSlice";

// Constants (move to a separate file if needed)
const CPM_RATE = 2.5;
const IMPRESSION_INTERVAL = 30;

// Lazy-load AdminLocationDashboard
const AdminLocationDashboard = lazy(() =>
  import("../../location/AdminLocationDashboard")
);

// Reusable StatModal component
const StatModal = ({ type, count, onClose }) => {
  const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.3 } },
  };

  const titles = {
    online: "Online Users",
    offline: "Offline Users",
    total: "Total Registered Users",
    guest: "Guest Users",
  };

  const bgClasses = {
    online:
      "bg-gradient-to-br from-green-200 dark:from-green-900/50 to-emerald-300 dark:to-emerald-800/50",
    offline:
      "bg-gradient-to-br from-gray-200 dark:from-gray-700/50 to-gray-300 dark:to-gray-600/50",
    total:
      "bg-gradient-to-br from-blue-200 dark:from-blue-900/50 to-indigo-300 dark:to-indigo-800/50",
    guest:
      "bg-gradient-to-br from-red-200 dark:from-red-900/50 to-pink-300 dark:to-pink-800/50",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background-light dark:bg-background-dark flex items-center justify-center z-50"
    >
      <motion.div
        variants={modalVariants}
        className={`p-6 sm:p-12 rounded-xl text-center w-full max-w-3xl h-full max-h-[80vh] flex flex-col items-center justify-center ${bgClasses[type]}`}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-gray-600/50 rounded-full p-2 transition"
        >
          <IoCloseCircleOutline size={32} />
        </button>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-8 text-text-main-light dark:text-text-main-dark">
          {titles[type]}
        </h2>
        <CountUp
          end={count}
          duration={1}
          className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-text-main-light dark:text-text-main-dark"
        />
      </motion.div>
    </motion.div>
  );
};

// Utility to format time
const formatTime = (seconds) => {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0)
    return "0 hr 0 min 0 sec";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hrs) parts.push(`${hrs} hr${hrs === 1 ? "" : "s"}`);
  if (mins || (hrs && !secs)) parts.push(`${mins} min${mins === 1 ? "" : "s"}`);
  if (secs || (!hrs && !mins))
    parts.push(`${secs} sec${secs === 1 ? "" : "s"}`);
  return parts.join(" ");
};

const Insights = () => {
  const dispatch = useDispatch();
  const {
    admin: { analytics = {}, analyticsLoading, analyticsError, totalUsers = 0 },
    socket: { onlineUsersCount = 0, guestUsersCount = 0 },
    post: { currentPost: post, sessionTime },
    auth: { user: currentUser },
  } = useSelector(
    (state) => ({
      admin: state.admin,
      socket: state.socket,
      post: state.post,
      auth: state.auth,
    }),
    shallowEqual
  );

  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [modalType, setModalType] = useState(null);

  const offlineUsers = Math.max(0, totalUsers - onlineUsersCount);

  // Validate date range
  const isValidDateRange = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return true;
    return new Date(dateRange.startDate) <= new Date(dateRange.endDate);
  }, [dateRange]);

  // Memoized pie chart data
  const pieData = useMemo(
    () => [
      { name: "Total Visits", value: analytics.traffic?.totalVisits || 0 },
      { name: "Unique Users", value: analytics.traffic?.uniqueUsersCount || 0 },
      { name: "Unique Posts", value: analytics.traffic?.uniquePostsCount || 0 },
      { name: "Guest Users", value: guestUsersCount || 0 },
    ],
    [analytics.traffic, guestUsersCount]
  );

  const COLORS = ["#5b21b6", "#4ade80", "#facc15", "#ff6b6b"];

  const calculateAdEarnings = (totalTimeSpent) => {
    const impressions = Math.floor(totalTimeSpent / IMPRESSION_INTERVAL);
    return ((impressions * CPM_RATE) / 1000).toFixed(2);
  };

  useEffect(() => {
    dispatch(
      fetchSiteAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
    );
    dispatch(getAllUsers({ page: 1, limit: 10 }));
  }, [dispatch, dateRange]);

  useEffect(() => {
    dispatch(trackGuestVisit()); // ✅ fire once per session
  }, [dispatch]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  const totalTimeSpent = analytics?.traffic?.totalTimeSpent ?? 0;
  const totalHours = (totalTimeSpent / 3600).toFixed(1); // seconds to hours

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark min-h-screen"
    >
      {/* Hero Section */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            type: "online",
            count: onlineUsersCount,
            icon: Users,
            color: "green",
            label: "Online Users",
          },
          {
            type: "offline",
            count: offlineUsers,
            icon: Users,
            color: "gray",
            label: "Offline Users",
          },
          {
            type: "total",
            count: totalUsers,
            icon: Users,
            color: "blue",
            label: "Total Users",
          },
          {
            type: "guest",
            count: guestUsersCount,
            icon: Users,
            color: "red",
            label: "Guest Users",
          },
        ].map(({ type, count, icon: Icon, color, label }) => (
          <motion.div
            key={type}
            whileHover={{
              scale: 1.05,
              boxShadow: `0 10px 20px rgba(0, 128, 64, 0.2)`,
            }}
            className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-${color}-100 dark:from-${color}-900/50 to-${color}-200 dark:to-${color}-800/50 shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-600 dark:text-${color}-400`}
                  />{" "}
                  {label}
                </h3>
                <CountUp
                  end={count}
                  duration={1}
                  className="text-4xl sm:text-5xl font-extrabold text-text-main-light dark:text-text-main-dark"
                />
              </div>
              <button
                onClick={() => setModalType(type)}
                className={`text-${color}-600 dark:text-${color}-400 hover:bg-${color}-300 dark:hover:bg-${color}-700/50 rounded-full p-2 transition`}
              >
                <FiMaximize2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modalType && (
          <StatModal
            type={modalType}
            count={
              modalType === "online"
                ? onlineUsersCount
                : modalType === "offline"
                ? offlineUsers
                : modalType === "total"
                ? totalUsers
                : guestUsersCount
            }
            onClose={() => setModalType(null)}
          />
        )}
      </AnimatePresence>

      {/* Live User Locations Map */}
      <motion.div
        variants={itemVariants}
        className="bg-background-light dark:bg-background-dark rounded-xl p-4 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />{" "}
          All User Locations
        </h2>
        <ErrorBoundary
          fallback={
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-center">
              Failed to load map
            </div>
          }
        >
          <Suspense
            fallback={
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            }
          >
            <AdminLocationDashboard />
          </Suspense>
        </ErrorBoundary>
      </motion.div>

      {/* Insights
     Content */}
      <motion.div
        variants={itemVariants}
        className="bg-background-light dark:bg-background-dark rounded-xl p-4 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
          <BarChart className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />{" "}
          Site Insights
        </h2>

        {/* Date Range Filter */}
        <motion.div
          variants={itemVariants}
          className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4"
        >
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full sm:w-auto"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full sm:w-auto"
          />
          {!isValidDateRange && (
            <p className="text-red-500 text-sm">
              Start date must be before or equal to end date
            </p>
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {analyticsError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex justify-between items-center"
            >
              <span>{analyticsError}</span>
              <button
                onClick={() => dispatch(clearError())}
                className="text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-700/50 rounded-full p-2 transition"
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {analyticsLoading ? (
          <div className="text-center py-8 sm:py-12">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <span className="text-text-main-light dark:text-text-main-dark">
              Loading...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
            {currentUser?.role === "admin" && post && (
              <motion.div
                variants={itemVariants}
                className="p-4 sm:p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />{" "}
                  Post Insights
                </h3>
                <div className="space-y-2 text-text-main-light dark:text-text-main-dark">
                  <p className="text-sm sm:text-base">
                    <span className="font-medium">Post Title:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {post.title || "N/A"}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base">
                    <span className="font-medium">Your Read Time:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatTime(sessionTime || 0)}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base">
                    <span className="font-medium">Total Time Spent:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatTime(post.timeSpent || 0)}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base">
                    <span className="font-medium">Estimated Impressions:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {Math.floor((post.timeSpent || 0) / IMPRESSION_INTERVAL)}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base">
                    <span className="font-medium">
                      Ad Earnings (CPM $2.50):
                    </span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      ${calculateAdEarnings(post.timeSpent || 0)}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              className="p-4 sm:p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />{" "}
                Traffic Overview
              </h3>
              <div className="space-y-2 text-text-main-light dark:text-text-main-dark">
                <p className="text-sm sm:text-base">
                  <span className="font-medium">Total Visits:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.totalVisits || 0}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  <span className="font-medium">Total Time Spent:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {totalHours} hours
                  </span>
                </p>

                <p className="text-sm sm:text-base">
                  <span className="font-medium">Unique Users:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.uniqueUsersCount || 0}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  <span className="font-medium">Unique Posts:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.uniquePostsCount || 0}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  <span className="font-medium">Guest Users:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {guestUsersCount || 0}
                  </span>
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 sm:p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />{" "}
                Traffic Distribution
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background-light)",
                      border: "1px solid var(--gray-200)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 sm:p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />{" "}
                Top Posts
              </h3>
              {analytics.topPosts?.length > 0 ? (
                <ul className="space-y-3">
                  {analytics.topPosts.map((post) => (
                    <motion.li
                      key={post.postId}
                      variants={itemVariants}
                      className="border-l-4 border-blue-500 pl-4"
                    >
                      <span className="font-medium text-text-main-light dark:text-text-main-dark">
                        {post.title}
                      </span>
                      <p className="text-sm text-text-main-light dark:text-text-main-dark">
                        Visits: {post.visitCount || 0}
                      </p>
                      <p className="text-sm text-text-main-light dark:text-text-main-dark">
                        Time Spent:{" "}
                        {(post.totalTimeSpent
                          ? post.totalTimeSpent / 60
                          : 0
                        ).toFixed(2)}{" "}
                        minutes
                      </p>
                      <p className="text-sm text-text-main-light dark:text-text-main-dark">
                        Ad Earnings: $
                        {calculateAdEarnings(post.totalTimeSpent || 0)}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-main-light dark:text-text-main-dark">
                  No data available
                </p>
              )}
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-4 sm:p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-text-main-light dark:text-text-main-dark">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />{" "}
                Top Active Users
              </h3>
              {Array.isArray(analytics.topUsers) &&
              analytics.topUsers.length > 0 ? (
                <ul className="space-y-3">
                  {analytics.topUsers.map((user, index) =>
                    user?._id ? (
                      <motion.li
                        key={user._id || index}
                        variants={itemVariants}
                        className="border-l-4 border-green-500 pl-4"
                      >
                        <span className="font-medium text-text-main-light dark:text-text-main-dark">
                          {user.name || "Unknown"} ({user.email || "No email"})
                        </span>
                        <p className="text-sm text-text-main-light dark:text-text-main-dark">
                          Visits: {user.totalVisits || 0}
                        </p>
                        <p className="text-sm text-text-main-light dark:text-text-main-dark">
                          Time Spent:{" "}
                          {(user.totalTimeSpent
                            ? user.totalTimeSpent / 60
                            : 0
                          ).toFixed(2)}{" "}
                          minutes
                        </p>
                      </motion.li>
                    ) : null
                  )}
                </ul>
              ) : (
                <p className="text-text-main-light dark:text-text-main-dark">
                  No data available
                </p>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Insights;
