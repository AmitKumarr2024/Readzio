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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
        Trending Posts
      </h2>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-500"></div>
        </div>
      )}

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
              {visiblePosts.map(({ _id, title, slug, thumbnail }) => (
                <li
                  key={_id}
                  className="flex gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Link to={`/post/${slug}`} className="flex-shrink-0">
                    <img
                      src={thumbnail || "https://placehold.co/100x60?text=Image+Failed"}
                      alt={title}
                      className="w-16 h-10 object-cover rounded"
                    />
                  </Link>
                  <div className="flex-1">
                    <Link
                      to={`/post/${slug}`}
                      className="text-sm text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 line-clamp-2"
                    >
                      {title}
                    </Link>
                  </div>
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