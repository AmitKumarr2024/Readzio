import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getLatestPosts } from "../../store/postSlice"; // Adjust path accordingly
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
    <div className="bg-white p-4 rounded-lg shadow-md w-full">
      <h2 className="text-lg flex font-semibold mb-2 border-b pb-1">
        🔥 Trending Posts
      </h2>

      {loading && <p className="text-gray-500">Loading posts...</p>}

      {error && <p className="text-red-500">Error loading posts: {error}</p>}

      {!loading && !error && (
        <>
          {visiblePosts.length === 0 ? (
            <p className="text-gray-500">No posts found.</p>
          ) : (
            <ul className="text-lg font-bold text-gray-700 list-disc pl-5 space-y-1">
              {visiblePosts.map(({ _id, title, slug }) => (
                <li key={_id}>
                  <Link
                    to={`/post/${slug}`}
                    className="hover:text-blue-600 underline"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {latestPosts.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 text-blue-600 text-sm underline hover:text-blue-800"
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
