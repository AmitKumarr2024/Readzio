import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import UserCard from "./UserCard";
import { getUserById } from "../../../store/userSlice";
import { getFollowStatus, fetchFollowing, fetchFollowers } from "../../../store/followSlice";
import { getSubscriptionStatusByAuthor } from "../../../store/subscriptionSlice";

const UserCardWrapper = ({ userId }) => {
  const dispatch = useDispatch();

  // Select Redux state
  const currentUser = useSelector((state) => state.user?.user);
  const auth = useSelector((state) => state.auth);
  const { user, isAuthenticated } = auth || {};

  const followingList = useSelector((state) => {
    const fullState = state.follow;
    console.log("UserCardWrapper: Full follow state", fullState);
    return fullState?.following?.list || [];
  });

  const posts = useSelector((state) => state.post?.posts || []);

  // Local state
  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Re-fetch user and subscription info
  const refetchUserInfo = () => {
    if (userId && typeof userId === "string") {
      dispatch(getUserById(userId))
        .then((res) => {
          if (res.payload && res.payload._id) {
            setFetchedUser(res.payload);
          } else {
            setFetchedUser(null);
            toast.error("Invalid user data received");
          }
        })
        .catch((err) => {
          console.error("Failed to refetch user:", err);
          toast.error("Failed to refetch user");
        });
    }
  };

  useEffect(() => {
    if (!userId || typeof userId !== "string") {
      setFetchedUser(null);
      setSubscriptionStatus(null);
      return;
    }

    setLoadingUser(true);

    dispatch(getUserById(userId))
      .then((res) => {
        if (res.payload && res.payload._id) {
          setFetchedUser(res.payload);
          dispatch(fetchFollowers()).then((res) => console.log("fetchFollowers:", res.payload));
          dispatch(fetchFollowing()).then((res) => console.log("fetchFollowing:", res.payload));
          if (!user?._id || user._id === userId) {
            console.warn("Skipping subscription fetch for own profile", { currentUserId: user?._id, targetUserId: userId });
            setSubscriptionStatus(null);
            return;
          }
          dispatch(getSubscriptionStatusByAuthor({ userId: user._id, authorId: userId }))
            .unwrap()
            .then((status) => setSubscriptionStatus(status))
            .catch((err) => {
              console.error("Failed to fetch subscription status:", err);
              setSubscriptionStatus(null);
            });
        } else {
          setFetchedUser(null);
          toast.error("Invalid user data received");
          setSubscriptionStatus(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err);
        toast.error("Failed to fetch user");
        setFetchedUser(null);
        setSubscriptionStatus(null);
      })
      .finally(() => setLoadingUser(false));

    dispatch(getFollowStatus(userId)).catch((err) =>
      console.error("Failed to fetch follow status:", err)
    );
  }, [userId, dispatch, user?._id]);

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchFollowing()).catch((err) =>
        console.error("Failed to fetch following:", err)
      );
    }
  }, [currentUser?._id, dispatch]);

  const userToShow = userId ? fetchedUser : currentUser;

  // Debugging log moved to top-level useEffect
  useEffect(() => {
    if (userToShow?._id) {
      console.log("UserCardWrapper: userToShow.followers", userToShow.followers);
      console.log("UserCardWrapper: userToShow.following", userToShow.following);
      console.log("UserCardWrapper: followingList", followingList);
    }
  }, [userToShow, followingList]);

  if (loadingUser) {
    return <div className="text-gray-500 text-center py-4 animate-pulse">Loading user...</div>;
  }

  if (!userToShow || !userToShow._id) return null;

  const isFollowing = followingList.some((item) =>
    typeof item === "string" ? item === userToShow._id : item?._id === userToShow._id
  );

  const showButtons =
    userId &&
    (currentUser?._id || currentUser?.data?._id) &&
    (currentUser?._id || currentUser?.data?._id) !== userToShow._id;

  const followersCount = loadingUser ? "Loading..." : (userToShow.followers?.length || 0);
  const followingCount = loadingUser ? "Loading..." : (userToShow.following?.length || 0);

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
      currentUserId={currentUser?._id || currentUser?.data?._id || null}
      onFollowToggle={refetchUserInfo}
      subscriptionStatus={subscriptionStatus}
    />
  );
};

export default UserCardWrapper;