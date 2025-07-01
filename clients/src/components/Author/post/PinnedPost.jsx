import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updatePost, getAllPosts } from "../../../store/postSlice";
import CardOfPost from "../../Cards/CardOfPost";
import { motion } from "framer-motion";
import { FaThumbtack, FaSpinner, FaCheckSquare } from "react-icons/fa";

const getId = (val) => (val && typeof val === "object" ? val?._id : val);

function PinnedPost({ posts = [], userId, loggedInUserId, readOnly, author }) {
  const dispatch = useDispatch();
  const isOwner = !readOnly && getId(loggedInUserId) === getId(userId);
  const [localPosts, setLocalPosts] = useState([]);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter posts for the viewed author
  useEffect(() => {
    console.log("[PinnedPost] Input posts:", posts); // Debug
    const filteredPosts = posts.filter(
      (post) =>
        getId(post.author) === getId(userId) &&
        (isOwner ? true : post.isPinned === true)
    );
    console.log("[PinnedPost] Filtered localPosts:", filteredPosts); // Debug
    setLocalPosts(filteredPosts);
  }, [posts, userId, isOwner]);

  const toggleSelectPost = (slug) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handlePinSelected = async () => {
    if (selectedSlugs.length === 0) {
      alert("Please select posts to pin/unpin");
      return;
    }

    setIsLoading(true);
    try {
      for (const slug of selectedSlugs) {
        const currentPost = localPosts.find((p) => p.slug === slug);
        if (!currentPost) continue;

        const newPinStatus = !currentPost.isPinned;
        console.log(`[PinnedPost] Updating post ${slug} to isPinned=${newPinStatus}`); // Debug
        await dispatch(
          updatePost({
            slug,
            updateData: { isPinned: newPinStatus },
          })
        ).unwrap();

        // Update localPosts with new pin status
        setLocalPosts((prev) =>
          prev.map((p) =>
            p.slug === slug ? { ...p, isPinned: newPinStatus } : p
          )
        );
      }

      // Refetch posts to update Redux store
      console.log("[PinnedPost] Refetching posts for userId:", userId); // Debug
      await dispatch(getAllPosts({ userId })).unwrap();
      setSelectedSlugs([]);
    } catch (err) {
      console.error("[PinnedPost] Bulk pin/unpin failed:", err);
      alert("Failed to update pin status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <motion.div
          className="flex flex-col items-center space-y-4"
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-8 sm:py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8"
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3">
              <FaThumbtack className="text-indigo-600 w-6 h-6 sm:w-8 sm:h-8" /> Pinned Posts
            </h2>
            {!readOnly && isOwner && (
              <motion.button
                onClick={handlePinSelected}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base lg:text-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all duration-300 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <FaCheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                Toggle Pin ({selectedSlugs.length})
              </motion.button>
            )}
          </div>

          {localPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8 overflow-y-auto max-h-[80vh] sm:max-h-none">
              {localPosts.map((post) => (
                <motion.div
                  key={post._id}
                  className={`relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300 ${
                    selectedSlugs.includes(post.slug) ? "ring-2 ring-indigo-500" : ""
                  }`}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  {!readOnly && isOwner && (
                    <motion.div
                      className="absolute top-3 right-3 z-10"
                      whileHover={{ scale: 1.1 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSlugs.includes(post.slug)}
                        onChange={() => toggleSelectPost(post.slug)}
                        className="w-5 h-5 accent-indigo-600 rounded border-gray-300 shadow-sm cursor-pointer"
                        title="Select to pin/unpin"
                      />
                    </motion.div>
                  )}
                  {post.isPinned && (
                    <motion.span
                      className="absolute top-3 left-3 bg-yellow-400 text-black px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 shadow-sm"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <FaThumbtack className="w-3 sm:w-4 h-3 sm:h-4" /> Pinned
                    </motion.span>
                  )}
                  <div className="pt-8 sm:pt-10">
                    <CardOfPost {...post} author={author || post.author} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 text-base sm:text-lg lg:text-xl py-10"
            >
              {isOwner ? "You don't have any posts yet." : "No pinned posts available."} 🔍
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PinnedPost;