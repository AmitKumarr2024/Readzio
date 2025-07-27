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
import { trackGuestVisit, incrementGuestCount } from "../../../store/guestSlice";
import { selectSocketState, addGuestVisit } from "../../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";
import io from "socket.io-client";

const AdminLocationDashboard = lazy(() =>
  import("../../location/AdminLocationDashboard")
);

const CPM_RATE = 2.5;
const IMPRESSION_INTERVAL = 30;

const RecentGuestVisits = () => {
  const { guestVisits = [] } = useSelector(selectSocketState, shallowEqual);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate guest visit
  const simulateGuest = () => {
    const guestId = `guest-${Date.now()}`;
    dispatch(
      addGuestVisit({
        guestId,
        ip: "127.0.0.1",
        location: "IN",
        visitCount: 1,
        lastVisit: new Date().toISOString(),
        userAgent: navigator.userAgent || "ManualTest/1.0",
      })
    );
    dispatch(incrementGuestCount());
  };

  // Load persisted guest visits from localStorage or API
  useEffect(() => {
    // Check localStorage for persisted guest visits
    const storedVisits = localStorage.getItem("guestVisits");
    if (storedVisits) {
      JSON.parse(storedVisits).forEach((visit) => {
        dispatch(addGuestVisit(visit));
      });
    }

    // Fetch guest visits from backend
    const fetchGuestVisits = async () => {
      try {
        const response = await fetch("/api/admin/guests");
        const data = await response.json();
        data.forEach((visit) => dispatch(addGuestVisit(visit)));
      } catch (error) {
        console.error("Failed to fetch guest visits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuestVisits();
  }, [dispatch]);

  // Persist guest visits to localStorage on update
  useEffect(() => {
    localStorage.setItem("guestVisits", JSON.stringify(guestVisits));
  }, [guestVisits]);

  // Debug guestVisits
  useEffect(() => {
    console.log("[RecentGuestVisits] guestVisits:", guestVisits);
  }, [guestVisits]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full p-6 bg-background-light dark:bg-background-dark rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
          <Users className="w-6 h-6 text-red-600 dark:text-red-400" /> Guest Visit Logs
        </h2>
        <button
          onClick={simulateGuest}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Simulate Guest
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <span>Loading guest visits...</span>
        </div>
      ) : guestVisits.length === 0 ? (
        <div className="text-gray-500 text-center py-6 text-base">
          No guest visits recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-base">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Guest ID</th>
                <th className="px-6 py-3 text-left font-medium">IP</th>
                <th className="px-6 py-3 text-left font-medium">Location</th>
                <th className="px-6 py-3 text-left font-medium">Visits</th>
                <th className="px-6 py-3 text-left font-medium">Last Visit</th>
                <th className="px-6 py-3 text-left font-medium">User Agent</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-200">
              {guestVisits.map((guest) => (
                <tr
                  key={guest.guestId}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-6 py-3 font-mono text-sm">
                    {guest.guestId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-3">{guest.ip || "—"}</td>
                  <td className="px-6 py-3">{guest.location || "—"}</td>
                  <td className="px-6 py-3">{guest.visitCount}</td>
                  <td className="px-6 py-3">
                    {guest.lastVisit
                      ? formatDistanceToNow(new Date(guest.lastVisit), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm truncate max-w-[250px]">
                    {guest.userAgent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

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
    total: "Registered Users",
    guest: "Guest Visitors",
  };
  const bgClasses = {
    online:
      "bg-gradient-to-br from-green-200 dark:from-green-900/50 to-emerald-300 dark:to-emerald-800/50",
    offline:
      "bg-gradient-to-br from-gray-200 dark:from-gray-700/50 to-gray-300 dark:to-gray-600/50",
    total:
      "bg-gradient-to-br from-blue-200 dark:from-blue-900/50 to-indigo-300 dark:to-indigo-800/50",
    guest:
      "bg-gradient-to-br from-pink-200 dark:from-pink-900/50 to-rose-300 dark:to-rose-800/50",
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
        className={`p-8 sm:p-12 rounded-2xl text-center w-full max-w-4xl h-full max-h-[85vh] flex flex-col items-center justify-center ${bgClasses[type]}`}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-6 right-6 text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-gray-600/50 rounded-full p-2 transition"
        >
          <IoCloseCircleOutline size={36} />
        </button>
        <h2 className="text-3xl sm:text-5xl font-bold mb-6 sm:mb-10 text-text-main-light dark:text-text-main-dark">
          {titles[type]}
        </h2>
        <CountUp
          end={count}
          duration={1}
          className="text-7xl sm:text-9xl font-extrabold tracking-tight text-text-main-light dark:text-text-main-dark"
        />
      </motion.div>
    </motion.div>
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

const Insights = () => {
  const dispatch = useDispatch();
  const {
    admin: { analytics = {}, analyticsLoading, analyticsError, totalUsers = 0 },
    socket: { onlineUsersCount = 0, guestUsersCount = 0, guestVisits = [] },
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

  const isValidDateRange = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return true;
    return new Date(dateRange.startDate) <= new Date(dateRange.endDate);
  }, [dateRange]);

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

  // Initialize Socket.IO and handle guest visit updates
  useEffect(() => {
    const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:3000");
    socket.on("guestVisitUpdate", (data) => {
      dispatch(addGuestVisit(data));
      dispatch(incrementGuestCount());
    });

    return () => {
      socket.off("guestVisitUpdate");
      socket.disconnect();
    };
  }, [dispatch]);

  // Fetch analytics and users
  useEffect(() => {
    dispatch(
      fetchSiteAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
    );
    dispatch(getAllUsers({ page: 1, limit: 10 }));
  }, [dispatch, dateRange]);

  // Simulate initial guest visit
  useEffect(() => {
    const guestId = `guest-${Date.now()}`;
    dispatch(trackGuestVisit({ guestId }));
    dispatch(
      addGuestVisit({
        guestId,
        ip: "127.0.0.1",
        location: "IN",
        visitCount: 1,
        lastVisit: new Date().toISOString(),
        userAgent: navigator.userAgent || "Unknown",
      })
    );
    dispatch(incrementGuestCount());
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
  const totalHours = (totalTimeSpent / 3600).toFixed(1);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6 p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark min-h-screen"
    >
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
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
            label: "Registered Users",
          },
          {
            type: "guest",
            count: guestUsersCount,
            icon: Users,
            color: "pink",
            label: (
              <span
                title={
                  guestVisits
                    .slice(0, 3)
                    .map(
                      (g) =>
                        `${g.ip || "?"} (${g.location || "?"}) – ${
                          g.lastVisit
                            ? formatDistanceToNow(new Date(g.lastVisit), {
                                addSuffix: true,
                              })
                            : "N/A"
                        }`
                    )
                    .join("\n")
                }
              >
                {guestVisits.length > 0
                  ? `Guest from ${guestVisits[0].location || "—"} • ${
                      guestVisits[0].lastVisit
                        ? formatDistanceToNow(new Date(guestVisits[0].lastVisit), {
                            addSuffix: true,
                          })
                        : "just now"
                    }`
                  : "Guest Visitors"}
              </span>
            ),
          },
        ].map(({ type, count, icon: Icon, color, label }) => (
          <motion.div
            key={type}
            whileHover={{
              scale: 1.05,
              boxShadow: `0 10px 20px rgba(0, 128, 64, 0.2)`,
            }}
            className={`p-6 rounded-2xl bg-gradient-to-r from-${color}-100 dark:from-${color}-900/50 to-${color}-200 dark:to-${color}-800/50 shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                  <Icon
                    className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`}
                  />{" "}
                  {label}
                </h3>
                <CountUp
                  end={count}
                  duration={1}
                  className="text-5xl font-extrabold text-text-main-light dark:text-text-main-dark"
                />
              </div>
              <button
                onClick={() => setModalType(type)}
                className={`text-${color}-600 dark:text-${color}-400 hover:bg-${color}-300 dark:hover:bg-${color}-700/50 rounded-full p-2 transition`}
              >
                <FiMaximize2 className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

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

      <motion.div
        variants={itemVariants}
        className="bg-background-light dark:bg-background-dark rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" /> All User Locations
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            }
          >
            <AdminLocationDashboard />
          </Suspense>
        </ErrorBoundary>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-background-light dark:bg-background-dark rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
          <BarChart className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Site Insights
        </h2>

        <motion.div
          variants={itemVariants}
          className="mb-6 flex flex-col sm:flex-row gap-4"
        >
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full sm:w-auto"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full sm:w-auto"
          />
          {!isValidDateRange && (
            <p className="text-red-500 text-sm">
              Start date must be before or equal to end date
            </p>
          )}
        </motion.div>

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

        {analyticsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <span className="text-text-main-light dark:text-text-main-dark">
              Loading...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentUser?.role === "admin" && post && (
              <motion.div
                variants={itemVariants}
                className="p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
              >
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Post Insights
                </h3>
                <div className="space-y-3 text-text-main-light dark:text-text-main-dark">
                  <p className="text-base">
                    <span className="font-medium">Post Title:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {post.title || "N/A"}
                    </span>
                  </p>
                  <p className="text-base">
                    <span className="font-medium">Your Read Time:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatTime(sessionTime || 0)}
                    </span>
                  </p>
                  <p className="text-base">
                    <span className="font-medium">Total Time Spent:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatTime(post.timeSpent || 0)}
                    </span>
                  </p>
                  <p className="text-base">
                    <span className="font-medium">Estimated Impressions:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {Math.floor((post.timeSpent || 0) / IMPRESSION_INTERVAL)}
                    </span>
                  </p>
                  <p className="text-base">
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
              className="p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Traffic Overview
              </h3>
              <div className="space-y-3 text-text-main-light dark:text-text-main-dark">
                <p className="text-base">
                  <span className="font-medium">Total Visits:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.totalVisits || 0}
                  </span>
                </p>
                <p className="text-base">
                  <span className="font-medium">Total Time Spent:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {totalHours} hours
                  </span>
                </p>
                <p className="text-base">
                  <span className="font-medium">Unique Users:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.uniqueUsersCount || 0}
                  </span>
                </p>
                <p className="text-base">
                  <span className="font-medium">Unique Posts:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {analytics.traffic?.uniquePostsCount || 0}
                  </span>
                </p>
                <p className="text-base">
                  <span className="font-medium">Guest Users:</span>{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {guestUsersCount || 0}
                  </span>
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                <BarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Traffic Distribution
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
              className="p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Top Posts
              </h3>
              {analytics.topPosts?.length > 0 ? (
                <ul className="space-y-4">
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
              className="p-6 bg-background-light dark:bg-background-dark rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Top Active Users
              </h3>
              {Array.isArray(analytics.topUsers) &&
              analytics.topUsers.length > 0 ? (
                <ul className="space-y-4">
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

      <motion.div
        variants={itemVariants}
        className="bg-background-light dark:bg-background-dark rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-text-main-light dark:text-text-main-dark">
          <Users className="w-8 h-8 text-red-600 dark:text-red-400" /> Guest Visit Logs
        </h2>
        <RecentGuestVisits />
      </motion.div>
    </motion.div>
  );
};

export default Insights;