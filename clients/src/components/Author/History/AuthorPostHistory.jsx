import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts, deletePost } from "../../../store/postSlice";
import { Button } from "../../../Utils/Button";
import EditPostModal from "./EditPostModal";
import toast from "react-hot-toast";
import { Pencil, Trash } from "lucide-react";
import Pagination from "../../../Utils/Pagination";
import { motion } from "framer-motion";
import { FaFileAlt, FaSpinner } from "react-icons/fa";

function AuthorPostHistory({ userId }) {
  const dispatch = useDispatch();
  const { posts, loading, error, updateError, deleteError } = useSelector(
    (state) => state.post
  );
  const [editPost, setEditPost] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 15;

  useEffect(() => {
    dispatch(getAllPosts());
  }, [dispatch]);

  const userPosts = posts.filter((post) => post.author._id === userId);
  const totalPages = Math.ceil(userPosts.length / postsPerPage);
  const paginatedPosts = userPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  const handleEditClick = (post) => setEditPost(post);

  const handleRefresh = async () => {
    try {
      await dispatch(getAllPosts()).unwrap();
      toast.success("Posts refreshed!");
    } catch (error) {
      toast.error("Failed to refresh posts!");
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await dispatch(deletePost(postId)).unwrap();
        toast.success("Post deleted!");
        dispatch(getAllPosts());
      } catch (error) {
        toast.error("Failed to delete post!");
      }
    }
  };

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark   backdrop-blur-xl rounded-2xl shadow-xl p-6"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark flex items-center gap-3">
              <FaFileAlt className="text-indigo-600" /> Post History
            </h2>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleRefresh}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
              >
                Refresh
              </Button>
            </motion.div>
          </div>

          {loading && (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
              <motion.div
                className="flex flex-col items-center space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark">
                  Loading...
                </p>
              </motion.div>
            </div>
          )}
          {(error || updateError || deleteError) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-red-600 text-lg font-semibold py-6"
            >
              {error?.message ||
                updateError?.message ||
                deleteError?.message ||
                "Something went wrong!"}
            </motion.p>
          )}

          {userPosts.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="min-w-full bg-background-light dark:bg-background-dark    divide-y divide-gray-200 text-sm">
                  <thead className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark">
                    <tr>
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
                          className="px-6 py-4 text-left font-semibold   text-text-main-light dark:text-text-main-dark uppercase tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedPosts.map((post, idx) => (
                      <motion.tr
                        key={post._id}
                        className={`hover:bg-indigo-400  transition-all duration-200 ${
                          idx % 2 === 1 ? "bg-background-light dark:bg-background-dark " : ""
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <td
                          className="px-6 py-4 max-w-xs truncate  text-text-main-light dark:text-text-main-dark font-medium"
                          title={post.title}
                        >
                          {post.title}
                        </td>
                        <td className="px-6 py-4">{post.status}</td>
                        <td className="px-6 py-4">
                          {post.isFeatured ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4">
                          {post.isPinned ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4">
                          {post.isPublished ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4">
                          {post.allowComments ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4">
                          {post.tags?.join(", ") || "None"}
                        </td>
                        <td className="px-6 py-4">
                          {post.status === "draft"
                            ? formatDate(post.updatedAt)
                            : formatDate(post.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <motion.button
                              onClick={() => handleEditClick(post)}
                              className="p-2 rounded-full bg-indigo-600   text-text-main-light dark:text-text-main-dark hover:bg-indigo-700"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Pencil className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(post._id)}
                              className="p-2 rounded-full bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark hover:bg-gray-300"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Trash className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden space-y-4">
                {paginatedPosts.map((post) => (
                  <motion.div
                    key={post._id}
                    className="p-5 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
                      {post.title}
                    </h3>
                    <p className="text-sm  text-text-main-light dark:text-text-main-dark">
                      <strong>Status:</strong> {post.status}
                    </p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">
                      <strong>Published:</strong>{" "}
                      {post.isPublished ? "Yes" : "No"}
                    </p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">
                      <strong>Featured:</strong>{" "}
                      {post.isFeatured ? "Yes" : "No"}
                    </p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">
                      <strong>Tags:</strong> {post.tags?.join(", ") || "None"}
                    </p>
                    <p className="text-sm text-text-main-light dark:text-text-main-dark">
                      <strong>Date:</strong>{" "}
                      {formatDate(
                        post.status === "draft"
                          ? post.updatedAt
                          : post.createdAt
                      )}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <motion.button
                        onClick={() => handleEditClick(post)}
                        className="p-2 rounded-full bg-indigo-600 text-text-main-light dark:text-text-main-dark hover:bg-indigo-700"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Pencil className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDelete(post._id)}
                        className="p-2 rounded-full bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark hover:bg-gray-300"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Trash className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex justify-center"
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </motion.div>
              )}
            </>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-text-main-light dark:text-text-main-dark text-lg py-36"
            >
              Koi post history nahi hai! 📝
            </motion.p>
          )}

          <EditPostModal
            post={editPost}
            isOpen={!!editPost}
            onClose={() => setEditPost(null)}
            onSave={() => dispatch(getAllPosts())}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AuthorPostHistory;
