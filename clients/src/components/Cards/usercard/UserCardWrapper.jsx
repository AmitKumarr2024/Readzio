import React, { useEffect, useState } from "react";
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

  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  const refetchUserInfo = async () => {
    if (!userId || typeof userId !== "string") return;
    try {
      const res = await dispatch(getUserById(userId)).unwrap();
      setFetchedUser(res);
    } catch (err) {
      setFetchedUser(null);
      toast.error("Failed to fetch user");
    }
  };

  useEffect(() => {
    if (!userId || typeof userId !== "string") {
      setFetchedUser(null);
      setSubscriptionStatus(null);
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    Promise.all([
      dispatch(getUserById(userId)),
      dispatch(checkEligibilityForSubscription()),
    ])
      .then(([userRes]) => {
        if (userRes.payload?._id) {
          setFetchedUser(userRes.payload);
          dispatch(fetchFollowers());
          dispatch(fetchFollowing());
          if (!user?._id || user._id === userId) {
            setSubscriptionStatus(null);
            return;
          }
          dispatch(
            getSubscriptionStatusByAuthor({
              userId: user._id,
              authorId: userId,
            })
          )
            .unwrap()
            .then(setSubscriptionStatus)
            .catch(() => setSubscriptionStatus(null));
        } else {
          setFetchedUser(null);
          toast.error("Invalid user data received");
        }
      })
      .catch(() => {
        setFetchedUser(null);
        setSubscriptionStatus(null);
        toast.error("Failed to fetch user data");
      })
      .finally(() => setLoadingUser(false));

    if (userId) dispatch(getFollowStatus(userId));
  }, [userId, dispatch, user?._id]);

  useEffect(() => {
    if (currentUser?._id) dispatch(fetchFollowing());
  }, [currentUser?._id, dispatch]);

  useEffect(() => {
    if (followError) toast.error(followError);
  }, [followError]);

  const handleFollowToggle = async () => {
    try {
      await dispatch(
        isFollowing ? unfollowUser(userId) : followUser(userId)
      ).unwrap();
      await dispatch(fetchFollowing()).unwrap();
      const followingIds = followingList.map((item) => item._id || item);
      dispatch(getAllPosts({ followingIds, page: 1, limit: null }));
      refetchUserInfo();
    } catch (err) {
      toast.error(err.message || "Failed to update follow status");
    }
  };

  const userToShow = userId ? fetchedUser : currentUser;
  if (loadingUser)
    return (
      <div className="text-center py-4 animate-pulse">Loading user...</div>
    );
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
  const followersCount = userToShow.followers?.length || 0;
  const followingCount = userToShow.following?.length || 0;

  return (
    <UserCard
      user={userToShow}
      posts={posts}
      followers={userToShow.followers || []}
      following={userToShow.following || []}
      followersCount={followersCount}
      followingCount={followingCount}
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
