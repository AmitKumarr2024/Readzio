import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserAchievements,
  calculateUserAchievements,
} from "../../../store/achievementSlice";
import { toast } from "react-hot-toast";
import {
  Trophy,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Users,
  Bell,
  Clock,
  MapPin,
  Briefcase,
  Calendar,
  Award,
  Star,
  Zap,
  BarChart2,
} from "lucide-react";

// ─── Badge Icon Map ────────────────────────────────────────────────────────────
// Maps badge name keywords to a relevant icon + color scheme
// Add more entries here as new badge types are introduced
const BADGE_STYLES = [
  {
    keyword: "view",
    icon: Eye,
    color:
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  {
    keyword: "like",
    icon: Heart,
    color:
      "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  },
  {
    keyword: "comment",
    icon: MessageCircle,
    color:
      "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  },
  {
    keyword: "follow",
    icon: Users,
    color:
      "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    keyword: "star",
    icon: Star,
    color:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  {
    keyword: "speed",
    icon: Zap,
    color:
      "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  },
];

// Resolves which icon/color to apply based on badge name content
function getBadgeStyle(badgeName) {
  const lower = badgeName.toLowerCase();
  const match = BADGE_STYLES.find(({ keyword }) => lower.includes(keyword));
  return match
    ? { Icon: match.icon, color: match.color }
    : {
        Icon: Trophy,
        color:
          "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
      };
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
// Displays a single stat with icon, label, and formatted value
function MetricCard({ label, value, icon: Icon, iconColor, suffix = "" }) {
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
                 p-5 flex items-center gap-4 hover:border-indigo-300 dark:hover:border-indigo-700
                 transition-colors duration-200 group"
    >
      {/* Colored icon circle */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${iconColor} transition-transform duration-200 group-hover:scale-110`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {(value || 0).toLocaleString()}
          {suffix && (
            <span className="text-sm font-normal text-gray-400 ml-1">
              {suffix}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Badge Card ───────────────────────────────────────────────────────────────
// Individual achievement badge with icon derived from badge name
function BadgeCard({ badge }) {
  const { Icon, color } = getBadgeStyle(badge);

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
                 p-4 flex items-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-700
                 transition-all duration-200 group hover:shadow-sm"
    >
      {/* Badge icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}
                    transition-transform duration-200 group-hover:scale-110`}
      >
        <Icon className="w-4 h-4" />
      </div>

      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">
        {badge}
      </span>
    </div>
  );
}

// ─── Author Profile Card ───────────────────────────────────────────────────────
// Shows avatar, name, bio, profession, location, join date
function AuthorCard({ author }) {
  if (!author) return null;

  const joinDate = author.joiningDate
    ? new Date(author.joiningDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
                 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={author.avatar}
          alt={`${author.name}'s avatar`}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-700"
        />
        {/* Online indicator dot */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
      </div>

      {/* Author info */}
      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {author.name}
        </h3>

        {author.bio && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3 leading-relaxed">
            {author.bio}
          </p>
        )}

        {/* Meta row: profession, location, join date */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          {author.profession && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {author.profession}
            </span>
          )}
          {author.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {author.location}
            </span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {joinDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AchievementsComponent = ({ userId, readOnly, author }) => {
  const dispatch = useDispatch();

  // Local toggle to trigger re-fetch after calculate
  const [refresh, setRefresh] = useState(false);

  // Redux state — safe defaults to avoid undefined crashes
  const {
    badges = [],
    metrics = null,
    loading = false,
    error = null,
  } = useSelector((state) => state.achievements || {});

  // Fetch achievements when userId or refresh toggle changes
  useEffect(() => {
    if (userId) {
      dispatch(fetchUserAchievements(userId));
    }
  }, [dispatch, userId, refresh]);

  // Calculate achievements, then re-fetch to show updated badges
  const handleCalculate = async () => {
    if (!userId) return;
    try {
      await dispatch(calculateUserAchievements(userId)).unwrap();
      setRefresh((prev) => !prev); // triggers useEffect re-fetch
      toast.success("Achievements calculated!");
    } catch {
      toast.error("Failed to calculate achievements.");
    }
  };

  // ── Metrics config — each card's label, key, icon & color ─────────────────
  const METRIC_CARDS = [
    {
      label: "Total Views",
      key: "totalViews",
      icon: Eye,
      iconColor:
        "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    },
    {
      label: "Total Likes",
      key: "totalLikes",
      icon: Heart,
      iconColor:
        "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
    },
    {
      label: "Total Comments",
      key: "totalComments",
      icon: MessageCircle,
      iconColor:
        "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
    },
    {
      label: "Followers",
      key: "followerCount",
      icon: Users,
      iconColor:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
    {
      label: "Subscriptions",
      key: "subscriptionCount",
      icon: Bell,
      iconColor:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    },
    {
      label: "Longest Post Time",
      key: "longestPostTime",
      icon: Clock,
      iconColor:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
      suffix: "min",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {readOnly
                ? `${author?.name || "Author"}'s Achievements`
                : "Your Achievements"}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
            {badges.length} badge{badges.length !== 1 ? "s" : ""} earned
          </p>
        </div>

        {/* ── Author profile card ──────────────────────────────────────────── */}
        <AuthorCard author={author} />

        {/* ── Calculate button (owner only, not readOnly) ──────────────────── */}
        {!readOnly && (
          <div className="mb-6">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                         bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white
                         transition-all shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Calculate Achievements
            </button>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                          text-sm text-red-600 dark:text-red-400"
          >
            {typeof error === "string"
              ? error
              : "Something went wrong loading achievements."}
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Badges section ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Badges
              </h2>
              {/* Badge count pill */}
              {badges.length > 0 && (
                <span
                  className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                                 bg-amber-50 text-amber-700 border border-amber-200
                                 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                >
                  {badges.length} earned
                </span>
              )}
            </div>

            {/* Badge grid or empty state */}
            {badges.length > 0 ? (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {badges.map((badge, index) => (
                  <BadgeCard key={index} badge={badge} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Trophy className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No badges yet
                </p>
                {!readOnly && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Click "Calculate Achievements" to check your progress
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Metrics section ──────────────────────────────────────────────── */}
        {!loading && metrics && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Metrics
              </h2>
            </div>

            {/* Metric cards grid */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {METRIC_CARDS.map(({ label, key, icon, iconColor, suffix }) => (
                <MetricCard
                  key={key}
                  label={label}
                  value={metrics[key]}
                  icon={icon}
                  iconColor={iconColor}
                  suffix={suffix}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── No metrics fallback (metrics null after load) ─────────────────── */}
        {!loading && !metrics && badges.length === 0 && !error && (
          <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            No achievement data available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsComponent;
