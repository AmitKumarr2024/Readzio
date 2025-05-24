import React from "react";
import { Link } from "react-router-dom";

const AuthorBookmarks = ({ bookmarks }) => {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        No bookmarks yet.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {bookmarks.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
        >
          <Link to={`/post/${post.slug}`}>
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-48 object-cover"
            />
          </Link>
          <div className="p-4">
            <Link to={`/post/${post.slug}`}>
              <h3 className="text-lg font-semibold text-blue-600 hover:underline line-clamp-2">
                {post.title}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 mt-1">{post.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuthorBookmarks;
