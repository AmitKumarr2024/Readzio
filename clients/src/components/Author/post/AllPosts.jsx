import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TimeAgo from "../../../Utils/TimeAgo";
import Pagination from "../../../Utils/Pagination";

function AllPosts({ posts, userOnly = false, userId, loading, error }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  if (loading) return <p className="text-center text-gray-600">Loading posts...</p>;
  if (error)
    return (
      <p className="text-center text-red-600">Error loading posts: {error}</p>
    );

  let filteredPosts = [...posts];
  if (userOnly && userId) {
    filteredPosts = filteredPosts.filter(
      (post) => post?.author?._id === userId
    );
  }

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (filter === "mostViewed") return (b.views || 0) - (a.views || 0);
    if (filter === "mostLiked")
      return (b.likes?.length || 0) - (a.likes?.length || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

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
    <section className="p-6 bg-white rounded-lg shadow-md border border-gray-200 max-w-7xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">All Posts</h2>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {["newest", "mostViewed", "mostLiked"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition
              ${
                filter === f
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            type="button"
            aria-pressed={filter === f}
          >
            {f === "newest"
              ? "Newest"
              : f === "mostViewed"
              ? "Most Viewed"
              : "Most Liked"}
          </button>
        ))}
      </div>

      {/* Table View */}
      {currentPosts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
            <thead className="bg-gray-50">
              <tr>
                {["Title", "Author", "Likes", "Views", "Comments", "Posted"].map((col) => (
                  <th
                    key={col}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
                    ${["Likes", "Views", "Comments", "Posted"].includes(col) ? "text-center" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPosts.map((post) => (
                <tr
                  key={post._id}
                  onClick={() => navigate(`/post/${post.slug}`)}
                  className="cursor-pointer hover:bg-indigo-50 transition"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/post/${post.slug}`);
                    }
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap line-clamp-1 max-w-[400px] text-gray-800 font-medium">
                    {post.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {post.author?.name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {post.likes?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {post.views || 0}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {post.commentsCount || 0}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    <TimeAgo date={post.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-8">No posts found 😢</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </section>
  );
}

export default AllPosts;
