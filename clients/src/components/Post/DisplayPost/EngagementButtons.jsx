import React from "react";
import LikeButton from "../LikeButton";
import ShareButton from "../ShareButton";
import BookmarkButton from "../BookmarkButton";
import PlaylistButton from "../../Playlist/PlaylistButton";

const EngagementButtons = ({ post }) => {
  if (!post?._id) {
    console.warn("❌ EngagementButtons: Invalid post:", post);
    return null;
  }

  const postId = post._id;
  const postUrl = `https://readzio.com/post/${post.slug || postId}`;

  return (
    <>
      <div className="engagement-container w-full max-w-5xl mx-auto my-10 px-2 sm:px-4">
        <div className="engagement-buttons flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
          <LikeButton
            postId={postId}
            className="rainbow-button p-2 sm:p-3 text-white rounded-full hover:shadow-lg transition-all duration-200 flex-shrink-0"
          />
          <ShareButton
            postId={postId}
            postUrl={postUrl}
            className="rainbow-button p-2 sm:p-3 text-white rounded-full hover:shadow-lg transition-all duration-200 flex-shrink-0"
          />
          <BookmarkButton
            postId={postId}
            className="rainbow-button p-2 sm:p-3 text-white rounded-full hover:shadow-lg transition-all duration-200 flex-shrink-0"
          />
          <PlaylistButton
            postId={postId}
            post={post}
            className="rainbow-button p-2 sm:p-3 text-white rounded-full hover:shadow-lg transition-all duration-200 flex items-center gap-2 flex-shrink-0"
          />
        </div>
      </div>
    </>
  );
};

export default EngagementButtons;
