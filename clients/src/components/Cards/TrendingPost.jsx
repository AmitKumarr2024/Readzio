import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getLatestPosts } from "../../store/postSlice";
import { Link } from "react-router-dom";

const TrendingPosts = () => {
  const dispatch = useDispatch();
  const latestPosts = useSelector((state) => state.post.latestPosts || []);
  const loading = useSelector((state) => state.post.latestLoading);
  const error = useSelector((state) => state.post.latestError);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    dispatch(getLatestPosts());
  }, [dispatch]);

  const visiblePosts = showAll ? latestPosts : latestPosts.slice(0, 6);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-4">
      {error && (
        <p className="text-red-500 text-sm bg-red-100 dark:bg-red-900/30 rounded p-2">
          Error: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {visiblePosts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm p-2">
              No posts found.
            </p>
          ) : (
            <ul className="space-y-3">
              {visiblePosts.map(({ _id, title, slug }, index) => (
                <li
                  key={_id}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Link
                    to={`/post/${slug}`}
                    className="text-sm text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    {index + 1}. {title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {latestPosts.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 px-3 py-1 text-sm text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {showAll ? "View Less" : "View All"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TrendingPosts;
