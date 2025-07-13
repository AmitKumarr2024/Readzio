import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBookmarkAndLikeStatus,
  togglePostLike,
} from "../../store/PostInteractions";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const LikeButton = ({ postId }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

  const { likes, loading, error } = useSelector(
    (state) => state.postInteraction
  );
  const likeInfo = likes[postId] || { liked: false, likesCount: 0 };

  useEffect(() => {
    if (isValidObjectId(postId)) {
      console.log("[LikeButton] Fetching status for postId:", postId);
      dispatch(fetchBookmarkAndLikeStatus(postId));
    } else {
      console.warn("[LikeButton] Invalid postId provided:", postId);
    }
  }, [dispatch, postId]);

  const handleToggleLike = () => {
    if (!isAuthenticated) {
      toast.info("Please log in to like this post.");
      navigate("/login");
      return;
    }
    if (!isValidObjectId(postId) || loading) {
      console.warn("[LikeButton] Cannot toggle like", { postId, loading });
      return;
    }
    dispatch(togglePostLike(postId));
  };

  if (!isValidObjectId(postId)) {
    console.error("[LikeButton] Invalid postId, not rendering");
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggleLike}
        disabled={loading}
        aria-pressed={likeInfo.liked}
        className={`px-3 py-1.5 rounded-full transition-colors ${
          likeInfo.liked ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {likeInfo.liked ? "♥ Liked" : "♡ Like"} • {likeInfo.likesCount}
      </button>
      {error && (
        <span className="absolute top-8 text-xs text-red-600">{error}</span>
      )}
    </div>
  );
};

export default LikeButton;