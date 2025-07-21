import React, { useEffect, useState, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFollowers, fetchFollowing } from "../../../store/followSlice";
import ToggleFollowButton from "../Subscribe/ToggleFollowButton";
import { motion } from "framer-motion";
import Skeleton from "../../Ui/Skeleton";

const UserCardSkeleton = () => (
  <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 shadow-sm border animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/4" height="h-4" />
        <Skeleton width="w-1/2" height="h-3" />
      </div>
      <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
    </div>
  </div>
);

const UserCard = memo(({ user, onFollowSuccess }) => {
  if (!user?._id) return null;

  return (
    <motion.div
      key={user._id}
      className="bg-background-light dark:bg-background-dark rounded-lg p-4 shadow-sm border hover:shadow-md transition-all duration-300"
      whileHover={{ scale: 1.02 }}
      role="listitem"
      aria-label={`User ${user.name || user.username || "Unnamed User"}`}
    >
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || user.username || "User"}
            className="w-12 h-12 rounded-full object-cover border"
            loading="lazy"
            onError={(e) => (e.target.src = "/fallback-avatar.png")}
          />
        ) : (
          <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
        )}
        <div className="flex-1">
          <p className="text-text-main-light dark:text-text-main-dark font-medium truncate">
            {user.name || user.username}
          </p>
          <p className="text-sm text-muted-foreground">
            @{user.username || "unknown"}
          </p>
        </div>
        <ToggleFollowButton
          followUserId={user._id}
          onFollowSuccess={onFollowSuccess}
        />
      </div>
    </motion.div>
  );
});

const FollowersFollowing = () => {
  const dispatch = useDispatch();
  const { followers, following } = useSelector((state) => state.follow);

  const [followersErrorRetry, setFollowersErrorRetry] = useState(0);
  const [followingErrorRetry, setFollowingErrorRetry] = useState(0);
  const [search, setSearch] = useState("");

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

  const loadMore = useCallback((type) => {
    if (type === "followers" && followersPage < followersTotalPages && !followersLoading) {
      dispatch(fetchFollowers({ page: followersPage + 1, limit: 12 }));
    } else if (type === "following" && followingPage < followingTotalPages && !followingLoading) {
      dispatch(fetchFollowing({ page: followingPage + 1, limit: 12 }));
    }
  }, [dispatch, followersPage, followersTotalPages, followersLoading, followingPage, followingTotalPages, followingLoading]);

  const handleRetry = useCallback((type) => {
    if (type === "followers" && followersErrorRetry < 3) {
      dispatch(fetchFollowers({ page: followersPage, limit: 12 }));
      setFollowersErrorRetry((prev) => prev + 1);
    } else if (type === "following" && followingErrorRetry < 3) {
      dispatch(fetchFollowing({ page: followingPage, limit: 12 }));
      setFollowingErrorRetry((prev) => prev + 1);
    }
  }, [dispatch, followersPage, followingPage, followersErrorRetry, followingErrorRetry]);

  const filteredList = (list) => {
    return list.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const username = user.username?.toLowerCase() || "";
      return name.includes(search.toLowerCase()) || username.includes(search.toLowerCase());
    });
  };

  return (
    <div className="space-y-8 h-screen" role="region" aria-label="Followers and Following">
      <div className="flex justify-end mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search followers and following..."
          className="px-3 py-2 rounded-md border bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-sm w-full sm:w-1/2"
        />
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-text-main-light dark:text-text-main-dark mb-4">
          People You Follow ({followingCount})
        </h3>
        {followingLoading && followingList.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill().map((_, i) => <UserCardSkeleton key={i} />)}
          </div>
        ) : followingError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
            <p className="text-red-600 text-lg">Error: {followingError}</p>
            {followingErrorRetry < 3 && (
              <button
                onClick={() => handleRetry("following")}
                className="mt-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Retry
              </button>
            )}
          </motion.div>
        ) : filteredList(followingList).length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-text-main-light dark:text-text-main-dark text-center py-6"
          >
            No people you follow found.
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList(followingList).map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onFollowSuccess={() => {
                  dispatch(fetchFollowers({ page: 1, limit: 12 }));
                  dispatch(fetchFollowing({ page: 1, limit: 12 }));
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-text-main-light dark:text-text-main-dark mb-4">
          Your Followers ({followersCount})
        </h3>
        {followersLoading && followersList.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill().map((_, i) => <UserCardSkeleton key={i} />)}
          </div>
        ) : followersError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
            <p className="text-red-600 text-lg">Error: {followersError}</p>
            {followersErrorRetry < 3 && (
              <button
                onClick={() => handleRetry("followers")}
                className="mt-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Retry
              </button>
            )}
          </motion.div>
        ) : filteredList(followersList).length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-text-main-light dark:text-text-main-dark text-center py-6"
          >
            No followers found.
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList(followersList).map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onFollowSuccess={() => {
                  dispatch(fetchFollowers({ page: 1, limit: 12 }));
                  dispatch(fetchFollowing({ page: 1, limit: 12 }));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersFollowing;