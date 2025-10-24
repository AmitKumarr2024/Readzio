// GuestCardOfPost.jsx (fixed: destructure from post prop)
import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, Heart, Bookmark, Share2 } from "lucide-react";

const GuestCardOfPost = ({ post }) => {
  console.log("GuestCardOfPost: Rendering", post?.title || "Untitled");
  const {
    _id,
    slug,
    thumbnail,
    title,
    createdAt,
    viewsCount = 0,
    shareCount = 0,
    tags = [],
    author = { name: "Anonymous" },
    category = { name: "Uncategorized" },
    readTime,
    postType,
    isPremium,
  } = post || {};

  const formattedDate = new Date(createdAt || new Date()).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return (
    <Link
      to={`/post/${slug}`}
      className="group bg-white dark:bg-gray-800 font-Urbanist rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full max-w-full"
    >
      <div className="relative w-full aspect-video">
        <img
          src={thumbnail || "https://placehold.co/400x225?text=No+Image"}
          alt={title || "Post"}
          className="w-full h-full object-cover aspect-video rounded-t-lg"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {isPremium && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-black">
            Premium
          </span>
        )}
        {postType && (
          <span
            className={`absolute bottom-2 left-2 px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full text-white animate-pulse ${
              postType.toLowerCase() === "blog"
                ? "bg-indigo-600"
                : postType.toLowerCase() === "article"
                ? "bg-emerald-600"
                : "bg-gray-500"
            }`}
          >
            {postType}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 min-h-[200px]">
        <h3 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 dark:text-white group-hover:text-blue-500 line-clamp-2">
          {title || "Untitled"}
        </h3>
        <div className="flex flex-col sm:flex-row sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 justify-between">
          <span className="truncate">{category?.name}</span>
          <span className="truncate font-bold text-gray-700 dark:text-gray-200">
            {author.name || "Anonymous"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" /> 0
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> {viewsCount}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> 0
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> 0
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />{" "}
            {shareCount}
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {formattedDate}
        </div>
        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.slice(0, 4).map((tag) => (
              <div
                key={tag}
                className="text-indigo-500 hover:underline text-xs sm:text-sm font-medium"
              >
                #{tag}
              </div>
            ))}
            {tags.length > 4 && (
              <div className="text-indigo-500 text-xs sm:text-sm font-medium">
                ...
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default GuestCardOfPost;
