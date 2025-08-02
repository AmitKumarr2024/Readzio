import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementPostShare } from "../../store/PostInteractions";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FaShareAlt,
  FaTimes,
  FaWhatsapp,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
} from "react-icons/fa";
import { SiX } from "react-icons/si";

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
      setCopySuccess("Link copied!");
      dispatch(incrementPostShare(postId));
      setTimeout(() => setCopySuccess(""), 2000);
    } catch {
      setCopySuccess("Failed to copy.");
    }
  };

  const shareToPlatform = (platform) => {
    if (!isAuthenticated) {
      toast.info("Please log in to share this post.");
      navigate("/login");
      return;
    }

    const encodedUrl = encodeURIComponent(postUrl);
    const shareUrls = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://x.com/intent/tweet?url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}`,
    };

    window.open(shareUrls[platform], "_blank");
    dispatch(incrementPostShare(postId));
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md ${className}`}
      >
        <FaShareAlt /> Share
        {shareCount > 0 && (
          <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-full shadow-sm">
            {shareCount}
          </span>
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative mx-auto transform transition-transform duration-300 scale-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
            >
              <FaTimes size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Share This Post
            </h3>
            <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
              Share via:
            </p>

            <div className="flex gap-4 mb-6 justify-center">
              <button
                onClick={() => shareToPlatform("whatsapp")}
                className="text-green-500 hover:text-green-600 transition-colors"
              >
                <FaWhatsapp size={30} />
              </button>
              <button
                onClick={() => shareToPlatform("facebook")}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                <FaFacebook size={30} />
              </button>
              <button
                onClick={() => shareToPlatform("twitter")}
                className="text-gray-900 hover:text-gray-700 transition-colors"
              >
                <SiX size={30} />
              </button>
              <button
                onClick={() => shareToPlatform("linkedin")}
                className="text-blue-700 hover:text-blue-800 transition-colors"
              >
                <FaLinkedin size={30} />
              </button>
              <button
                onClick={() => shareToPlatform("telegram")}
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                <FaTelegram size={30} />
              </button>
            </div>

            <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
              Or copy the link:
            </p>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={postUrl}
                readOnly
                className="flex-grow border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleCopy}
                className="bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-200"
              >
                Copy
              </button>
            </div>

            {copySuccess && (
              <p className="text-indigo-500 dark:text-indigo-400 text-sm mb-4">
                {copySuccess}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
