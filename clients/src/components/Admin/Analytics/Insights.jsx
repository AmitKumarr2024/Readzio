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
import {
  Loader2,
  BarChart,
  Users,
  Clock,
  FileText,
  TrendingUp,
  Activity,
  MapPin,
  DollarSign,
  Eye,
  Calendar,
} from "lucide-react";
import { IoCloseCircleOutline } from "react-icons/io5";
import { FiMaximize2 } from "react-icons/fi";
import CountUp from "react-countup";
import ErrorBoundary from "../../Post/ErrorBoundary";
import { selectSocketState, addGuestVisit } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";
import io from "socket.io-client";
import { debounce } from "lodash";
import RecentGuestVisits from "./RecentGuestVisits";

const AdminLocationDashboard = lazy(() =>
  import("../../location/AdminLocationDashboard")
);

const CPM_RATE = 0.7;
const IMPRESSION_INTERVAL = 15;

const isDev = process.env.NODE_ENV === "development";

const StatModal = ({ type, count, onClose }) => {
  const modalVariants = {
    initial: { scale: 0.8, opacity: 0, y: 50 },
    animate: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.5,
      },
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      y: 50,
      transition: { duration: 0.3 },
    },
  };

  const titles = {
    online: "Online Users",
    offline: "Offline Users",
    total: "Registered Users",
    guest: "Guest Visitors",
  };

  const gradients = {
    online: "from-emerald-400 via-teal-500 to-cyan-600",
    offline: "from-slate-400 via-gray-500 to-zinc-600",
    total: "from-blue-400 via-purple-500 to-indigo-600",
    guest: "from-pink-400 via-rose-500 to-red-500",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          className={`relative p-8 sm:p-12 rounded-3xl text-center w-full max-w-2xl bg-gradient-to-br ${gradients[type]} shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
          >
            <IoCloseCircleOutline size={32} />
          </button>

          <div className="text-white/90 mb-4">
            <h2 className="text-2xl sm:text-4xl font-bold mb-2">
              {titles[type]}
            </h2>
            <div className="w-20 h-1 bg-white/30 rounded-full mx-auto"></div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="text-white mb-4"
          >
            <CountUp
              end={count}
              duration={1}
              className="text-6xl sm:text-8xl font-black"
            />
          </motion.div>

          <div className="text-white/70 text-sm sm:text-base">
            Real-time analytics data
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

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

const StatCard = ({ type, count, icon: Icon, color, label, onClick }) => {
  const gradients = {
    green:
      "from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800",
    gray: "from-slate-50 to-gray-100 dark:from-slate-800/20 dark:to-gray-800/20 border-slate-200 dark:border-slate-700",
    blue: "from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800",
    pink: "from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800",
  };

  const iconColors = {
    green: "text-emerald-600 dark:text-emerald-400",
    gray: "text-slate-600 dark:text-slate-400",
    blue: "text-blue-600 dark:text-blue-400",
    pink: "text-pink-600 dark:text-pink-400",
  };

  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        y: -4,
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${gradients[color]} border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group`}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <Icon className="w-full h-full" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-white/50 dark:bg-white/10 ${iconColors[color]} group-hover:scale-110 transition-transform duration-200`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2 rounded-lg ${iconColors[color]} hover:bg-white/30 dark:hover:bg-white/10 transition-colors duration-200`}
          >
            <FiMaximize2 className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            {label.split("•")[0].trim()}
          </h3>
          <div className={`text-3xl font-black ${iconColors[color]}`}>
            <CountUp end={count} duration={1} />
          </div>
          {label.includes("•") && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {label.split("•")[1]?.trim()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const InsightCard = ({ title, icon: Icon, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-background-light dark:bg-background-dark rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 ${className}`}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

const Insights = () => {
  const dispatch = useDispatch();
  const {
    admin: { analytics = {}, analyticsLoading, analyticsError, totalUsers = 0 },
    socket: { onlineUsersCount = 0, guestVisits = [] },
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
  const uniqueGuestCount = useMemo(() => {
    const count = new Set(guestVisits.map((g) => g.guestId)).size;
    return count;
  }, [guestVisits]);

  const isValidDateRange = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return true;
    return new Date(dateRange.startDate) <= new Date(dateRange.endDate);
  }, [dateRange]);

  const pieData = useMemo(() => {
    const data = [
      { name: "Total Visits", value: analytics.traffic?.totalVisits || 0 },
      { name: "Unique Users", value: analytics.traffic?.uniqueUsersCount || 0 },
      { name: "Unique Posts", value: analytics.traffic?.uniquePostsCount || 0 },
      { name: "Guest Users", value: uniqueGuestCount || 0 },
    ];
    return data;
  }, [analytics.traffic, uniqueGuestCount]);

  const COLORS = ["#5b21b6", "#4ade80", "#facc15", "#ff6b6b"];

  const calculateAdEarnings = (totalTimeSpent) => {
    const impressions = Math.floor(totalTimeSpent / IMPRESSION_INTERVAL);
    return ((impressions * CPM_RATE) / 1000).toFixed(2);
  };

  useEffect(() => {
    if (currentUser && currentUser._id) {
      return;
    }

    const guestId = `guest-${Date.now()}`;
    const guestData = {
      guestId,
      ip: "127.0.0.1",
      location: "IN",
      visitCount: 1,
      lastVisit: new Date().toISOString(),
      userAgent: navigator.userAgent || "Unknown",
    };
    dispatch(addGuestVisit(guestData));
  }, [dispatch, currentUser]);

  useEffect(() => {
    dispatch(
      fetchSiteAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
    );
    dispatch(getAllUsers({ page: 1, limit: 10 }));
  }, [dispatch, dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const totalTimeSpent = analytics?.traffic?.totalTimeSpent ?? 0;
  const totalHours = (totalTimeSpent / 3600).toFixed(1);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-100/40 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/40 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Real-time insights and comprehensive analytics
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              type: "online",
              count: onlineUsersCount,
              icon: Activity,
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
              label: "Registered Users",
            },
            {
              type: "guest",
              count: uniqueGuestCount,
              icon: MapPin,
              color: "pink",
              label:
                guestVisits.length > 0
                  ? `Guest Visitors • from ${guestVisits[0].location || "—"} ${
                      guestVisits[0].lastVisit
                        ? formatDistanceToNow(
                            new Date(guestVisits[0].lastVisit),
                            { addSuffix: true }
                          )
                        : "just now"
                    }`
                  : "Guest Visitors",
            },
          ].map((stat) => (
            <StatCard
              key={stat.type}
              {...stat}
              onClick={() => setModalType(stat.type)}
            />
          ))}
        </motion.div>

        {/* Modal */}
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
                  : uniqueGuestCount
              }
              onClose={() => setModalType(null)}
            />
          )}
        </AnimatePresence>

        {/* Location Dashboard */}
        <motion.div
          variants={itemVariants}
          className="bg-background-light dark:bg-background-dark rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
            <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" /> All
            User Locations
          </h2>
          <ErrorBoundary
            fallback={
              <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-center">
                Failed to load map
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              }
            >
              <AdminLocationDashboard />
            </Suspense>
          </ErrorBoundary>
        </motion.div>

        {/* Site Insights */}
        <motion.div
          variants={itemVariants}
          className="bg-background-light dark:bg-background-dark rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
            <BarChart className="w-8 h-8 text-blue-600 dark:text-blue-400" />{" "}
            Site Insights
          </h2>

          {/* Date Range Filter */}
          <motion.div
            variants={itemVariants}
            className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
                Date Range Filter
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-full sm:w-auto"
              />
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-full sm:w-auto"
              />
              {!isValidDateRange && (
                <p className="text-red-500 text-sm">
                  Start date must be before or equal to end date
                </p>
              )}
            </div>
          </motion.div>

          {/* Error Display */}
          <AnimatePresence>
            {analyticsError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg flex justify-between items-center"
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

          {/* Loading State */}
          {analyticsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
              <span className="text-text-main-light dark:text-text-main-dark">
                Loading analytics...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Post Insights - Only for Admin */}
              {currentUser?.role === "admin" && post && (
                <motion.div variants={itemVariants}>
                  <InsightCard title="Current Post Insights" icon={FileText}>
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <h4 className="font-medium text-text-main-light dark:text-text-main-dark mb-2">
                          Post Title
                        </h4>
                        <p className="text-blue-600 dark:text-blue-400 font-bold">
                          {post.title || "N/A"}
                        </p>
                      </div>

                      {[
                        {
                          label: "Your Read Time",
                          value: formatTime(sessionTime || 0),
                          icon: Clock,
                        },
                        {
                          label: "Total Time Spent",
                          value: formatTime(post.timeSpent || 0),
                          icon: Clock,
                        },
                        {
                          label: "Estimated Impressions",
                          value: Math.floor(
                            (post.timeSpent || 0) / IMPRESSION_INTERVAL
                          ),
                          icon: Eye,
                        },
                        {
                          label: "Ad Earnings",
                          value: `$${calculateAdEarnings(post.timeSpent || 0)}`,
                          icon: DollarSign,
                        },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                              {item.label}
                            </span>
                          </div>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                </motion.div>
              )}

              {/* Traffic Overview */}
              <motion.div variants={itemVariants}>
                <InsightCard title="Traffic Overview" icon={TrendingUp}>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Total Visits",
                        value:
                          analytics.traffic?.totalVisits?.toLocaleString() ||
                          "0",
                        icon: Eye,
                      },
                      {
                        label: "Total Time Spent",
                        value: `${totalHours} hours`,
                        icon: Clock,
                      },
                      {
                        label: "Unique Users",
                        value:
                          analytics.traffic?.uniqueUsersCount?.toLocaleString() ||
                          "0",
                        icon: Users,
                      },
                      {
                        label: "Unique Posts",
                        value:
                          analytics.traffic?.uniquePostsCount?.toLocaleString() ||
                          "0",
                        icon: FileText,
                      },
                      {
                        label: "Guest Users",
                        value: uniqueGuestCount?.toLocaleString() || "0",
                        icon: MapPin,
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </InsightCard>
              </motion.div>

              {/* Traffic Distribution Chart */}
              <motion.div variants={itemVariants}>
                <InsightCard title="Traffic Distribution" icon={BarChart}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${(percent * 100).toFixed(0)}%`
                          }
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
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </InsightCard>
              </motion.div>

              {/* Top Posts */}
              <motion.div variants={itemVariants}>
                <InsightCard
                  title="Top Performing Posts"
                  icon={FileText}
                  className="h-full"
                >
                  {analytics.topPosts?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topPosts.map((post, index) => (
                        <motion.div
                          key={post.postId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-text-main-light dark:text-text-main-dark truncate">
                              {post.title}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <div>
                              <span className="block font-medium">
                                {post.visitCount || 0}
                              </span>
                              <span className="text-gray-400">visits</span>
                            </div>
                            <div>
                              <span className="block font-medium">
                                {(post.totalTimeSpent
                                  ? post.totalTimeSpent / 60
                                  : 0
                                ).toFixed(2)}
                                m
                              </span>
                              <span className="text-gray-400">time</span>
                            </div>
                            <div>
                              <span className="block font-medium">
                                ${calculateAdEarnings(post.totalTimeSpent || 0)}
                              </span>
                              <span className="text-gray-400">revenue</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-main-light dark:text-text-main-dark text-center py-8">
                      No data available
                    </p>
                  )}
                </InsightCard>
              </motion.div>

              {/* Top Users */}
              <motion.div variants={itemVariants}>
                <InsightCard
                  title="Most Active Users"
                  icon={Users}
                  className="h-full"
                >
                  {Array.isArray(analytics.topUsers) &&
                  analytics.topUsers.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topUsers.map((user, index) =>
                        user?._id ? (
                          <motion.div
                            key={user._id || index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                {user.name?.charAt(0) || "U"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-text-main-light dark:text-text-main-dark truncate">
                                  {user.name || "Unknown"}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {user.email || "No email"}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 ml-2">
                                #{index + 1}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300">
                              <div>
                                <span className="block font-medium">
                                  {user.totalVisits || 0}
                                </span>
                                <span className="text-gray-400">
                                  total visits
                                </span>
                              </div>
                              <div>
                                <span className="block font-medium">
                                  {(user.totalTimeSpent
                                    ? user.totalTimeSpent / 60
                                    : 0
                                  ).toFixed(2)}
                                  m
                                </span>
                                <span className="text-gray-400">
                                  time spent
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <p className="text-text-main-light dark:text-text-main-dark text-center py-8">
                      No data available
                    </p>
                  )}
                </InsightCard>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* Guest Visit Logs */}
        <motion.div
          variants={itemVariants}
          className="bg-background-light dark:bg-background-dark rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
            <Users className="w-8 h-8 text-red-600 dark:text-red-400" /> Guest
            Visit Logs
          </h2>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6">
            <RecentGuestVisits />
          </div>
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {analyticsLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
            >
              <div className="bg-background-light dark:bg-background-dark rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-text-main-light dark:text-text-main-dark font-medium">
                    Loading analytics...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Insights;
