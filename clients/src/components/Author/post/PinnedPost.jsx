import React, { useState, useEffect } from "react";
import CardOfPost from "../../Cards/CardOfPost";
import { useDispatch } from "react-redux";
import { updatePost } from "../../../store/postSlice";

// Helper to extract ID from object or string
const getId = (val) => (typeof val === "object" ? val?._id : val);

function PinnedPost({ posts = [], userId, loggedInUserId }) {
  const dispatch = useDispatch();

  const isOwner = getId(loggedInUserId) === getId(userId);

  // Show all posts if owner, else only pinned posts
  const [localPosts, setLocalPosts] = useState([]);
  // Posts selected via checkbox (only if owner)
  const [selectedPosts, setSelectedPosts] = useState([]);

  useEffect(() => {
    const filteredPosts = posts.filter(
      (post) =>
        getId(post.author) === getId(userId) &&
        (isOwner ? true : post.isPinned === true)
    );
    setLocalPosts(filteredPosts);
  }, [posts, userId, isOwner]);

  // Toggle checkbox selection for post ID (only for owner)
  const toggleSelectPost = (postId) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  // Handle pinning/unpinning selected posts (only for owner)
  const handlePinSelected = async () => {
    if (selectedPosts.length === 0) {
      alert("Please select posts to pin/unpin");
      return;
    }

    try {
      for (const postId of selectedPosts) {
        // Find current post to toggle its isPinned status
        const currentPost = localPosts.find((p) => p._id === postId);
        if (!currentPost) continue;

        const newPinStatus = !currentPost.isPinned;
        console.log(`Updating post ${postId} to isPinned: ${newPinStatus}`);

        const updated = await dispatch(
          updatePost({ postId, updateData: { isPinned: newPinStatus } })
        ).unwrap();

        console.log(`Post ${postId} updated:`, updated);

        setLocalPosts((prev) => {
          // Remove old post
          let filtered = prev.filter((p) => p._id !== updated._id);
          // Add updated post only if owner view or post is pinned (to keep list consistent)
          if (isOwner || updated.isPinned) {
            filtered = [...filtered, updated];
          }
          return filtered;
        });
      }
      setSelectedPosts([]);
    } catch (error) {
      console.error("Error updating posts:", error);
    }
  };

  // Debug logs
  console.log("isOwner:", isOwner);
  console.log("localPosts:", localPosts);
  console.log("selectedPosts:", selectedPosts);

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-4 text-foreground">📌 Pinned Posts</h2>

      {/* Show Pin Selected Posts button only if owner */}
      {isOwner && (
        <button
          onClick={handlePinSelected}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Toggle Pin Selected Posts
        </button>
      )}

      {localPosts.length > 0 ? (
        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
          {localPosts.map((post) => (
            <div key={post._id} className="relative border rounded p-2">
              {/* Show checkbox only if owner */}
              {isOwner && (
                <input
                  type="checkbox"
                  checked={selectedPosts.includes(post._id)}
                  onChange={() => toggleSelectPost(post._id)}
                  className="absolute top-2 right-2 w-5 h-5"
                />
              )}

              {/* Pinned badge */}
              {post.isPinned && (
                <span className="absolute top-2 left-2 bg-yellow-400 text-black px-2 rounded text-xs font-semibold">
                  Pinned
                </span>
              )}

              <CardOfPost {...post} author={post.author} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center">
          {isOwner
            ? "You don't have any posts yet."
            : "No pinned posts available to show."}{" "}
          🔍
        </p>
      )}
    </div>
  );
}

export default PinnedPost;
