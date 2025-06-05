import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { deletePost } from "../../store/postSlice"; // Import the existing deletePost thunk

const DeleteModal = ({ isOpen, onClose, postId }) => {
 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null); // State for error message

  // Countdown timer logic
  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Handle delete action
 const handleDelete = async () => {
  if (countdown > 0) return;
  setIsDeleting(true);
  setError(null);
  try {
    await dispatch(deletePost(postId)).unwrap();
    
    navigate("/");
    onClose();
  } catch (error) {
    console.error("Failed to delete post:", error);
    setError(error.message || "Failed to delete post. Please try again.");
    toast.error(error.message || "Deletion failed. Try again.");
  } finally {
    setIsDeleting(false);
  }
};

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2
          id="delete-modal-title"
          className="text-2xl font-semibold text-gray-800 mb-4"
        >
          Confirm Deletion
        </h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this post? This action cannot be
          undone.
        </p>
        <p className="text-gray-500 mb-6">
          Delete button will be enabled in {countdown} second
          {countdown !== 1 ? "s" : ""}.
        </p>
        {error && (
          <p className="text-red-500 mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            aria-label="Cancel deletion"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition ${
              countdown > 0 || isDeleting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={countdown > 0 || isDeleting}
            aria-label="Confirm delete post"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
