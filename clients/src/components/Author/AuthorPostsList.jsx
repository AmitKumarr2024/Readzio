import React from "react";
import { Link } from "react-router-dom";

const AuthorPostsList = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        This author hasn't published any posts yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`/post/${post.slug}`}
          className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition"
        >
          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              className="h-40 w-full object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{post.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{post.date}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default AuthorPostsList;
