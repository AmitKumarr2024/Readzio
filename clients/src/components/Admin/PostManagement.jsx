import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllPosts,
  toggleBlockPost,
  deletePost,
  clearError,
} from "../../store/adminSlice";
import Pagination from "../../Utils/Pagination";
import { Search, SortAsc, SortDesc } from "lucide-react";
import toast from "react-hot-toast";

const PostManagement = () => {
  const dispatch = useDispatch();
  const {
    posts,
    loading,
    error,
    currentPagePosts,
    totalPagesPosts,
    totalPosts,
  } = useSelector(
    (state) =>
      state.admin || {
        posts: [],
        loading: false,
        error: null,
        currentPagePosts: 1,
        totalPagesPosts: 1,
        totalPosts: 0,
      }
  );
  const [page, setPage] = useState(currentPagePosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    dispatch(
      getAllPosts({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  }, [dispatch, page, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    setPage(currentPagePosts);
  }, [currentPagePosts]);

const handleToggleBlock = async (postId) => {
  try {
    const result = await dispatch(toggleBlockPost(postId)).unwrap();
    toast.success(result.message || "Post block status updated");

    await dispatch(
      getAllPosts({
        page,
        limit: 10,
        search: searchQuery,
        sortField,
        sortOrder,
      })
    );
  } catch (err) {
    console.error("Toggle block error:", err);
    toast.error(err?.message || "Failed to toggle post status");
  }
};

const handleDelete = async (postId) => {
  if (window.confirm("Are you sure you want to delete this post?")) {
    try {
      const result = await dispatch(deletePost(postId)).unwrap();
      toast.success(result.message || "Post deleted successfully");

      await dispatch(
        getAllPosts({
          page,
          limit: 10,
          search: searchQuery,
          sortField,
          sortOrder,
        })
      );
    } catch (err) {
      console.error("Delete post error:", err);
      toast.error(err?.message || "Failed to delete post");
    }
  }
};


  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Post Management ({totalPosts})
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("title")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === "title" && sortOrder === "asc" ? (
              <SortAsc className="w-5 h-5" />
            ) : (
              <SortDesc className="w-5 h-5" />
            )}
            Title
          </button>
          <button
            onClick={() => handleSort("author.name")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {sortField === "author.name" && sortOrder === "asc" ? (
              <SortAsc className="w-5 h-5" />
            ) : (
              <SortDesc className="w-5 h-5" />
            )}
            Author
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearError())}
            className="text-red-900 font-semibold hover:text-red-700 transition"
          >
            Clear
          </button>
        </div>
      )}

      {loading && <p className="text-gray-500 text-center py-4">Loading...</p>}
      {!loading && filteredPosts.length === 0 && (
        <p className="text-gray-600 text-center py-4">No posts found.</p>
      )}
      {!loading && filteredPosts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 text-left text-sm font-semibold">Title</th>
                <th className="p-4 text-left text-sm font-semibold">Author</th>
                <th className="p-4 text-left text-sm font-semibold">Status</th>
                <th className="p-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr
                  key={post._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-4 text-sm">{post.title}</td>
                  <td className="p-4 text-sm">{post.author?.name || "N/A"}</td>
                  <td className="p-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        post.blocked
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {post.blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleBlock(post._id)}
                        className={`px-3 py-1 rounded-lg text-sm text-white ${
                          post.blocked
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }`}
                      >
                        {post.blocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPosts > 100 && (
        <Pagination
          currentPage={page}
          totalPages={totalPagesPosts}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default PostManagement;
