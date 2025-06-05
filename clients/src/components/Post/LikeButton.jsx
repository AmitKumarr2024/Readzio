import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom"; // or pass `postId` as a prop
import { togglePostLike } from "../../store/Post interactions";

const LikeButton = ({ postId: propPostId }) => {
  const dispatch = useDispatch();
  const postId = propPostId || useParams()?.postId;

  const { likes } = useSelector((state) => state.postInteraction);
  const likeInfo = likes[postId] || { liked: false, likesCount: 0 };

  const handleToggleLike = () => {
    dispatch(togglePostLike(postId));
  };

  useEffect(() => {
    // Optionally: fetch like status on mount if needed
  }, [postId]);

  return (
    <button
      onClick={handleToggleLike}
      aria-pressed={likeInfo.liked}
      className={`px-3 py-1.5 rounded-md transition ${
        likeInfo.liked ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {likeInfo.liked ? "❤️ Liked" : "♡ Like"} • {likeInfo.likesCount}
    </button>
  );
};

export default LikeButton;
