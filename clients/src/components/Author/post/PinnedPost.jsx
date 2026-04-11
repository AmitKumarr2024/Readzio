import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { updatePost, getAllPosts } from "../../../store/postSlice";
import CardOfPost from "../../Cards/CardOfPost";
import { toast } from "react-hot-toast";
import {
  Pin,
  PinOff,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  FileText,
} from "lucide-react";

// ─── Helper: safely extract _id from a populated or plain reference ───────────
const getId = (val) => (val && typeof val === "object" ? val?._id : val);

// ─── Pin Badge ─────────────────────────────────────────────────────────────────
// Shown on top-left of each card when the post is currently pinned
function PinBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                 bg-amber-100 text-amber-700 border border-amber-200
                 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    >
      <Pin className="w-3 h-3" />
      Pinned
    </span>
  );
}

// ─── Selection Checkbox ────────────────────────────────────────────────────────
// Styled checkbox used by the owner to select posts for bulk pin/unpin
function SelectBox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      aria-label={checked ? "Deselect post" : "Select post"}
      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-150
                  ${
                    checked
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-400"
                  }`}
    >
      {checked ? (
        <CheckSquare className="w-4 h-4" />
      ) : (
        <Square className="w-4 h-4" />
      )}
    </button>
  );
}

// ─── Post Card Wrapper ─────────────────────────────────────────────────────────
// Wraps each CardOfPost with selection state, pin badge, and owner controls
function PostCard({ post, isOwner, isSelected, onToggleSelect, author }) {
  return (
    <div
      className={`relative bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200
                  ${
                    isSelected
                      ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/50"
                      : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                  }`}
    >
      {/* ── Top badge row: pin status (left) + select checkbox (right, owner only) */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Pin badge — shown when post is currently pinned */}
        <div className="pointer-events-none">
          {post.isPinned && <PinBadge />}
        </div>

        {/* Selection checkbox — only visible to the post owner */}
        {isOwner && (
          <div className="pointer-events-auto">
            <SelectBox
              checked={isSelected}
              onChange={() => onToggleSelect(post.slug)}
            />
          </div>
        )}
      </div>

      {/* ── Post card content — padded top to clear the badge row ── */}
      <div className="pt-10 p-4">
        <CardOfPost {...post} author={author || post.author} />
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────
// Pulsing placeholder cards shown while saving pin changes
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
// Shown when there are no posts to display in this section
function EmptyState({ isOwner }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <FileText className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-base font-medium text-gray-600 dark:text-gray-400">
        {isOwner ? "No posts yet" : "No pinned posts"}
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
        {isOwner
          ? "Select posts from your history to pin them here"
          : "This author hasn't pinned any posts yet"}
      </p>
    </div>
  );
}

// ─── Main PinnedPost Component ─────────────────────────────────────────────────
function PinnedPost({ posts = [], userId, loggedInUserId, readOnly, author }) {
  const dispatch = useDispatch();

  // Determine if the current viewer is the post owner (can select & pin)
  const isOwner = !readOnly && getId(loggedInUserId) === getId(userId);

  // Local copy of posts filtered for this author
  const [localPosts, setLocalPosts] = useState([]);

  // Slugs of posts currently selected for bulk pin/unpin
  const [selectedSlugs, setSelectedSlugs] = useState([]);

  // Tracks async pin-save operation
  const [isSaving, setIsSaving] = useState(false);

  // ── Filter posts to this author + visibility rules ────────────────────────
  // Owner sees ALL their posts (to be able to toggle pin on any)
  // Visitors only see already-pinned posts
  useEffect(() => {
    const filtered = posts.filter(
      (post) =>
        getId(post.author) === getId(userId) &&
        (isOwner ? true : post.isPinned === true),
    );
    setLocalPosts(filtered);
  }, [posts, userId, isOwner]);

  // ── Toggle a single post in/out of the selection set ──────────────────────
  const toggleSelectPost = useCallback((slug) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  // ── Select / Deselect all posts at once ───────────────────────────────────
  const toggleSelectAll = useCallback(() => {
    const allSlugs = localPosts.map((p) => p.slug);
    // If everything is already selected, deselect all; otherwise select all
    setSelectedSlugs((prev) =>
      prev.length === allSlugs.length ? [] : allSlugs,
    );
  }, [localPosts]);

  // ── Bulk pin/unpin handler ────────────────────────────────────────────────
  // Iterates over selected slugs, flips each post's isPinned, then re-fetches
  const handlePinSelected = async () => {
    if (selectedSlugs.length === 0) {
      toast.error("Select at least one post to pin or unpin.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(`Updating ${selectedSlugs.length} post(s)…`);

    try {
      // Process each selected post sequentially
      for (const slug of selectedSlugs) {
        const currentPost = localPosts.find((p) => p.slug === slug);
        if (!currentPost) continue;

        const newPinStatus = !currentPost.isPinned; // flip current pin state

        await dispatch(
          updatePost({ slug, updateData: { isPinned: newPinStatus } }),
        ).unwrap();

        // Immediately reflect the change in local state for instant UI feedback
        setLocalPosts((prev) =>
          prev.map((p) =>
            p.slug === slug ? { ...p, isPinned: newPinStatus } : p,
          ),
        );
      }

      // Re-fetch from server to keep Redux store in sync
      await dispatch(getAllPosts({ userId })).unwrap();

      setSelectedSlugs([]); // clear selection after success
      toast.success("Pin status updated!", { id: toastId });
    } catch (err) {
      // Show error and keep selection so user can retry
      console.error("[PinnedPost] Bulk pin/unpin failed:", err);
      toast.error("Failed to update pin status. Please try again.", {
        id: toastId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived counts for UI labels ──────────────────────────────────────────
  const pinnedCount = localPosts.filter((p) => p.isPinned).length;
  const allSelected =
    selectedSlugs.length === localPosts.length && localPosts.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Pin className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Pinned Posts
            </h1>
          </div>
          {/* Subtitle: post count summary */}
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
            {pinnedCount} pinned · {localPosts.length} total
            {isOwner && localPosts.length > 0 && (
              <span className="text-gray-400">
                {" "}
                · select posts to toggle pin
              </span>
            )}
          </p>
        </div>

        {/* ── Main card container ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* ── Toolbar (only shown when owner has posts) ────────────────── */}
          {isOwner && localPosts.length > 0 && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                            px-5 py-4 border-b border-gray-100 dark:border-gray-800"
            >
              {/* Left: select all toggle */}
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400
                           hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {allSelected ? "Deselect all" : "Select all"}
              </button>

              {/* Right: pin/unpin action button */}
              <button
                onClick={handlePinSelected}
                disabled={isSaving || selectedSlugs.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                           bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                           text-white transition-all shadow-sm"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : selectedSlugs.some(
                    (slug) => localPosts.find((p) => p.slug === slug)?.isPinned,
                  ) ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Pin className="w-4 h-4" />
                )}
                {isSaving
                  ? "Saving…"
                  : `Toggle Pin${selectedSlugs.length > 0 ? ` (${selectedSlugs.length})` : ""}`}
              </button>
            </div>
          )}

          {/* ── Selection hint banner (shown when items are selected) ──── */}
          {isOwner && selectedSlugs.length > 0 && (
            <div
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20
                            border-b border-indigo-100 dark:border-indigo-900/40"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                {selectedSlugs.length} post
                {selectedSlugs.length !== 1 ? "s" : ""} selected — clicking
                "Toggle Pin" will flip their pinned status.
              </p>
            </div>
          )}

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div className="p-4 sm:p-5 lg:p-6">
            {/* Loading skeleton while saving */}
            {isSaving && <SkeletonGrid />}

            {/* Empty state */}
            {!isSaving && localPosts.length === 0 && (
              <EmptyState isOwner={isOwner} />
            )}

            {/* ── Post grid ──────────────────────────────────────────────── */}
            {/* Responsive: 1 col mobile → 2 cols tablet → 3 cols desktop  */}
            {!isSaving && localPosts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {localPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    isOwner={isOwner}
                    isSelected={selectedSlugs.includes(post.slug)}
                    onToggleSelect={toggleSelectPost}
                    author={author}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PinnedPost;
