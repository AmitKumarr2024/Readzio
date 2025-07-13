import React, { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { sendAdminAppeal } from "../../store/postSlice";

const BlockedPostOverlay = ({ post, isAuthor, showAnyway, setShowAnyway }) => {
  const dispatch = useDispatch();
  const [authorMessage, setAuthorMessage] = useState("");

  if (!post?.blocked || showAnyway) return null;

  const handleSendProof = () => {
    if (!authorMessage.trim()) {
      toast.error("Please enter a message before sending.");
      return;
    }
    dispatch(sendAdminAppeal({ postId: post._id, message: authorMessage }))
      .unwrap()
      .then(() => toast.success("Proof sent to admin."))
      .catch(() => toast.error("Failed to send proof."));
  };

  return (
    <div className="absolute inset-0 z-40 bg-white/70 dark:bg-black/60 backdrop-blur-md flex items-center justify-center rounded-2xl p-6">
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-xl shadow-lg max-w-md w-full space-y-4 text-center">
        <h2 className="text-xl font-semibold">
          {isAuthor
            ? "🔒 Your post is under review"
            : "🚫 This post is blocked"}
        </h2>

        {post.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 italic">
            {post.message}
          </p>
        )}

        {!isAuthor && (
          <p className="text-sm text-gray-700 dark:text-gray-400">
            This post is under moderation and temporarily unavailable to
            readers.
          </p>
        )}

        {isAuthor && (
          <>
            <textarea
              rows={4}
              placeholder="Explain or send proof to the admin..."
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              onChange={(e) => setAuthorMessage(e.target.value)}
            />
            <div className="flex justify-center gap-3">
              <button
                onClick={handleSendProof}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full"
              >
                Send Proof
              </button>
              <button
                onClick={() => setShowAnyway(true)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-full"
              >
                Skip & View
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlockedPostOverlay;
