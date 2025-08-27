import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllPosts,
  toggleBlockPost,
  deletePost,
  clearError,
} from "../../../store/adminSlice";
import Pagination from "../../../Utils/Pagination";
import {
  Search,
  SortAsc,
  SortDesc,
  Filter,
  Eye,
  Trash2,
  Shield,
  ShieldOff,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import PostSizeSummary from "./PostSizeSummary";

const PostManagement = () => {
  const dispatch = useDispatch();
  const {
    posts = [],
    loading = false,
    error = null,
    currentPagePosts = 1,
    totalPagesPosts = 1,
    totalPosts = 0,
  } = useSelector((state) => state.admin || {});

  const [page, setPage] = useState(currentPagePosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSummary, setShowSummary] = useState(true);

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
      dispatch(
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
    if (
      window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    ) {
      try {
        const result = await dispatch(deletePost(postId)).unwrap();
        toast.success(result.message || "Post deleted successfully");
        dispatch(
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

  const handlePageChange = (newPage) => setPage(newPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (statusFilter === "blocked") return post.blocked;
    if (statusFilter === "active") return !post.blocked;
    return true;
  });

  const getSortIcon = (field) => {
    if (sortField !== field) return <SortAsc className="w-4 h-4 opacity-50" />;
    return sortOrder === "asc" ? (
      <SortAsc className="w-4 h-4 text-blue-500" />
    ) : (
      <SortDesc className="w-4 h-4 text-blue-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Post Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage and monitor all posts in your platform
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {totalPosts.toLocaleString()} Posts
                </span>
              </div>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showSummary ? "Hide" : "Show"} Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 dark:text-red-200">
                  Error occurred
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={() => dispatch(clearError())}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {showSummary && <PostSizeSummary posts={posts} />}

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title or content..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="blocked">Blocked Only</option>
                </select>
              </div>

              {/* Sort Buttons */}
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-600 pl-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Sort by:
                </span>
                <button
                  onClick={() => handleSort("title")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    sortField === "title"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {getSortIcon("title")}
                  <span className="text-sm font-medium">Title</span>
                </button>
                <button
                  onClick={() => handleSort("author.name")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    sortField === "author.name"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {getSortIcon("author.name")}
                  <span className="text-sm font-medium">Author</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Loading posts...
              </p>
            </div>
          </div>
        )}

        {/* Posts Table */}
        {!loading && filteredPosts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Post Details
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Author
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPosts.map((post, index) => {
                    const serial = (page - 1) * 10 + index + 1;
                    return (
                      <tr
                        key={post._id}
                        className="hover:bg-background-dark dark:hover:bg-background-light  text-text-main-light dark:text-text-main-dark transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main-light dark:text-text-main-dark">
                          {serial}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <h3
                              className="text-sm font-semibold  text-text-main-light dark:text-text-main-dark  truncate"
                              title={post.title}
                            >
                              {post.title}
                            </h3>
                            <p className="text-xs text-text-main-light dark:text-text-main-dark mt-1">
                              ID: {post._id.slice(-8)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-text-main-light dark:text-text-main-dark">
                                {(post.author?.name || "N")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                                {post.author?.name || "Unknown Author"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {post.sizeInKB ? (
                              <div>
                                <span className="font-mono text-text-main-light dark:text-text-main-dark">
                                  {parseFloat(post.sizeInKB).toFixed(1)} KB
                                </span>
                                <p className="text-xs text-text-main-light dark:text-text-main-dark">
                                  {(post.sizeInKB / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            ) : (
                              <span className="text-text-main-light dark:text-text-main-dark">
                                N/A
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              post.blocked
                                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                                : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                            }`}
                          >
                            {post.blocked ? (
                              <ShieldOff className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            {post.blocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBlock(post._id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                post.blocked
                                  ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                  : "bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm"
                              }`}
                              title={
                                post.blocked ? "Unblock post" : "Block post"
                              }
                            >
                              {post.blocked ? (
                                <Shield className="w-3 h-3" />
                              ) : (
                                <ShieldOff className="w-3 h-3" />
                              )}
                              {post.blocked ? "Unblock" : "Block"}
                            </button>
                            <button
                              onClick={() => handleDelete(post._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                              title="Delete post permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Showing {filteredPosts.length} of {totalPosts} posts
                  {statusFilter !== "all" && ` (${statusFilter} only)`}
                </span>
                {searchQuery && <span>Search: "{searchQuery}"</span>}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPosts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                No posts found
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? `No posts match your search "${searchQuery}"`
                  : statusFilter !== "all"
                  ? `No ${statusFilter} posts found`
                  : "No posts have been created yet"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredPosts.length > 0 && totalPagesPosts > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPagesPosts}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostManagement;
