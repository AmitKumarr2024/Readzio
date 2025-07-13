import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Eye, Share2 } from "lucide-react";
import TimeAgo from "../../Utils/TimeAgo";

const GuestCardOfPost = ({
  _id,
  slug,
  thumbnail,
  title,
  createdAt,
  viewsCount = 0,
  shareCount = 0,
  tags = [],
  author = {},
}) => {
  return (
    <Link
      to={`/post/${slug}`}
      className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full"
    >
      <div className="relative w-full aspect-video">
        <img
          src={thumbnail || "https://placehold.co/400x225?text=No+Image"}
          alt={title}
          className="w-full h-full object-cover rounded-t-lg"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 line-clamp-2">
          {title}
        </h3>

        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span className="truncate">{author?.name || "Anonymous"}</span>
          <span className="text-xs">
            <TimeAgo date={createdAt} />
          </span>
        </div>

        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {viewsCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {0}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-4 h-4" />
            {shareCount}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default GuestCardOfPost;
