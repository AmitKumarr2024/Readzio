import React, { useState, useEffect } from "react";
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
import Skeleton from "@/components/Ui/Skeleton";

const AboutAuthor = ({ authorId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux Selectors
  const { selectedUser, selectedUserLoading, selectedUserError } = useSelector(
    (state) => state.user
  );
  const {
    posts,
    totalPosts,
    loading: postsLoading,
  } = useSelector((state) => state.post);
  const { userId, loading: followLoading } = useSelector(
    (state) => state.follow
  );
  const { badges, loading: achievementsLoading } = useSelector(
    (state) => state.achievements
  );

  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    dispatch(getUserById(authorId));
    dispatch(fetchUserPosts({ userId: authorId, page: 1, limit: 10 }));
    dispatch(fetchUserActivity(authorId));
    dispatch(fetchUserAchievements());
    dispatch(fetchFollowers());
    dispatch(fetchFollowing());
    dispatch(getFollowStatus(authorId)).then((res) => {
      setIsFollowing(res.payload?.isFollowing);
    });
  }, [dispatch, authorId]);

  const handleFollowToggle = () => {
    const action = isFollowing ? unfollowUser : followUser;
    dispatch(action(authorId)).then(() => {
      setIsFollowing((prev) => !prev);
    });
  };

  const handleEditProfile = () => navigate("/user");
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (selectedUserLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-32 h-32 bg-gray-200 dark:bg-zinc-800 rounded-full mb-4" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-zinc-900 rounded" />
        </div>
      </div>
    );
  }

  if (selectedUserError || !selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-xl font-medium tracking-tight">
          Author details could not be found.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-indigo-600 font-semibold hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const followersCount = selectedUser.followers?.length || 0;
  const followingCount = selectedUser.following?.length || 0;
  const isSelf = userId?.toString() === authorId?.toString();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <header className="relative bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-zinc-800 mb-12 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="relative w-36 h-36 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="relative w-36 h-36 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-4xl shadow-inner">
                  👤
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                    {selectedUser.name || "Unknown User"}
                  </h1>
                  <p className="text-lg text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase">
                    {selectedUser.profession || "Creative Visionary"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {isSelf ? (
                    <>
                      <button
                        onClick={handleEditProfile}
                        className="btn-custom-outline"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="btn-custom-danger"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`px-8 py-3 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 shadow-lg ${
                        isFollowing
                          ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 dark:shadow-none"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow User"}
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex justify-center md:justify-start items-center gap-12 border-t border-slate-50 dark:border-zinc-800/50 pt-8">
                <div className="group cursor-default">
                  <span className="block text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {totalPosts || posts.length || 0}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Articles
                  </span>
                </div>
                <div className="group cursor-default">
                  <span className="block text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {followersCount}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Followers
                  </span>
                </div>
                <div className="group cursor-default">
                  <span className="block text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {followingCount}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Following
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Custom Tab Switcher */}
        <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-zinc-900 w-fit mx-auto rounded-2xl mb-12">
          {["Posts", "About"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-10 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-500 ease-in-out">
          {activeTab === "Posts" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {postsLoading ? (
                Array(6)
                  .fill()
                  .map((_, i) => <PostCardSkeleton key={i} />)
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <article
                    key={post._id}
                    onClick={() => navigate(`/post/${post.slug}`)}
                    className="group flex flex-col bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {post.thumbnail ? (
                        <img
                          src={post.thumbnail}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center italic text-slate-300">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                        {post.views || 0} Views
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                        {post.excerpt ||
                          "Click to read the full story and explore more details about this topic."}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full py-32 text-center">
                  <p className="text-slate-400 font-medium">
                    This author hasn't published any posts yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "About" && (
            <div className="max-w-3xl mx-auto space-y-10 animate-fadeIn">
              <section className="bg-white dark:bg-zinc-900 p-10 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-sm">
                <h3 className="text-2xl font-black mb-6 dark:text-white tracking-tight">
                  Biography
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                  "
                  {selectedUser.bio ||
                    "Crafting stories and sharing knowledge with the world. Stay tuned for more updates!"}
                  "
                </p>
              </section>

              <section>
                <h4 className="text-xl font-black mb-6 px-4 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Honors & Achievements</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-zinc-800 ml-4"></div>
                </h4>
                <div className="flex flex-wrap gap-4 px-2">
                  {achievementsLoading ? (
                    Array(3)
                      .fill()
                      .map((_, i) => (
                        <div
                          key={i}
                          className="h-12 w-32 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-2xl"
                        />
                      ))
                  ) : badges.length > 0 ? (
                    badges.map((badge, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-6 py-3 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                      >
                        <span className="text-xl">⭐</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-tighter">
                          {badge.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-center py-10 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 text-slate-400">
                      No badges awarded yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for Loading States
const PostCardSkeleton = () => (
  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-100 dark:border-zinc-800 animate-pulse">
    <div className="aspect-[4/3] bg-slate-100 dark:bg-zinc-800 rounded-2xl mb-6" />
    <div className="h-7 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded-lg mb-3" />
    <div className="h-4 w-full bg-slate-50 dark:bg-zinc-800/50 rounded-lg" />
  </div>
);

export default AboutAuthor;
