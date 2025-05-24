import { useState } from "react";

export const LikeButton = () => {
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked((prev) => !prev);

  return (
    <button
      onClick={toggleLike}
      aria-pressed={liked}
      className={`px-3 py-1.5 rounded-md transition ${
        liked ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {liked ? "❤️ Liked" : "♡ Like"}
    </button>
  );
};