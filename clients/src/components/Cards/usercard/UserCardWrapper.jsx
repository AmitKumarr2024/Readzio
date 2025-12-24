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
import { getSubscriptionStatusByAuthor } from "../../../store/subscriptionSlice";
import { selectSocketState } from "../../../store/socketSlice";

const UserCardWrapper = ({ userId }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user?.user || null);
  const auth = useSelector((state) => state.auth || {});
  const { user = null } = auth;
  const followingList = useSelector(
    (state) => state.follow?.following?.list || []
  );
  const posts = useSelector((state) => state.post?.posts || []);
  const followError = useSelector((state) => state.follow?.error);
  const { userStatus = {} } = useSelector(selectSocketState);

  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [localFollowersCount, setLocalFollowersCount] = useState(0);
  const [localFollowingCount, setLocalFollowingCount] = useState(0);

  // Log when the following list changes — this tells us if the follow/unfollow actually updated Redux
  useEffect(() => {
    console.log("[FollowingList] Updated", {
      length: followingList.length,
      includesTarget: userId
        ? followingList.some(
            (item) => (typeof item === "string" ? item : item?._id) === userId
          )
        : "no target userId",
      targetUserId: userId || "own profile",
    });
  }, [followingList, userId]);

  const refetchUserInfo = useCallback(async () => {
    if (!userId || typeof userId !== "string") return null;

    try {
      const userData = await dispatch(getUserById(userId)).unwrap();

      if (!userData?._id) {
        console.error("[Refetch] Invalid user data:", userData);
        toast.error("Failed to refetch user");
        return null;
      }

      console.log("[Refetch] Success — server returned counts", {
        id: userData._id,
        followersCount:
          userData.followersCount ?? userData.followers?.length ?? 0,
        followingCount:
          userData.followingCount ?? userData.following?.length ?? 0,
      });

      setFetchedUser(userData);
      setLocalFollowersCount(
        userData.followersCount ?? userData.followers?.length ?? 0
      );
      setLocalFollowingCount(
        userData.followingCount ?? userData.following?.length ?? 0
      );

      return userData;
    } catch (err) {
      console.error("[Refetch] Failed:", err);
      toast.error("Failed to refetch user");
      return null;
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (!userId || typeof userId !== "string") {
      setFetchedUser(null);
      setSubscriptionStatus(null);
      setLocalFollowersCount(0);
      setLocalFollowingCount(0);
      setLoadingUser(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoadingUser(true);
      try {
        const userData = await dispatch(getUserById(userId)).unwrap();

        if (!userData?._id) {
          console.error("[InitialFetch] Invalid user data:", userData);
          toast.error("Invalid user data received");
          setFetchedUser(null);
          return;
        }

        console.log("[InitialFetch] Success — server returned counts", {
          id: userData._id,
          followersCount:
            userData.followersCount ?? userData.followers?.length ?? 0,
          followingCount:
            userData.followingCount ?? userData.following?.length ?? 0,
        });

        setFetchedUser(userData);
        setLocalFollowersCount(
          userData.followersCount ?? userData.followers?.length ?? 0
        );
        setLocalFollowingCount(
          userData.followingCount ?? userData.following?.length ?? 0
        );

        // Subscription status
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
            console.error("[InitialFetch] Subscription status error:", err);
            setSubscriptionStatus(null);
          }
        } else {
          setSubscriptionStatus(null);
        }

        // Follow-related data only if authenticated
        if (currentUser?._id) {
          if (userId) {
            dispatch(getFollowStatus(userId));
          }
          await Promise.all([
            dispatch(fetchFollowing({ page: 1, limit: 12 })).unwrap(),
            dispatch(fetchFollowers({ page: 1, limit: 12 })).unwrap(),
          ]);
        }
      } catch (err) {
        console.error("[InitialFetch] Error:", err);
        toast.error("Failed to fetch user data");
        setFetchedUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInitialData();
  }, [userId, dispatch, user?._id, currentUser?._id]);

  useEffect(() => {
    if (!userId && currentUser?._id) {
      setLocalFollowersCount(
        currentUser.followersCount ?? currentUser.followers?.length ?? 0
      );
      setLocalFollowingCount(
        currentUser.followingCount ?? currentUser.following?.length ?? 0
      );
    }
  }, [currentUser, userId]);

  useEffect(() => {
    if (followError) toast.error(followError);
  }, [followError]);

  const handleFollowToggle = async () => {
    const wasFollowing = followingList.some(
      (item) => (typeof item === "string" ? item : item?._id) === userId
    );

    console.log("[FollowToggle] Starting", {
      targetUserId: userId,
      wasFollowing,
      currentLocalFollowersCount: localFollowersCount,
      followingListLength: followingList.length,
    });

    try {
      // Optimistic update
      setLocalFollowersCount((prev) => {
        const newCount = wasFollowing ? Math.max(0, prev - 1) : prev + 1;
        console.log(
          "[FollowToggle] Optimistic update → new followers count:",
          newCount
        );
        return newCount;
      });

      // Server action
      await dispatch(
        wasFollowing ? unfollowUser(userId) : followUser(userId)
      ).unwrap();

      console.log("[FollowToggle] Server action succeeded");

      // Refetch target user counts
      const updatedUser = await refetchUserInfo();

      console.log("[FollowToggle] After refetch — server confirmed counts", {
        followersCount:
          updatedUser?.followersCount ??
          updatedUser?.followers?.length ??
          "N/A",
        followingCount:
          updatedUser?.followingCount ??
          updatedUser?.following?.length ??
          "N/A",
      });

      // Refresh current user's lists
      await Promise.all([
        dispatch(fetchFollowing({ page: 1, limit: 12 })).unwrap(),
        dispatch(fetchFollowers({ page: 1, limit: 12 })).unwrap(),
      ]);

      console.log("[FollowToggle] Current user lists refreshed");

      // Update posts feed
      const followingIds = followingList.map((item) => item._id || item);
      dispatch(getAllPosts({ followingIds, page: 1, limit: null }));

      console.log("[FollowToggle] Completed successfully");
    } catch (err) {
      // Revert optimistic update
      setLocalFollowersCount((prev) => {
        const reverted = wasFollowing ? prev + 1 : Math.max(0, prev - 1);
        console.log(
          "[FollowToggle] ERROR → reverting followers count to:",
          reverted
        );
        return reverted;
      });

      console.error("[FollowToggle] Failed:", err);
      toast.error(err.message || "Failed to update follow status");
    }
  };

  const userToShow = userId ? fetchedUser : currentUser;

  if (loadingUser) {
    return (
      <div className="text-center py-4 animate-pulse">Loading user...</div>
    );
  }

  if (!userToShow || !userToShow._id) {
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
      followersCount={localFollowersCount}
      followingCount={localFollowingCount}
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
// -----------------------------------------------------------
// old code

// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-hot-toast";
// import UserCard from "./UserCard";
// import { getUserById } from "../../../store/userSlice";
// import {
//   getFollowStatus,
//   fetchFollowing,
//   fetchFollowers,
//   followUser,
//   unfollowUser,
// } from "../../../store/followSlice";
// import { getAllPosts } from "../../../store/postSlice";
// import {
//   getSubscriptionStatusByAuthor,
//   checkEligibilityForSubscription,
// } from "../../../store/subscriptionSlice";
// import { selectSocketState } from "../../../store/socketSlice"; // Add this import

// const UserCardWrapper = ({ userId }) => {
//   const dispatch = useDispatch();
//   const currentUser = useSelector((state) => state.user?.user || null);
//   const auth = useSelector((state) => state.auth || {});
//   const { user = null, isAuthenticated = false } = auth;
//   const followingList = useSelector(
//     (state) => state.follow?.following?.list || []
//   );
//   const posts = useSelector((state) => state.post?.posts || []);
//   const followError = useSelector((state) => state.follow?.error);
//   const { userStatus = {} } = useSelector(selectSocketState); // Add socket selector

//   const [fetchedUser, setFetchedUser] = useState(null);
//   const [loadingUser, setLoadingUser] = useState(false);
//   const [subscriptionStatus, setSubscriptionStatus] = useState(null);

//   const refetchUserInfo = async () => {
//     if (!userId || typeof userId !== "string") return;
//     try {
//       const res = await dispatch(getUserById(userId)).unwrap();
//       setFetchedUser(res);
//     } catch (err) {
//       setFetchedUser(null);
//       toast.error("Failed to fetch user");
//     }
//   };

//   useEffect(() => {
//     if (!userId || typeof userId !== "string") {
//       setFetchedUser(null);
//       setSubscriptionStatus(null);
//       setLoadingUser(false);
//       return;
//     }

//     setLoadingUser(true);
//     Promise.all([
//       dispatch(getUserById(userId)),
//       dispatch(checkEligibilityForSubscription()),
//     ])
//       .then(([userRes]) => {
//         if (userRes.payload?._id) {
//           setFetchedUser(userRes.payload);
//           dispatch(fetchFollowers());
//           dispatch(fetchFollowing());
//           if (!user?._id || user._id === userId) {
//             setSubscriptionStatus(null);
//             return;
//           }
//           dispatch(
//             getSubscriptionStatusByAuthor({
//               userId: user._id,
//               authorId: userId,
//             })
//           )
//             .unwrap()
//             .then((status) => {
//               setSubscriptionStatus(status);
//             })
//             .catch((err) => {
//               console.error("Failed to fetch subscription status:", err);
//               setSubscriptionStatus(null);
//             });
//         } else {
//           setFetchedUser(null);
//           toast.error("Invalid user data received");
//         }
//       })
//       .catch((err) => {
//         console.error("Error in UserCardWrapper:", err);
//         setFetchedUser(null);
//         setSubscriptionStatus(null);
//         toast.error("Failed to fetch user data");
//       })
//       .finally(() => setLoadingUser(false));

//     if (userId) dispatch(getFollowStatus(userId));
//   }, [userId, dispatch, user?._id]);

//   useEffect(() => {
//     if (currentUser?._id) dispatch(fetchFollowing());
//   }, [currentUser?._id, dispatch]);

//   useEffect(() => {
//     if (followError) toast.error(followError);
//   }, [followError]);

//   const handleFollowToggle = async () => {
//     try {
//       await dispatch(
//         isFollowing ? unfollowUser(userId) : followUser(userId)
//       ).unwrap();
//       await dispatch(fetchFollowing()).unwrap();
//       const followingIds = followingList.map((item) => item._id || item);
//       dispatch(getAllPosts({ followingIds, page: 1, limit: null }));
//       refetchUserInfo();
//     } catch (err) {
//       toast.error(err.message || "Failed to update follow status");
//     }
//   };

//   const userToShow = userId ? fetchedUser : currentUser;
//   if (loadingUser)
//     return (
//       <div className="text-center py-4 animate-pulse">Loading user...</div>
//     );
//   if (!userToShow || !userToShow?._id) {
//     return <div className="text-center py-4 text-red-500">User not found</div>;
//   }

//   const isFollowing = followingList.some((item) =>
//     typeof item === "string"
//       ? item === userToShow._id
//       : item?._id === userToShow._id
//   );
//   const showButtons =
//     userId && currentUser?._id && currentUser._id !== userToShow._id;
//   const followersCount = userToShow.followers?.length || 0;
//   const followingCount = userToShow.following?.length || 0;
//   const isOnline = userStatus[userToShow._id]?.isOnline || false; // Realtime online status

//   return (
//     <UserCard
//       user={{ ...userToShow, isOnline }} // Pass realtime online status
//       posts={posts}
//       followers={userToShow.followers || []}
//       following={userToShow.following || []}
//       followersCount={followersCount}
//       followingCount={followingCount}
//       showFollowBtn={showButtons}
//       isFollowing={isFollowing}
//       currentUserId={currentUser?._id || null}
//       onFollowToggle={handleFollowToggle}
//       subscriptionStatus={subscriptionStatus}
//       isLoading={loadingUser}
//     />
//   );
// };

// export default UserCardWrapper;
