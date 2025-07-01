import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { deletePost } from "../../store/postSlice";
import { toast } from "react-hot-toast";

const DeleteModal = ({ isOpen, onClose, postId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleDelete = async () => {
    if (countdown > 0) return;

    if (!postId || postId.length !== 24) {
      setError("Invalid post ID");
      toast.error("Invalid post ID");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await dispatch(deletePost(postId)).unwrap();
      toast.success("Post deleted successfully");
      navigate("/");
      onClose();
    } catch (err) {
      console.error("Failed to delete post:", err);
      const errMsg =
        err?.message || err?.data?.message || "Failed to delete post";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-auto shadow-xl">
        <h2
          id="delete-modal-title"
          className="text-2xl font-bold text-gray-800 mb-4"
        >
          Confirm Delete
        </h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
        <p className="text-gray-500 mb-4">
          Delete button will be enabled in {countdown} second{countdown !== 1 ? "s" : ""}.
        </p>
        {error && (
          <p className="text-red-500 text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            aria-label="Cancel deletion"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
              countdown > 0 || isDeleting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={countdown > 0 || isDeleting}
            aria-label="Delete post"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
