// src/components/Post/DisplayPost/PostHeader.jsx
import React from "react";
import {toast} from "react-hot-toast";

const PostHeader = ({ post }) => {
  const fallbackImage = "https://placehold.co/600x400?text=No+Image";

  return (
    <>
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-text-main-light dark:text-text-main-dark leading-tight tracking-tight">
        {post.title || "Untitled"}
      </h1>
      {post.thumbnail && (
        <div className="relative mb-6">
          <img
            src={post.thumbnail || fallbackImage}
            alt={post.title || "Post"}
            className="w-full h-64 md:h-80 object-cover rounded-sm shadow-xl border border-gray-300 dark:border-gray-700 transition-transform duration-300 hover:scale-[1.02]"
            onError={(e) => {
              console.warn(`[PostHeader] Thumbnail failed for post ${post._id}:`, post.thumbnail);
              e.target.src = fallbackImage;
              toast.error("Failed to load post thumbnail");
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
        </div>
      )}
    </>
  );
};

export default PostHeader;