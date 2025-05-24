import { useState } from "react";

export const BookmarkButton = () => {
  const [bookmarked, setBookmarked] = useState(false);
  const toggleBookmark = () => setBookmarked((prev) => !prev);

  return (
    <button
      onClick={toggleBookmark}
      aria-pressed={bookmarked}
      className={`px-3 py-1.5 rounded-md transition ${
        bookmarked ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {bookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"}
    </button>
  );
};