import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TimeAgo from "../../../Utils/TimeAgo";
import Pagination from "../../../Utils/Pagination";
import { motion } from "framer-motion";
import { FaSort, FaSpinner } from "react-icons/fa";

function AllPosts({ posts = [], userOnly = false, userId, loading, error }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  console.log("AllPosts props:", { userId, userOnly, postCount: posts.length });
  console.log("Posts before filtering:", posts.map(p => ({ id: p._id, authorId: p.author?._id })));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
      >
        <p className="text-lg font-semibold text-red-600">Error: {error}</p>
      </motion.div>
    );
  }

  // Filter posts to show only the specified author's posts
  const filteredPosts = userOnly && userId
    ? posts.filter((post) => {
        const isMatch = post?.author?._id?.toString() === userId;
        console.log(`Post ID: ${post?._id}, Author ID: ${post?.author?._id}, Matches userId (${userId}): ${isMatch}`);
        return isMatch;
      })
    : posts;

  // Show message if no posts match for the author
  if (filteredPosts.length === 0 && userOnly && userId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
      >
        <p className="text-lg font-semibold text-gray-600">
          No posts found for this author.
        </p>
      </motion.div>
    );
  }

  // Sort posts based on filter
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (filter === "mostViewed") return (b.views || 0) - (a.views || 0);
    if (filter === "mostLiked") return (b.likes?.length || 0) - (a.likes?.length || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const currentPosts = sortedPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-10 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-6"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            {userOnly ? "Author's Posts" : "All Posts"}
          </h2>

          {/* Filters */}
          <div className="sticky top-0 bg(RuntimeError: Evaluation failed: ReferenceError: p is not defined
    at __puppeteer_evaluation_script__:6:39)ackground-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 z-10">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {["newest", "mostViewed", "mostLiked"].map((f) => (
                <motion.button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm sm:text-base rounded-full font-semibold transition-all ${
                    filter === f
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSort className="w-4 h-4" />
                  {f === "newest" ? "Newest" : f === "mostViewed" ? "Most Viewed" : "Most Liked"}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Table */}
          {currentPosts.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark text-sm">
                  <tr>
                    <th className="w-[30%] px-4 py-3 text-left font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Title
                    </th>
                    <th className="w-[20%] px-4 py-3 text-left font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Author
                    </th>
                    <th className="w-[10%] px-4 py-3 text-center font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Likes
                    </th>
                    <th className="w-[10%] px-4 py-3 text-center font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Views
                    </th>
                    <th className="w-[10%] px-4 py-3 text-center font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Comments
                    </th>
                    <th className="w-[20%] px-4 py-3 text-center font-semibold text-text-main-light dark:text-text-main-dark uppercase tracking-wider text-xs">
                      Posted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark divide-y divide-gray-100">
                  {currentPosts.map((post) => (
                    <motion.tr
                      key={post._id}
                      onClick={() => navigate(`/post/${post.slug}`)}
                      className="cursor-pointer hover:bg-indigo-50 transition-all duration-200"
                      whileHover={{ scale: 1.01 }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/post/${post.slug}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-[300px] text-gray-400 font-medium">
                        {post.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {post.author?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {post.likes?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {post.views || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {post.commentsCount || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        <TimeAgo date={post.createdAt} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 text-base sm:text-lg py-10"
            >
              No posts found 😢
            </motion.p>
          )}

          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex justify-center"
            >
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AllPosts;