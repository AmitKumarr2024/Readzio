import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  getFollowStatus,
} from "../../../store/subscribeSlice";

function ToggleFollowButton({ followUserId, onFollowSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    dispatch(getFollowStatus(followUserId)).then((res) => {
      if (getFollowStatus.fulfilled.match(res)) {
        setIsFollowing(res.payload.isFollowing);
      }
    });
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
      className={`px-3 py-1 rounded-md text-sm font-semibold ${
        isFollowing ? "bg-red-500" : "bg-blue-500"
      } text-white hover:opacity-80 transition`}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}

export default ToggleFollowButton;
