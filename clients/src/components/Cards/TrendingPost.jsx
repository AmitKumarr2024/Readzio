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
    <div className="w-full">
      <h2 className="text-base sm:text-lg font-semibold  text-text-main-light dark:text-text-main-dark mb-2 sm:mb-3 border-b pb-1 flex items-center gap-2">
        🔥 Trending Posts
      </h2>

      {loading && <p className="text-text-main-light dark:text-text-main-dark text-sm sm:text-base">Loading posts...</p>}

      {error && <p className="text-red-500 text-sm sm:text-base">Error: {error}</p>}

      {!loading && !error && (
        <>
          {visiblePosts.length === 0 ? (
            <p className="text-text-main-light dark:text-text-main-dark text-sm sm:text-base">No posts found.</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {visiblePosts.map(({ _id, title, slug, thumbnail }) => (
                <li key={_id} className="flex gap-2 sm:gap-3">
                  <Link to={`/post/${slug}`}>
                    <img
                      src={thumbnail || "https://placehold.co/150x100?text=Ad+Failed"}
                      alt={title}
                      className="w-16 sm:w-20 h-9 sm:h-12 object-cover rounded"
                    />
                  </Link>
                  <div className="flex-1">
                    <Link
                      to={`/post/${slug}`}
                      className="text-sm sm:text-base text-text-main-light dark:text-text-main-dark hover:text-blue-600 line-clamp-2"
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
              className="mt-2 sm:mt-3 text-text-main-light dark:text-text-main-dark text-xs sm:text-sm hover:text-blue-800"
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