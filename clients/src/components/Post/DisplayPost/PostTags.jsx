import React from "react";
import { Link } from "react-router-dom";
import { Tag, LogIn } from "lucide-react";
import { useSelector } from "react-redux";

const PostTags = ({ tags = [] }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!tags.length) return null;

  if (!isAuthenticated) {
    return (
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <LogIn className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Log in to explore tags
          </p>
          <Link
            to="/login"
            className="ml-auto text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">
          {tags.length === 1 ? "Tagged Topic" : "Tagged Topics"}
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            to={`/tag/${tag}`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition duration-200"
            title={`View posts tagged with ${tag}`}
          >
            #{tag}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PostTags;
