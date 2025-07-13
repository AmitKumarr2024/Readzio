import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaSpinner, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "../../../Utils/Button";
import {
  getDraftAndPendingPosts,
  deletePost,
  updatePost,
  getSinglePost,
} from "../../../store/postSlice";

const AuthorDraftDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { draftPendingPosts, draftPendingLoading, draftPendingError } =
    useSelector((state) => state.post);
  const loggedInUser = useSelector((state) => state.auth.user);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (loggedInUser?._id) {
      dispatch(getDraftAndPendingPosts());
    }
  }, [dispatch, loggedInUser]);

  const handleEdit = useCallback(
    (slug) => {
      navigate(`/edit-post/${slug}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (postId) => {
      if (window.confirm("Are you sure you want to delete this draft?")) {
        setDeletingId(postId);
        try {
          await dispatch(deletePost(postId)).unwrap();
          dispatch(getDraftAndPendingPosts());
        } catch (error) {
          console.error("Delete post failed:", error);
          setErrorMessage("Failed to delete post. Please try again.");
        } finally {
          setDeletingId(null);
        }
      }
    },
    [dispatch]
  );

  const handleView = useCallback(
    async (post) => {
      const { slug, status, isPublished } = post;
      try {
        if (!loggedInUser?._id) {
          setErrorMessage("Please log in to view draft or pending posts.");
          return;
        }

        if (
          (!isPublished || status !== "published") &&
          post.author !== loggedInUser._id &&
          loggedInUser.role !== "admin"
        ) {
          setErrorMessage("You do not have permission to view this post.");
          return;
        }

        await dispatch(getSinglePost(slug)).unwrap();
        navigate(`/post/${slug}`);
      } catch (error) {
        console.error("View post failed:", error);
        const errMsg =
          typeof error === "string"
            ? error
            : error.message || "Failed to view post";
        setErrorMessage(
          errMsg.includes("not found")
            ? `Post "${slug}" not found or has been deleted.`
            : "Failed to view post. Please try again."
        );
        dispatch(getDraftAndPendingPosts());
      }
    },
    [dispatch, navigate, loggedInUser]
  );

  const handleUpdateStatus = useCallback(
    async (slug, newStatus) => {
      const validStatuses = ["draft", "pending", "published"];
      if (!validStatuses.includes(newStatus)) {
        setErrorMessage(`Invalid status: ${newStatus}`);
        return;
      }

      const updateData = {
        status: newStatus,
        ...(newStatus === "published" && {
          isPublished: true,
          blocked: false,
        }),
      };

      try {
        await dispatch(updatePost({ slug, updateData })).unwrap();
        dispatch(getDraftAndPendingPosts());
      } catch (error) {
        console.error("Update status failed:", error);
        setErrorMessage(
          typeof error === "string"
            ? error
            : error.message?.includes("enum")
            ? `Invalid status value: ${newStatus}`
            : "Failed to update post status. Please try again."
        );
      }
    },
    [dispatch]
  );

  if (draftPendingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
          Loading drafts...
        </p>
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
      <h2 className="text-2xl font-bold mb-6 text-foreground">
        Draft & Pending Posts
      </h2>
      {errorMessage && (
        <p className="text-red-600 mb-4 text-center">{errorMessage}</p>
      )}
      {draftPendingPosts.length > 0 ? (
        <div className="space-y-4">
          {draftPendingPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 border rounded-lg bg-card text-card-foreground hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold">{post.title}</h3>
              <p className="text-muted-foreground">
                Last Edited: {new Date(post.updatedAt).toLocaleDateString()}
              </p>
              <p className="text-muted-foreground capitalize">
                Status: {post.status}
              </p>
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
                    deletingId === post._id
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {deletingId === post._id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaTrash />
                  )}
                  Delete
                </Button>
                {post.status === "draft" && (
                  <Button
                    onClick={() => handleUpdateStatus(post.slug, "pending")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Submit for Review
                  </Button>
                )}
                {post.status === "pending" && (
                  <Button
                    onClick={() => handleUpdateStatus(post.slug, "draft")}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Revert to Draft
                  </Button>
                )}
                {post.status !== "published" && (
                  <Button
                    onClick={() => handleUpdateStatus(post.slug, "published")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Publish Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center">
          No drafts or pending posts found. Start creating! ✍️
        </p>
      )}
    </div>
  );
};

export default AuthorDraftDashboard;
