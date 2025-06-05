import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import UserCard from "./UserCard";
import { getUserById } from "../../../store/userSlice";

const UserCardWrapper = ({ userId }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);
  const followingList = useSelector((state) => state.subscribe.following.list) || [];
  const subscribedAuthors = useSelector((state) => state.subscribe.subscribedAuthors) || [];
  const posts = useSelector((state) => state.post.posts) || [];

  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const refetchUserInfo = () => {
    if (userId) {
      dispatch(getUserById(userId))
        .then((res) => setFetchedUser(res.payload))
        .catch((err) => {
          console.error("Failed to refetch user:", err);
          toast.error("Failed to refetch user");
        });
    }
  };

  useEffect(() => {
    if (userId) {
      setLoadingUser(true);
      dispatch(getUserById(userId))
        .then((res) => setFetchedUser(res.payload))
        .catch((err) => {
          console.error("Failed to fetch user:", err);
          toast.error("Failed to fetch user");
          setFetchedUser(null);
        })
        .finally(() => setLoadingUser(false));
    } else {
      // If no userId provided, clear fetchedUser state
      setFetchedUser(null);
    }
  }, [userId, dispatch]);

  if (loadingUser) return <div>Loading user...</div>;

  // Decide which user data to display: fetched user or current user
  const userToShow = userId ? fetchedUser : currentUser;
  if (!userToShow) return null;

  // Determine if current user is following userToShow
  const isFollowing = followingList.some((user) =>
    typeof user === "string"
      ? user === userToShow._id
      : user?._id === userToShow._id
  );

  // Check subscription status
  const isSubscribed = subscribedAuthors.includes(userToShow._id);

  // Show buttons only if viewing another user (not self) and userId is provided
  const showButtons = userId && currentUser?._id !== userId;

  return (
    <UserCard
      user={userToShow}
      posts={posts}
      followers={userToShow.followers || []}
      following={userToShow.following || []}
      showFollowBtn={showButtons}
      isFollowing={isFollowing}
      isSubscribed={isSubscribed}
      currentUserId={currentUser?._id}
      onFollowToggle={refetchUserInfo}
      onSubscribeToggle={refetchUserInfo}
    />
  );
};

export default UserCardWrapper;
