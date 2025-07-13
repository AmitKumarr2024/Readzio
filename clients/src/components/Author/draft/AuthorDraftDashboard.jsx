import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaSpinner, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "../../../Utils/Button";
import { getDraftAndPendingPosts, deletePost } from "../../../store/postSlice";
import toast from "react-hot-toast";

const AuthorDraftDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { draftPendingPosts, draftPendingLoading, draftPendingError } = useSelector((state) => state.post);
  const { isAuthenticated, user: loggedInUser } = useSelector((state) => state.auth);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to view your drafts.");
      navigate("/login");
      return;
    }
    if (loggedInUser?._id) {
      dispatch(getDraftAndPendingPosts());
    }
  }, [dispatch, loggedInUser, isAuthenticated, navigate]);

  const handleEdit = useCallback((slug) => {
    navigate(`/edit-draft/${slug}`);
  }, [navigate]);

  const handleDelete = useCallback(
    async (postId) => {
      if (window.confirm("Are you sure you want to delete this draft?")) {
        setDeletingId(postId);
        try {
          await dispatch(deletePost(postId)).unwrap();
          toast.success("Post deleted successfully");
          dispatch(getDraftAndPendingPosts());
        } catch (error) {
          toast.error("Failed to delete post. Please try again.");
        } finally {
          setDeletingId(null);
        }
      }
    },
    [dispatch]
  );

  const handleView = useCallback(
    async (post) => {
      try {
        await dispatch(getSinglePost({ slug: post.slug, isGuest: false })).unwrap();
        navigate(`/post/${post.slug}`);
      } catch (error) {
        toast.error(error.message.includes("not found") ? `Post "${post.slug}" not found.` : "Failed to view post.");
      }
    },
    [dispatch, navigate]
  );

  if (!isAuthenticated) return null;

  if (draftPendingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading drafts...</p>
      </div>
    );
  }

  if (draftPendingError) {
    return (
      <div className="text-center mt-20">
        <p className="text-red-600 mb-4">{draftPendingError}</p>
        <Button
          onClick={() => dispatch(getDraftAndPendingPosts())}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Draft & Pending Posts</h2>
      {errorMessage && <p className="text-red-600 mb-4 text-center">{errorMessage}</p>}
      {draftPendingPosts.length > 0 ? (
        <div className="space-y-4">
          {draftPendingPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 border rounded-lg bg-card text-card-foreground hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold">{post.title}</h3>
              <p className="text-muted-foreground">Last Edited: {new Date(post.updatedAt).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleEdit(post.slug)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <FaEdit /> Edit
                </Button>
                <Button
                  onClick={() => handleView(post)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaEye /> View
                </Button>
                <Button
                  onClick={() => handleDelete(post._id)}
                  disabled={deletingId === post._id}
                  className={`px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2 ${
                    deletingId === post._id ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {deletingId === post._id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center">No drafts or pending posts found. Start creating! ✍️</p>
      )}
    </div>
  );
};

export default AuthorDraftDashboard;