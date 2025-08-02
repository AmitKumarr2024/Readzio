import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  getFollowStatus,
} from "../../../store/followSlice";

function ToggleFollowButton({ followUserId, onFollowSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?._id || !followUserId) return;

    const fetchStatus = async () => {
      try {
        const res = await dispatch(getFollowStatus(followUserId));
        if (getFollowStatus.fulfilled.match(res) && res.payload) {
          setIsFollowing(res.payload.isFollowing);
        }
      } catch (error) {
        console.error("Failed to fetch follow status", error);
      }
    };

    fetchStatus();
  }, [dispatch, followUserId, isAuthenticated, user?._id]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to follow users.");
      navigate("/signin");
      return;
    }

    const action = isFollowing ? unfollowUser : followUser;
    const result = await dispatch(action(followUserId));

    if (action.fulfilled.match(result)) {
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed" : "Followed");
      dispatch(fetchFollowers());
      dispatch(fetchFollowing());
      onFollowSuccess?.();
    } else {
      toast.error(result.payload || "Failed to update follow status.");
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      className={`px-4 py-2 text-sm font-medium text-white rounded-full shadow-md transition-all duration-300 ${
        isFollowing
          ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
      }`}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}

export default ToggleFollowButton;
