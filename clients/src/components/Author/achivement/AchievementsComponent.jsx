import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserAchievements,
  calculateUserAchievements,
} from "../../../store/achievementSlice";
import toast, { Toaster } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// AchievementsComponent
// Displays a user's badges, metrics, and author profile.
// Props:
//   • userId   – ID used to fetch / calculate achievements
//   • readOnly – hides the "Calculate" button (e.g. when viewing another user)
//   • author   – optional object: { avatar, name, bio, profession, location, joiningDate }
// ─────────────────────────────────────────────────────────────────────────────

// ── Badge emoji map – extend this as new badge types are added ──────────────
const BADGE_ICONS = {
  default: "🏆",
  // "Top Writer": "✍️",
  // "Trendsetter": "🔥",
  // "Verified":   "✅",
};

const getBadgeIcon = (badge) => BADGE_ICONS[badge] ?? BADGE_ICONS.default;

// ── Metric card config – add/remove metrics here without touching JSX ────────
const METRIC_CONFIG = [
  { key: "totalViews", label: "Total Views", icon: "👁️", suffix: "" },
  { key: "totalLikes", label: "Total Likes", icon: "❤️", suffix: "" },
  { key: "totalComments", label: "Total Comments", icon: "💬", suffix: "" },
  { key: "followerCount", label: "Followers", icon: "👥", suffix: "" },
  { key: "subscriptionCount", label: "Subscriptions", icon: "🔔", suffix: "" },
  {
    key: "longestPostTime",
    label: "Longest Post Time",
    icon: "⏱️",
    suffix: " min",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const AchievementsComponent = ({ userId, readOnly, author }) => {
  const dispatch = useDispatch();

  // Local toggle to re-trigger the fetch after a calculation
  const [refresh, setRefresh] = useState(false);

  // ── Redux state ────────────────────────────────────────────────────────────
  const {
    badges = [],
    metrics = null,
    loading = false,
    error = null,
  } = useSelector((state) => state.achievements || {});

  // ── Fetch achievements whenever userId or refresh changes ──────────────────
  useEffect(() => {
    if (userId) {
      dispatch(fetchUserAchievements(userId));
    }
  }, [dispatch, userId, refresh]);

  // ── Show error toast whenever Redux error state changes ────────────────────
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load achievements: ${error}`, {
        id: "achievements-error",
      });
    }
  }, [error]);

  // ── Trigger achievement calculation, then refresh list ─────────────────────
  const handleCalculateAchievements = async () => {
    if (!userId) return;

    const loadingToast = toast.loading("Calculating your achievements…");

    try {
      await dispatch(calculateUserAchievements(userId)).unwrap();
      setRefresh((prev) => !prev);
      toast.success("Achievements updated! 🎉", { id: loadingToast });
    } catch (err) {
      // TODO: surface granular server error messages when API is updated
      toast.error("Could not calculate achievements. Try again.", {
        id: loadingToast,
      });
    }
  };

  // ── Date formatter – centralised so locale can be changed in one place ─────
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global toast container – position / styling can be adjusted here ── */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            background: "#1e1b4b",
            color: "#e0e7ff",
            fontFamily: "'Sora', sans-serif",
            fontSize: "14px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.25)",
          },
          success: { iconTheme: { primary: "#818cf8", secondary: "#1e1b4b" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#1e1b4b" } },
        }}
      />

      {/* ── Page wrapper ───────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-4 sm:p-8 font-['Sora',sans-serif]">
        {/* ── Card container ─────────────────────────────────────────────────── */}
        <div className="w-full max-w-4xl mx-auto">
          {/* ── Author profile card ──────────────────────────────────────────── */}
          {author && (
            <div className="relative mb-6 rounded-2xl overflow-hidden border border-indigo-500/20 bg-white/5 backdrop-blur-xl shadow-xl">
              {/* Decorative gradient band at top */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={author.avatar}
                    alt={`${author.name}'s avatar`}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-500/40 shadow-lg shadow-indigo-500/30"
                  />
                  {/* Online indicator – TODO: wire to real presence status */}
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>

                {/* Info */}
                <div className="text-center sm:text-left space-y-1 flex-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {author.name}
                  </h3>
                  <p className="text-indigo-300 text-sm italic">
                    {author.bio || "No bio available"}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    {author.profession && (
                      <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
                        {author.profession}
                      </span>
                    )}
                    {author.location && (
                      <span className="px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-medium">
                        📍 {author.location}
                      </span>
                    )}
                  </div>
                  {author.joiningDate && (
                    <p className="text-slate-400 text-xs pt-1">
                      Member since {formatDate(author.joiningDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Main achievements card ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="p-6 sm:p-8 border-b border-white/10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-center tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {readOnly
                    ? `${author?.name || "Author"}'s Achievements`
                    : "Your Achievements"}
                </span>
              </h2>
              <p className="text-center text-slate-400 text-sm mt-2">
                {readOnly
                  ? "Viewing earned badges & stats"
                  : "Track your progress and milestones"}
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-10">
              {/* ── Loading spinner ─────────────────────────────────────────── */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-indigo-300 text-sm font-medium animate-pulse">
                    Loading achievements…
                  </p>
                </div>
              )}

              {/* ── Error banner (toast already shown; this is a fallback) ───── */}
              {/* TODO: Replace with inline retry button once retry thunk is added */}
              {error && !loading && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Calculate button (owner view only) ───────────────────────── */}
              {!readOnly && (
                <div className="flex justify-center">
                  <button
                    onClick={handleCalculateAchievements}
                    disabled={loading}
                    className="
                      relative inline-flex items-center gap-2
                      px-8 py-3 rounded-full
                      bg-gradient-to-r from-indigo-600 to-purple-600
                      hover:from-indigo-500 hover:to-purple-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white font-bold text-sm tracking-wide
                      shadow-lg shadow-indigo-500/30
                      transition-all duration-300
                      hover:scale-105 hover:shadow-indigo-500/50
                      active:scale-95
                    "
                  >
                    {/* TODO: Replace emoji with a proper SVG icon once icon lib is added */}
                    <span>✨</span>
                    Calculate Achievements
                  </button>
                </div>
              )}

              {/* ── Badges grid ──────────────────────────────────────────────── */}
              {!loading && (
                <section>
                  <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <span>🎖️</span> Badges
                    <span className="ml-auto text-xs font-normal text-slate-500">
                      {badges.length} earned
                    </span>
                  </h3>

                  {badges.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {badges.map((badge, index) => (
                        <div
                          key={index}
                          className="
                            group flex items-center gap-3 p-4 rounded-xl
                            bg-gradient-to-br from-indigo-500/10 to-purple-500/10
                            border border-indigo-500/20
                            hover:border-indigo-400/50 hover:from-indigo-500/20 hover:to-purple-500/20
                            transition-all duration-300 hover:scale-[1.03]
                            cursor-default
                          "
                        >
                          {/* Badge icon */}
                          <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                            {getBadgeIcon(badge)}
                          </span>
                          <span className="font-semibold text-indigo-100 text-sm leading-snug">
                            {badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty state – shown when no badges yet */
                    <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-dashed border-white/10">
                      <span className="text-4xl opacity-40">🏅</span>
                      <p className="text-slate-500 italic text-sm">
                        No badges earned yet. Keep going!
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* ── Metrics grid ─────────────────────────────────────────────── */}
              {metrics && !loading && (
                <section>
                  <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <span>📊</span> Metrics
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {METRIC_CONFIG.map(({ key, label, icon, suffix }) => (
                      <div
                        key={key}
                        className="
                          p-5 rounded-xl
                          bg-gradient-to-br from-white/5 to-white/[0.02]
                          border border-white/10
                          hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10
                          transition-all duration-300
                          group
                        "
                      >
                        <p className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
                          <span>{icon}</span>
                          {label}
                        </p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-indigo-300 group-hover:text-indigo-200 transition-colors duration-200 tabular-nums">
                          {/* TODO: add compact number formatting (e.g. 1.2k) for large values */}
                          {(metrics[key] ?? 0).toLocaleString()}
                          {suffix}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AchievementsComponent;
