import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementPostShare } from "../../store/PostInteractions";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ShareButton = ({ postId, postUrl, className = "" }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");

  const shareCount = useSelector((state) => {
    const current = state.post.currentPost;
    return current?._id === postId ? current?.shareCount || 0 : 0;
  });

  const handleCopy = async () => {
    if (!isAuthenticated) {
      toast.info("Please log in to share this post.");
      navigate("/login");
      return;
    }
    if (!postId || typeof postId !== "string") {
      console.warn("❌ Invalid postId passed to ShareButton:", postId);
      return;
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      setCopySuccess("Link copied successfully!");
      dispatch(incrementPostShare(postId));
      setTimeout(() => setCopySuccess(""), 2000);
    } catch {
      setCopySuccess("Failed to copy the link.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`relative ${className}`}
      >
        🔗 Share
        {shareCount > 0 && (
          <span className="ml-2 text-xs bg-white text-black px-2 py-0.5 rounded-full shadow-sm">
            {shareCount}
          </span>
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">
              Share This Post
            </h3>
            <p className="text-sm font-semibold mb-4 text-gray-600">
              Copy and share the post URL:
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={postUrl}
                readOnly
                className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800"
              />
              <button
                onClick={handleCopy}
                className="bg-green-500 text-white font-semibold px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                Copy
              </button>
            </div>

            {copySuccess && (
              <p className="text-green-600 text-sm mb-4">{copySuccess}</p>
            )}

            <button
              onClick={() => {
                setIsModalOpen(false);
                setCopySuccess("");
              }}
              className="w-full bg-red-500 text-white font-semibold px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;