import React from "react";
import { Link } from "react-router-dom";
import BlockRenderer from "../PostFeature/BlockRenderer";
import UserCardWrapper from "../Cards/usercard/UserCardWrapper";
import Skeleton from "../ui/Skeleton";

const PostErrorHandler = ({ message, post, currentUser, getUserById, isPostRestricted, canViewPost, authorId }) => {
  return (
    <div className="bg-gray-100 min-h-screen py-6 px-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0 bg-white shadow-md rounded-xl px-6 sm:px-10 py-8">
          <div className="p-6 bg-red-100 text-red-600 rounded-xl text-center mb-4">
            {message}
          </div>
          {post && (
            <BlockRenderer
              blocks={post.blocks || []}
              postId={post._id}
              slug={post.slug}
              loginUser={currentUser}
              getUserById={getUserById}
              isPostRestricted={isPostRestricted}
              canViewPost={canViewPost}
              authorId={post.author?._id}
              isPublished={post.isPublished}
            />
          )}
        </div>
        <div className="hidden md:block md:w-80 w-full">
          {post?.author?._id && <UserCardWrapper userId={post.author._id} />}
        </div>
      </div>
    </div>
  );
};

export default PostErrorHandler;