import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts, clearAllPosts } from "../store/postSlice";
import { fetchCategories } from "../store/categorySlice";
import CardOfPost from "../components/Cards/CardOfPost";

// Displays posts filtered by tag
const TagWisePage = () => {
  const { tag } = useParams();
  const dispatch = useDispatch();

  const {
    posts = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.post || {});
  const { categories = [] } = useSelector((state) => state.categories || {});

  // Fetch posts and categories on mount or tag change
  useEffect(() => {
    try {
      dispatch(clearAllPosts());
      dispatch(getAllPosts());
      dispatch(fetchCategories());
    } catch (e) {
      console.error("[TagWisePage] Fetch error:", e);
    }
  }, [dispatch, tag]);

  // Memoize category map for performance
  const categoryMap = useMemo(() => {
    try {
      return categories.reduce((map, cat) => {
        if (cat?._id && cat?.name) map[cat._id] = cat.name;
        return map;
      }, {});
    } catch (e) {
      console.error("[TagWisePage] Category map error:", e);
      return {};
    }
  }, [categories]);

  // Filter posts by tag
  const filteredPosts = posts.filter(
    (post) =>
      Array.isArray(post.tags) &&
      post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );

  return (
    // Main layout with gradient background
    <div className="min-h-screen pt-24 pb-16 px-[2%] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300">
      <div className="w-full">
        {/* Tag header */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12 tracking-tight">
          <span className="h-14 block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            Posts Tagged
          </span>
          <span className="block font-mono text-2xl sm:text-3xl lg:text-4xl mt-3 text-gray-900 dark:text-gray-100">
            #{tag}
          </span>
        </h1>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
          </div>
        )}
        {/* Error state */}
        {error && (
          <p className="text-red-500 text-lg font-semibold text-center bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
            Error: {error}
          </p>
        )}

        {/* No posts found */}
        {!loading && filteredPosts.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-lg text-center italic p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            No posts found for this tag.
          </p>
        )}

        {/* Posts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {filteredPosts.map((post) => (
            <div
              key={post._id}
              className="transform hover:scale-105 transition-transform duration-300"
            >
              <CardOfPost
                _id={post._id}
                slug={post.slug}
                title={post.title}
                thumbnail={post.thumbnail}
                author={post.author}
                category={
                  typeof post.category === "string"
                    ? { _id: post.category }
                    : post.category
                }
                categoryMap={categoryMap}
                createdAt={post.createdAt}
                tags={post.tags}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagWisePage;