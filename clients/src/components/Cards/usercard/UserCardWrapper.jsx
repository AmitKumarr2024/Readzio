import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import UserCard from "./UserCard";
import { getUserById } from "../../../store/userSlice";
import {
  getFollowStatus,
  fetchFollowing,
  fetchFollowers,
  followUser,
  unfollowUser,
} from "../../../store/followSlice";
import { getAllPosts } from "../../../store/postSlice";
import {
  getSubscriptionStatusByAuthor,
  checkEligibilityForSubscription,
} from "../../../store/subscriptionSlice";
import { selectSocketState } from "../../../store/socketSlice";

const UserCardWrapper = ({ userId }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user?.user || null);
  const auth = useSelector((state) => state.auth || {});
  const { user = null, isAuthenticated = false } = auth;
  const followingList = useSelector(
    (state) => state.follow?.following?.list || []
  );
  const posts = useSelector((state) => state.post?.posts || []);
  const followError = useSelector((state) => state.follow?.error);
  const { userStatus = {} } = useSelector(selectSocketState);

  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  // Local state for immediate count updates
  const [localFollowersCount, setLocalFollowersCount] = useState(0);
  const [localFollowingCount, setLocalFollowingCount] = useState(0);

  // Memoized refetch function
  const refetchUserInfo = useCallback(async () => {
    if (!userId || typeof userId !== "string") return null;
    try {
      const res = await dispatch(getUserById(userId)).unwrap();
      setFetchedUser(res);
      // Sync local counts with fresh data
      setLocalFollowersCount(res.followers?.length || 0);
      setLocalFollowingCount(res.following?.length || 0);
      return res;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      toast.error("Failed to fetch user");
      return null;
    }
  }, [userId, dispatch]);

  // Initial data fetch
  useEffect(() => {
    if (!userId || typeof userId !== "string") {
      setFetchedUser(null);
      setSubscriptionStatus(null);
      setLoadingUser(false);
      setLocalFollowersCount(0);
      setLocalFollowingCount(0);
      return;
    }

    const fetchInitialData = async () => {
      setLoadingUser(true);
      try {
        // Fetch all data in parallel
        const [userRes, , followersRes, followingRes] = await Promise.all([
          dispatch(getUserById(userId)),
          dispatch(checkEligibilityForSubscription()),
          dispatch(fetchFollowers({ page: 1, limit: 12 })),
          dispatch(fetchFollowing({ page: 1, limit: 12 })),
        ]);

        if (userRes.payload?._id) {
          const userData = userRes.payload;
          setFetchedUser(userData);

          // Initialize local counts
          setLocalFollowersCount(userData.followers?.length || 0);
          setLocalFollowingCount(userData.following?.length || 0);

          // Fetch subscription status if needed
          if (user?._id && user._id !== userId) {
            try {
              const status = await dispatch(
                getSubscriptionStatusByAuthor({
                  userId: user._id,
                  authorId: userId,
                })
              ).unwrap();
              setSubscriptionStatus(status);
            } catch (err) {
              console.error("Failed to fetch subscription status:", err);
              setSubscriptionStatus(null);
            }
          } else {
            setSubscriptionStatus(null);
          }

          // Fetch follow status
          dispatch(getFollowStatus(userId));
        } else {
          setFetchedUser(null);
          toast.error("Invalid user data received");
        }
      } catch (err) {
        console.error("Error in UserCardWrapper:", err);
        setFetchedUser(null);
        setSubscriptionStatus(null);
        toast.error("Failed to fetch user data");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInitialData();
  }, [userId, dispatch, user?._id]);

  // Sync local counts when fetchedUser updates
  useEffect(() => {
    if (fetchedUser) {
      setLocalFollowersCount(fetchedUser.followers?.length || 0);
      setLocalFollowingCount(fetchedUser.following?.length || 0);
    }
  }, [fetchedUser]);

  // Update counts for current user's own profile
  useEffect(() => {
    if (currentUser?._id && !userId) {
      setLocalFollowersCount(currentUser.followers?.length || 0);
      setLocalFollowingCount(currentUser.following?.length || 0);
    }
  }, [currentUser, userId]);

  useEffect(() => {
    if (followError) toast.error(followError);
  }, [followError]);

  const handleFollowToggle = async () => {
    const wasFollowing = isFollowing;

    try {
      // ✅ OPTIMISTIC UPDATE: Update count immediately
      if (wasFollowing) {
        setLocalFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        setLocalFollowersCount((prev) => prev + 1);
      }

      // Perform the follow/unfollow action
      await dispatch(
        wasFollowing ? unfollowUser(userId) : followUser(userId)
      ).unwrap();

      // ✅ CRITICAL: Refetch user data to get actual updated counts from server
      // This is necessary because follow/unfollow API doesn't return target user's counts
      const updatedUser = await refetchUserInfo();

      // Fetch updated following/followers lists for current user
      await Promise.all([
        dispatch(fetchFollowing({ page: 1, limit: 12 })).unwrap(),
        dispatch(fetchFollowers({ page: 1, limit: 12 })).unwrap(),
      ]);

      // Update posts feed
      const followingIds = followingList.map((item) => item._id || item);
      dispatch(getAllPosts({ followingIds, page: 1, limit: null }));

      // ✅ Ensure counts are synced with server response
      if (updatedUser) {
        setLocalFollowersCount(updatedUser.followers?.length || 0);
        setLocalFollowingCount(updatedUser.following?.length || 0);
      }
    } catch (err) {
      // ✅ REVERT OPTIMISTIC UPDATE on error
      if (wasFollowing) {
        setLocalFollowersCount((prev) => prev + 1);
      } else {
        setLocalFollowersCount((prev) => Math.max(0, prev - 1));
      }
      console.error("Follow toggle error:", err);
      toast.error(err.message || "Failed to update follow status");
    }
  };

  const userToShow = userId ? fetchedUser : currentUser;

  if (loadingUser) {
    return (
      <div className="text-center py-4 animate-pulse">Loading user...</div>
    );
  }

  if (!userToShow || !userToShow?._id) {
    return <div className="text-center py-4 text-red-500">User not found</div>;
  }

  const isFollowing = followingList.some((item) =>
    typeof item === "string"
      ? item === userToShow._id
      : item?._id === userToShow._id
  );

  const showButtons =
    userId && currentUser?._id && currentUser._id !== userToShow._id;

  const isOnline = userStatus[userToShow._id]?.isOnline || false;

  return (
    <UserCard
      user={{ ...userToShow, isOnline }}
      posts={posts}
      followers={userToShow.followers || []}
      following={userToShow.following || []}
      followersCount={localFollowersCount} // ✅ Use local state for instant updates
      followingCount={localFollowingCount} // ✅ Use local state for instant updates
      showFollowBtn={showButtons}
      isFollowing={isFollowing}
      currentUserId={currentUser?._id || null}
      onFollowToggle={handleFollowToggle}
      subscriptionStatus={subscriptionStatus}
      isLoading={loadingUser}
    />
  );
};

export default UserCardWrapper;
