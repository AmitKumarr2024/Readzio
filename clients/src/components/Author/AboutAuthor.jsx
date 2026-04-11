import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getUserById, fetchUserActivity } from "../../store/userSlice";
import { fetchUserPosts } from "../../store/postSlice";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  fetchFollowers,
  fetchFollowing,
} from "../../store/followSlice";
import { fetchUserAchievements } from "../../store/achievementSlice";
import { logout } from "../../store/authSlice";
import { toast } from "react-hot-toast";
import {
  UserCheck,
  UserPlus,
  LogOut,
  Pencil,
  FileText,
  Users,
  Award,
  MapPin,
  Briefcase,
  Calendar,
  Eye,
  ChevronLeft,
  Trophy,
  Star,
  AlertTriangle,
} from "lucide-react";

// ─── Post Card Skeleton ────────────────────────────────────────────────────────
// Pulsing placeholder while posts are loading
const PostCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800" />
    <div className="p-5 space-y-3">
      <div className="h-5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/60 rounded-lg" />
      <div className="h-4 w-2/3 bg-gray-50 dark:bg-gray-800/60 rounded-lg" />
    </div>
  </div>
);

// ─── Profile Header Skeleton ──────────────────────────────────────────────────
// Pulsing placeholder while author profile data is loading
const ProfileSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 animate-pulse">
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="w-24 h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-3 w-full">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="flex gap-6 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-14 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Stat Item ─────────────────────────────────────────────────────────────────
// A single stat figure with icon and label used in the profile stats bar
function StatItem({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col items-center sm:items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
          {(value || 0).toLocaleString()}
        </span>
      </div>
      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────
// Clickable article card rendered in the Posts tab grid
function PostCard({ post, onClick }) {
  return (
    <article
      onClick={onClick}
      className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
                 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md
                 overflow-hidden transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail — zooms slightly on hover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Views badge overlaid on top-left corner */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                        bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700
                        text-gray-700 dark:text-gray-300"
        >
          <Eye className="w-3 h-3" />
          {(post.views || 0).toLocaleString()}
        </div>
      </div>

      {/* Post info */}
      <div className="p-5 flex-1 flex flex-col">
        <h4
          className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug
                       group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
        >
          {post.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed flex-1">
          {post.excerpt || "Click to read the full article."}
        </p>

        {/* Optional category pill */}
        {post.category && (
          <div className="mt-3">
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium
                             bg-indigo-50 text-indigo-700 border border-indigo-100
                             dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"
            >
              {post.category}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Badge Card ────────────────────────────────────────────────────────────────
// Individual achievement badge shown in the About tab
function BadgeCard({ badge }) {
  return (
    <div
      className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl
                    border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700
                    transition-all duration-200 group"
    >
      <div
        className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0
                      group-hover:scale-110 transition-transform duration-200"
      >
        <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      {/* Support both plain string badges and object badges with a .name field */}
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {typeof badge === "string" ? badge : badge?.name || "Badge"}
      </span>
    </div>
  );
}

// ─── Tab Button ────────────────────────────────────────────────────────────────
// Styled tab switcher button used in the Posts / About tab row
function TabBtn({ label, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${
                    active
                      ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-700"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const AboutAuthor = ({ authorId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ── Redux selectors ──────────────────────────────────────────────────────
  const { selectedUser, selectedUserLoading, selectedUserError } = useSelector(
    (state) => state.user,
  );
  const {
    posts,
    totalPosts,
    loading: postsLoading,
  } = useSelector((state) => state.post);

  // FIX: followSlice stores loading at the top level (state.follow.loading),
  // not nested inside a sub-object — pull it correctly to avoid undefined
  const { loading: followLoading } = useSelector((state) => state.follow);

  // FIX: the logged-in user's ID comes from authSlice, not followSlice.
  // followSlice.userId is only set when explicitly dispatched via setUserId action.
  const { user: authUser } = useSelector((state) => state.auth);

  const { badges = [], loading: achievementsLoading } = useSelector(
    (state) => state.achievements || {},
  );

  // ── Local state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);

  // ── Fetch all data for this author on mount / authorId change ────────────
  useEffect(() => {
    if (!authorId) return;

    dispatch(getUserById(authorId));
    dispatch(fetchUserPosts({ userId: authorId, page: 1, limit: 12 }));
    dispatch(fetchUserActivity(authorId));
    dispatch(fetchUserAchievements(authorId));

    // FIX: fetchFollowers and fetchFollowing thunks now safely accept no
    // arguments because we added `= {}` default to their parameter destructuring
    // in followSlice.js — calling them with no args no longer crashes.
    dispatch(fetchFollowers());
    dispatch(fetchFollowing());

    // Check if the logged-in user is already following this author
    dispatch(getFollowStatus(authorId)).then((res) => {
      setIsFollowing(res.payload?.isFollowing ?? false);
    });
  }, [dispatch, authorId]);

  // ── Follow / Unfollow toggle ─────────────────────────────────────────────
  const handleFollowToggle = async () => {
    const action = isFollowing ? unfollowUser : followUser;
    try {
      await dispatch(action(authorId)).unwrap();
      setIsFollowing((prev) => !prev);
      toast.success(isFollowing ? "Unfollowed" : "Now following!");
    } catch {
      toast.error("Failed to update follow status.");
    }
  };

  const handleEditProfile = () => navigate("/user");

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.success("Logged out");
      navigate("/login");
    } catch {
      toast.error("Logout failed.");
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────
  // followers/following counts come from selectedUser (populated by getUserById)
  // since the follow slice only tracks the *current* user's own follow list
  const followersCount = selectedUser?.followers?.length ?? 0;
  const followingCount = selectedUser?.following?.length ?? 0;
  const postCount = totalPosts || posts.length || 0;

  // FIX: compare authUser._id (from auth slice) to authorId to detect self-view
  const isSelf = authUser?._id?.toString() === authorId?.toString();

  // ── Loading state ────────────────────────────────────────────────────────
  if (selectedUserLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <ProfileSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not-found state ──────────────────────────────────────────────
  if (selectedUserError || !selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Author not found
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
          This profile could not be loaded.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                     border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* ── Profile Header Card ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar with online dot */}
            <div className="relative flex-shrink-0">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-700"
                />
              ) : (
                // Initials fallback — uses first character of name
                <div className="w-24 h-24 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {(selectedUser.name || "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
            </div>

            {/* Info column */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                    {selectedUser.name || "Unknown User"}
                  </h1>
                  {selectedUser.profession && (
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {selectedUser.profession}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-center sm:justify-end gap-2 flex-shrink-0">
                  {isSelf ? (
                    <>
                      <button
                        onClick={handleEditProfile}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                                   border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300
                                   hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                                   text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800
                                   hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
                                  transition-all disabled:opacity-60 disabled:cursor-not-allowed
                                  ${
                                    isFollowing
                                      ? "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                  }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Location + join date */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                {selectedUser.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedUser.location}
                  </span>
                )}
                {selectedUser.joiningDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined{" "}
                    {new Date(selectedUser.joiningDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                      },
                    )}
                  </span>
                )}
              </div>

              {/* Stats bar */}
              <div className="flex justify-center sm:justify-start gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <StatItem label="Articles" value={postCount} icon={FileText} />
                <StatItem
                  label="Followers"
                  value={followersCount}
                  icon={Users}
                />
                <StatItem
                  label="Following"
                  value={followingCount}
                  icon={UserCheck}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bio snippet (shown only if bio exists) ────────────────────── */}
        {selectedUser.bio && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-6 py-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              "{selectedUser.bio}"
            </p>
          </div>
        )}

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit mb-6">
          <TabBtn
            label="Posts"
            active={activeTab === "Posts"}
            onClick={() => setActiveTab("Posts")}
            icon={FileText}
          />
          <TabBtn
            label="About"
            active={activeTab === "About"}
            onClick={() => setActiveTab("About")}
            icon={Award}
          />
        </div>

        {/* ── Posts Tab ────────────────────────────────────────────────── */}
        {activeTab === "Posts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postsLoading ? (
              [...Array(6)].map((_, i) => <PostCardSkeleton key={i} />)
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onClick={() => navigate(`/post/${post.slug}`)}
                />
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No posts yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  This author hasn't published anything yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── About Tab ────────────────────────────────────────────────── */}
        {activeTab === "About" && (
          <div className="space-y-5 max-w-3xl">
            {/* Biography */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Biography
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {selectedUser.bio || "This author hasn't written a bio yet."}
              </p>
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-6 gap-y-2">
                {selectedUser.profession && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedUser.profession}
                  </div>
                )}
                {selectedUser.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedUser.location}
                  </div>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Achievements
                </h3>
                {badges.length > 0 && (
                  <span
                    className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full
                                   bg-amber-50 text-amber-700 border border-amber-200
                                   dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                  >
                    {badges.length} earned
                  </span>
                )}
              </div>

              <div className="p-5">
                {achievementsLoading ? (
                  <div className="flex flex-wrap gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 w-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : badges.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {badges.map((badge, i) => (
                      <BadgeCard key={i} badge={badge} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <Star className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      No badges yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Achievements will appear here once earned.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutAuthor;
