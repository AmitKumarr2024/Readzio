import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBookmarkAndLikeStatus, togglePostBookmark } from "../../store/Post interactions";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

const BookmarkButton = ({ postId }) => {
  console.log("postIddd",postId);
  
  const dispatch = useDispatch();

  const { bookmarks, loading, error } = useSelector((state) => state.postInteraction);
  const bookmarkInfo = bookmarks[postId] || { bookmarked: false, bookmarksCount: 0 };

  useEffect(() => {
    if (isValidObjectId(postId)) {
      dispatch(fetchBookmarkAndLikeStatus(postId));
    } else {
      console.warn("[BookmarkButton] Invalid postId:", postId);
    }
  }, [dispatch, postId]);

  const handleToggleBookmark = () => {
    if (!isValidObjectId(postId) || loading) return;
    dispatch(togglePostBookmark(postId));
  };

  if (!isValidObjectId(postId)) return null;

  return (
    <div className="relative">
      <button
        onClick={handleToggleBookmark}
        disabled={loading}
        aria-pressed={bookmarkInfo.bookmarked}
        className={`px-3 py-1.5 rounded-md transition-colors ${
          bookmarkInfo.bookmarked ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-600"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {bookmarkInfo.bookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"} • {bookmarkInfo.bookmarksCount}
      </button>
      {error && <span className="absolute top-8 text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default BookmarkButton;
