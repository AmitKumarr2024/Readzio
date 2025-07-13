// src/components/Post/DisplayPost/PostMetaSection.jsx
import React from "react";
import { Link } from "react-router-dom";
import TimeAgo from "../../../Utils/TimeAgo";
import TotalView from "../TotalView";
import PostOptionsDropdown from "../PostOptionsDropdown";

const PostMetaSection = ({
  post,
  isUserSubscribed,
  isAuthor,
  isPostRestricted,
  categoryMap,
  formatTime,
  setIsDeleteModalOpen,
}) => (
  <div className="mb-8">
    <div className="flex gap-3 mb-6 flex-wrap">
      {isUserSubscribed && !isAuthor && (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200">
          You're a Member
        </span>
      )}

      {/* ✅ New postType badge */}
      {post.postType === "premium" && (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200">
          🔒 Premium Post
        </span>
      )}

      {post.postType === "free" && (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white shadow-md hover:shadow-lg transition-shadow duration-200">
          ✅ Free to Read
        </span>
      )}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-text-main-light dark:text-text-main-dark">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <span className="flex items-center gap-2">
          <span className="text-blue-500">📁</span>
          <span className="font-medium hover:text-blue-500 transition-colors duration-200">
            {categoryMap[post.category] || post.category || "Uncategorized"}
          </span>
        </span>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-base">👤</span>
            {post.author?._id ? (
              <Link
                to={`/author/${post.author._id}`}
                className="font-semibold text-text-main-light dark:text-text-main-dark hover:text-blue-500 transition-colors duration-200"
              >
                {post.author?.name || "Unknown Author"}
              </Link>
            ) : (
              <span className="italic text-gray-500 dark:text-gray-400">
                Unknown Author
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <TotalView slug={post.slug} authorId={post.author?._id} />
          </div>

          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span>📖</span>
            <span>Read: {formatTime(post.timeSpent || 0)}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <TimeAgo date={post.createdAt} />
          </div>
        </div>
      </div>

      <PostOptionsDropdown
        isAuthor={isAuthor}
        post={post}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        className="text-text-main-light dark:text-text-main-dark hover:text-blue-500 transition-colors duration-200"
      />
    </div>

    <hr className="my-8 border-gray-300 dark:border-gray-700" />
  </div>
);

export default PostMetaSection;
