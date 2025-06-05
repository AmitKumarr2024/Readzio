import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { togglePostBookmark } from "../../store/Post interactions";

const BookmarkButton = ({ postId: propPostId }) => {
  const dispatch = useDispatch();
  const { postId: routePostId } = useParams();
  const postId = propPostId || routePostId;

  const { bookmarks } = useSelector((state) => state.postInteraction);
  const bookmarkInfo = bookmarks[postId] || { bookmarked: false, bookmarksCount: 0 };

  const handleToggleBookmark = () => {
    if (!postId) return;
    dispatch(togglePostBookmark(postId));
  };

  useEffect(() => {
    if (!postId) console.warn("BookmarkButton: missing postId");
  }, [postId]);

  return (
    <button
      onClick={handleToggleBookmark}
      aria-pressed={bookmarkInfo.bookmarked}
      className={`px-3 py-1.5 rounded-md transition ${
        bookmarkInfo.bookmarked ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {bookmarkInfo.bookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"} • {bookmarkInfo.bookmarksCount}
    </button>
  );
};

export default BookmarkButton;
