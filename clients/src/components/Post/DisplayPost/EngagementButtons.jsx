import React from "react";
import LikeButton from "../LikeButton";
import ShareButton from "../ShareButton";
import BookmarkButton from "../BookmarkButton";

const EngagementButtons = ({ post }) => {
  if (!post?._id) {
    console.warn("❌ EngagementButtons: Invalid post:", post);
    return null;
  }

  const postId = post._id;
  const postUrl = `https://inkshaa.onrender.com/post/${
    post.slug || postId
  }`;

  return (
    <div className="flex items-center gap-4 my-10 bg-background-light dark:bg-background-dark rounded-2xl p-4 shadow-xl border border-gray-300 dark:border-gray-700">
      <LikeButton
        postId={postId}
        className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:shadow-lg transition-all duration-200"
      />
      <ShareButton
        postId={postId} // ✅ Required to increment share count
        postUrl={postUrl} // ✅ For sharing link
        className="p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:shadow-lg transition-all duration-200"
      />
      <BookmarkButton
        postId={postId}
        className="p-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full hover:shadow-lg transition-all duration-200"
      />
    </div>
  );
};

export default EngagementButtons;
