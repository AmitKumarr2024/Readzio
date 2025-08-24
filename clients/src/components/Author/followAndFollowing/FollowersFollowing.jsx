import React, { useEffect, useState, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFollowers, fetchFollowing } from "../../../store/followSlice";
import ToggleFollowButton from "../Subscribe/ToggleFollowButton";
import { motion, AnimatePresence } from "framer-motion";
import Skeleton from "@/components/Ui/Skeleton";
import { Search, Users, UserCheck, RefreshCw, ChevronDown } from "lucide-react";

const UserCardSkeleton = () => (
  <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton
        width="w-12 h-12 md:w-14 md:h-14"
        height=""
        rounded="rounded-full"
      />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/4" height="h-4" />
        <Skeleton width="w-1/2" height="h-3" />
      </div>
      <Skeleton
        width="w-20 md:w-24"
        height="h-8 md:h-9"
        rounded="rounded-full"
      />
    </div>
  </div>
);

const UserCard = memo(({ user, onFollowSuccess, index }) => {
  if (!user?._id) return null;

  return (
    <motion.div
      key={user._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 transition-all duration-300 group"
      whileHover={{ scale: 1.02, y: -2 }}
      role="listitem"
      aria-label={`User ${user.name || user.username || "Unnamed User"}`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || user.username || "User"}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:border-indigo-400 transition-colors duration-300"
              loading="lazy"
              onError={(e) => (e.target.src = "/fallback-avatar.png")}
            />
          ) : (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
              <span className="text-white font-semibold text-lg md:text-xl">
                {(user.name || user.username || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-semibold text-base md:text-lg truncate">
            {user.name || user.username}
          </p>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 truncate">
            @{user.username || "unknown"}
          </p>
          {user.location && (
            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 truncate mt-1">
              📍 {user.location}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          <ToggleFollowButton
            followUserId={user._id}
            onFollowSuccess={onFollowSuccess}
          />
        </div>
      </div>
    </motion.div>
  );
});

const EmptyState = ({ type, search }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-12 md:py-16"
  >
    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      {type === "followers" ? (
        <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
      ) : (
        <UserCheck className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
      )}
    </div>
    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
      {search ? "No results found" : `No ${type} yet`}
    </h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-md mx-auto">
      {search
        ? `No ${type} match your search criteria`
        : `Start connecting with people to see your ${type} here`}
    </p>
  </motion.div>
);

const ErrorState = ({ error, onRetry, retryCount, type }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-8 md:py-12"
  >
    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
    </div>
    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
      Oops! Something went wrong
    </h3>
    <p className="text-red-600 dark:text-red-400 text-sm md:text-base mb-4 max-w-md mx-auto">
      {error}
    </p>
    {retryCount < 3 && (
      <button
        onClick={() => onRetry(type)}
        className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm md:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    )}
  </motion.div>
);

const LoadMoreButton = ({ onClick, loading, hasMore }) => {
  if (!hasMore) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center mt-6"
    >
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        {loading ? "Loading..." : "Load More"}
      </button>
    </motion.div>
  );
};

const SectionHeader = ({ title, count, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
    <div>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
        {count} {count === 1 ? "person" : "people"}
      </p>
    </div>
  </div>
);

const FollowersFollowing = () => {
  const dispatch = useDispatch();
  const { followers, following } = useSelector((state) => state.follow);

  const [followersErrorRetry, setFollowersErrorRetry] = useState(0);
  const [followingErrorRetry, setFollowingErrorRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("following");

  const {
    list: followersList = [],
    count: followersCount = 0,
    page: followersPage = 1,
    totalPages: followersTotalPages = 1,
    loading: followersLoading = false,
    error: followersError = null,
  } = followers;

  const {
    list: followingList = [],
    count: followingCount = 0,
    page: followingPage = 1,
    totalPages: followingTotalPages = 1,
    loading: followingLoading = false,
    error: followingError = null,
  } = following;

  useEffect(() => {
    dispatch(fetchFollowers({ page: 1, limit: 12 }));
    dispatch(fetchFollowing({ page: 1, limit: 12 }));
  }, [dispatch]);

  const loadMore = useCallback(
    (type) => {
      if (
        type === "followers" &&
        followersPage < followersTotalPages &&
        !followersLoading
      ) {
        dispatch(fetchFollowers({ page: followersPage + 1, limit: 12 }));
      } else if (
        type === "following" &&
        followingPage < followingTotalPages &&
        !followingLoading
      ) {
        dispatch(fetchFollowing({ page: followingPage + 1, limit: 12 }));
      }
    },
    [
      dispatch,
      followersPage,
      followersTotalPages,
      followersLoading,
      followingPage,
      followingTotalPages,
      followingLoading,
    ]
  );

  const handleRetry = useCallback(
    (type) => {
      if (type === "followers" && followersErrorRetry < 3) {
        dispatch(fetchFollowers({ page: followersPage, limit: 12 }));
        setFollowersErrorRetry((prev) => prev + 1);
      } else if (type === "following" && followingErrorRetry < 3) {
        dispatch(fetchFollowing({ page: followingPage, limit: 12 }));
        setFollowingErrorRetry((prev) => prev + 1);
      }
    },
    [
      dispatch,
      followersPage,
      followingPage,
      followersErrorRetry,
      followingErrorRetry,
    ]
  );

  const filteredList = (list) => {
    return list.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const username = user.username?.toLowerCase() || "";
      return (
        name.includes(search.toLowerCase()) ||
        username.includes(search.toLowerCase())
      );
    });
  };

  const TabButton = ({ id, label, count, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex-1 md:flex-none md:px-6 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
          : "bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70"
      }`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            Your Network
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
            Discover and manage your connections
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6 md:mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your network..."
              className="w-full pl-10 pr-4 py-3 md:py-4 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* Tab Navigation - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 md:gap-4 mb-8 md:mb-12 md:justify-center"
        >
          <TabButton
            id="following"
            label="Following"
            count={followingCount}
            isActive={activeTab === "following"}
            onClick={setActiveTab}
          />
          <TabButton
            id="followers"
            label="Followers"
            count={followersCount}
            isActive={activeTab === "followers"}
            onClick={setActiveTab}
          />
        </motion.div>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {/* Following Section */}
          {activeTab === "following" && (
            <motion.div
              key="following"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <SectionHeader
                title="People You Follow"
                count={followingCount}
                icon={UserCheck}
              />

              {followingLoading && followingList.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {Array(8)
                    .fill()
                    .map((_, i) => (
                      <UserCardSkeleton key={i} />
                    ))}
                </div>
              ) : followingError ? (
                <ErrorState
                  error={followingError}
                  onRetry={handleRetry}
                  retryCount={followingErrorRetry}
                  type="following"
                />
              ) : filteredList(followingList).length === 0 ? (
                <EmptyState type="people you follow" search={search} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredList(followingList).map((user, index) => (
                      <UserCard
                        key={user._id}
                        user={user}
                        index={index}
                        onFollowSuccess={() => {
                          dispatch(fetchFollowers({ page: 1, limit: 12 }));
                          dispatch(fetchFollowing({ page: 1, limit: 12 }));
                        }}
                      />
                    ))}
                  </div>
                  <LoadMoreButton
                    onClick={() => loadMore("following")}
                    loading={followingLoading}
                    hasMore={followingPage < followingTotalPages}
                  />
                </>
              )}
            </motion.div>
          )}

          {/* Followers Section */}
          {activeTab === "followers" && (
            <motion.div
              key="followers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <SectionHeader
                title="Your Followers"
                count={followersCount}
                icon={Users}
              />

              {followersLoading && followersList.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {Array(8)
                    .fill()
                    .map((_, i) => (
                      <UserCardSkeleton key={i} />
                    ))}
                </div>
              ) : followersError ? (
                <ErrorState
                  error={followersError}
                  onRetry={handleRetry}
                  retryCount={followersErrorRetry}
                  type="followers"
                />
              ) : filteredList(followersList).length === 0 ? (
                <EmptyState type="followers" search={search} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredList(followersList).map((user, index) => (
                      <UserCard
                        key={user._id}
                        user={user}
                        index={index}
                        onFollowSuccess={() => {
                          dispatch(fetchFollowers({ page: 1, limit: 12 }));
                          dispatch(fetchFollowing({ page: 1, limit: 12 }));
                        }}
                      />
                    ))}
                  </div>
                  <LoadMoreButton
                    onClick={() => loadMore("followers")}
                    loading={followersLoading}
                    hasMore={followersPage < followersTotalPages}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FollowersFollowing;
