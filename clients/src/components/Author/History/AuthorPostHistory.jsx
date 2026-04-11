import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts, deletePost, updatePost } from "../../../store/postSlice";
import { toast } from "react-hot-toast";
import {
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";
import Pagination from "../../../Utils/Pagination";

// ─── Tag Pills Component ──────────────────────────────────────────────────────
// Shows first 2 tags inline; remaining tags open a dialog on "show more" click
function TagList({ tags, onShowMore }) {
  if (!tags || tags.length === 0)
    return (
      <span className="text-gray-400 dark:text-gray-500 text-xs italic">
        None
      </span>
    );

  const visible = tags.slice(0, 2);
  const hidden = tags.slice(2);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                     bg-indigo-50 text-indigo-700 border border-indigo-100
                     dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
        >
          <Tag className="w-2.5 h-2.5" />
          {tag}
        </span>
      ))}
      {hidden.length > 0 && (
        <button
          onClick={() => onShowMore(tags)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                     bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200
                     dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-900/70
                     transition-colors duration-150 cursor-pointer"
        >
          +{hidden.length} more
        </button>
      )}
    </div>
  );
}

// ─── Tags Dialog ──────────────────────────────────────────────────────────────
// Modal dialog that shows all tags for a post when "show more" is clicked
function TagsDialog({ tags, onClose }) {
  if (!tags) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800
                   w-full max-w-sm p-6 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              All Tags
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tag count badge */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {tags.length} tag{tags.length !== 1 ? "s" : ""} total
        </p>

        {/* All tags displayed as pills */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                         bg-indigo-50 text-indigo-700 border border-indigo-100
                         dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
// Confirmation dialog before permanently deleting a post
function DeleteDialog({ post, onConfirm, onClose }) {
  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800
                   w-full max-w-sm p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Delete post?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Post title preview */}
        <div className="mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
            "{post.title}"
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(post._id)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                       bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Post Dialog ─────────────────────────────────────────────────────────
// Modal dialog for editing post fields inline without leaving the page
function EditDialog({ post, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    post
      ? {
          title: post.title,
          status: post.status,
          isFeatured: post.isFeatured,
          isPinned: post.isPinned,
          isPublished: post.isPublished,
          allowComments: post.allowComments,
          tags: post.tags?.join(", ") || "",
        }
      : {},
  );

  if (!post) return null;

  // Handle any field change uniformly
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    onSave(post._id, {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800
                   w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Edit Post
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Title field */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400
                       transition-all placeholder-gray-400"
            placeholder="Post title"
          />
        </div>

        {/* Status select */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Tags field */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Tags{" "}
            <span className="normal-case font-normal text-gray-400">
              (comma separated)
            </span>
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => handleChange("tags", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400
                       transition-all placeholder-gray-400"
            placeholder="react, hooks, javascript"
          />
        </div>

        {/* Toggle switches for boolean fields */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { key: "isFeatured", label: "Featured" },
            { key: "isPinned", label: "Pinned" },
            { key: "isPublished", label: "Published" },
            { key: "allowComments", label: "Comments" },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
              {/* Custom toggle switch */}
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                    form[key] ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    form[key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700
                       text-white transition-all shadow-sm"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
// Colored badge pill based on post status value
function StatusBadge({ status }) {
  const styles = {
    published:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    draft:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    archived:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
        styles[status] || styles.archived
      }`}
    >
      {status}
    </span>
  );
}

// ─── Bool Badge ───────────────────────────────────────────────────────────────
// Green "Yes" / muted "No" badge for boolean post fields
function BoolBadge({ value }) {
  return value ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">
      No
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AuthorPostHistory({ userId }) {
  const dispatch = useDispatch();
  const { posts, loading, error, updateError, deleteError } = useSelector(
    (state) => state.post,
  );

  // Dialog state — null means closed, object means open with that data
  const [tagsDialog, setTagsDialog] = useState(null); // tags array for tags modal
  const [editPost, setEditPost] = useState(null); // post object for edit modal
  const [deleteTarget, setDeleteTarget] = useState(null); // post object for delete confirm

  // Filter & search state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 15;

  // Fetch all posts on mount
  useEffect(() => {
    dispatch(getAllPosts());
  }, [dispatch]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Filter posts by current user, then by search & status filter
  const userPosts = posts
    .filter((post) => post.author._id === userId)
    .filter((post) =>
      search ? post.title.toLowerCase().includes(search.toLowerCase()) : true,
    )
    .filter((post) => (statusFilter ? post.status === statusFilter : true));

  const totalPages = Math.ceil(userPosts.length / POSTS_PER_PAGE);

  const paginatedPosts = userPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Refresh posts list from server
  const handleRefresh = async () => {
    try {
      await dispatch(getAllPosts()).unwrap();
      toast.success("Posts refreshed!");
    } catch {
      toast.error("Failed to refresh posts.");
    }
  };

  // Save edits dispatched to Redux; close modal on success
  const handleSave = async (postId, updatedFields) => {
    try {
      await dispatch(updatePost({ id: postId, data: updatedFields })).unwrap();
      toast.success("Post updated!");
      setEditPost(null);
      dispatch(getAllPosts());
    } catch {
      toast.error("Failed to update post.");
    }
  };

  // Dispatch delete and refresh list
  const handleDelete = async (postId) => {
    try {
      await dispatch(deletePost(postId)).unwrap();
      toast.success("Post deleted!");
      setDeleteTarget(null);
      dispatch(getAllPosts());
    } catch {
      toast.error("Failed to delete post.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Post History
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
            {userPosts.length} post{userPosts.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* ── Main card ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* ── Toolbar: search, filter, refresh ────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter dropdown */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                           text-white transition-all shadow-sm"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {(error || updateError || deleteError) && (
            <div
              className="mx-4 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                            text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error?.message ||
                updateError?.message ||
                deleteError?.message ||
                "Something went wrong."}
            </div>
          )}

          {/* ── Loading skeleton ─────────────────────────────────────────── */}
          {loading && (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!loading && userPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-600 dark:text-gray-400">
                No posts found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {search || statusFilter
                  ? "Try adjusting your search or filter"
                  : "Your published posts will appear here"}
              </p>
            </div>
          )}

          {/* ── DESKTOP TABLE (hidden on mobile) ─────────────────────────── */}
          {!loading && paginatedPosts.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {[
                      "Title",
                      "Status",
                      "Featured",
                      "Pinned",
                      "Published",
                      "Comments",
                      "Tags",
                      "Date",
                      "Actions",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedPosts.map((post) => (
                    <tr
                      key={post._id}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors duration-100 group"
                    >
                      {/* Title — truncated with full title in tooltip */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <span
                          title={post.title}
                          className="block truncate font-medium text-gray-900 dark:text-white"
                        >
                          {post.title}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={post.status} />
                      </td>

                      <td className="px-5 py-3.5">
                        <BoolBadge value={post.isFeatured} />
                      </td>

                      <td className="px-5 py-3.5">
                        <BoolBadge value={post.isPinned} />
                      </td>

                      <td className="px-5 py-3.5">
                        <BoolBadge value={post.isPublished} />
                      </td>

                      <td className="px-5 py-3.5">
                        <BoolBadge value={post.allowComments} />
                      </td>

                      {/* Tags — first 2 shown; "show more" opens TagsDialog */}
                      <td className="px-5 py-3.5 max-w-[180px]">
                        <TagList
                          tags={post.tags}
                          onShowMore={(tags) => setTagsDialog(tags)}
                        />
                      </td>

                      {/* Date — use updatedAt for drafts, createdAt otherwise */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                        {post.status === "draft"
                          ? formatDate(post.updatedAt)
                          : formatDate(post.createdAt)}
                      </td>

                      {/* Action buttons: edit & delete */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditPost(post)}
                            title="Edit post"
                            className="w-8 h-8 flex items-center justify-center rounded-lg
                                       bg-indigo-50 hover:bg-indigo-100 text-indigo-600
                                       dark:bg-indigo-900/30 dark:hover:bg-indigo-900/60 dark:text-indigo-400
                                       transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(post)}
                            title="Delete post"
                            className="w-8 h-8 flex items-center justify-center rounded-lg
                                       bg-red-50 hover:bg-red-100 text-red-500
                                       dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400
                                       transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── MOBILE CARDS (hidden on desktop) ─────────────────────────── */}
          {!loading && paginatedPosts.length > 0 && (
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedPosts.map((post) => (
                <div key={post._id} className="p-4">
                  {/* Card header: title + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">
                      {post.title}
                    </h3>
                    <StatusBadge status={post.status} />
                  </div>

                  {/* 2-column grid of boolean fields */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3 text-xs">
                    {[
                      { label: "Featured", value: post.isFeatured },
                      { label: "Pinned", value: post.isPinned },
                      { label: "Published", value: post.isPublished },
                      { label: "Comments", value: post.allowComments },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-500 dark:text-gray-400">
                          {label}
                        </span>
                        <BoolBadge value={value} />
                      </div>
                    ))}
                  </div>

                  {/* Tags — same "show more" behavior as desktop */}
                  <div className="mb-3">
                    <TagList
                      tags={post.tags}
                      onShowMore={(tags) => setTagsDialog(tags)}
                    />
                  </div>

                  {/* Footer: date + actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {post.status === "draft"
                        ? formatDate(post.updatedAt)
                        : formatDate(post.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditPost(post)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                   bg-indigo-50 hover:bg-indigo-100 text-indigo-600
                                   dark:bg-indigo-900/30 dark:hover:bg-indigo-900/60 dark:text-indigo-400
                                   transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(post)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                   bg-red-50 hover:bg-red-100 text-red-500
                                   dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400
                                   transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination footer ─────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Page {currentPage} of {totalPages} · {userPosts.length} posts
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs (rendered via portals at root level) ────────────────────── */}

      {/* Tags dialog — opens when "show more" is clicked on a tag list */}
      <TagsDialog tags={tagsDialog} onClose={() => setTagsDialog(null)} />

      {/* Edit dialog — opens when pencil icon is clicked */}
      <EditDialog
        post={editPost}
        onClose={() => setEditPost(null)}
        onSave={handleSave}
      />

      {/* Delete confirmation dialog — opens when trash icon is clicked */}
      <DeleteDialog
        post={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default AuthorPostHistory;
