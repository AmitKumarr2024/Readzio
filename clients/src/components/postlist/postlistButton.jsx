// clients/src/components/postlist/postlistButton.jsx

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaList, FaPlus, FaCheck } from "react-icons/fa";
import {
  fetchUserpostlists,
  addTopostlist,
  removeFrompostlist,
} from "../../store/postlistSlice";
import { toast } from "react-hot-toast";
import postlistModal from "./postlistModal";

/**
 * Button component to add/remove posts from postlists
 * Shows on each post card
 */
const postlistButton = ({ postId, post }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { postlists = [], status = "idle" } = useSelector(
    (state) => state.postlist || {}
  );
  const [showModal, setShowModal] = useState(false);
  const [isInpostlists, setIsInpostlists] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user postlists on mount
  useEffect(() => {
    if (user?._id && status === "idle") {
      dispatch(fetchUserpostlists(user._id));
    }
  }, [user, dispatch, status]);

  // Check which postlists contain this post
  useEffect(() => {
    if (postlists.length > 0 && postId) {
      const postlistsWithPost = postlists
        .filter((postlist) =>
          postlist.posts?.some((p) => p._id === postId || p === postId)
        )
        .map((p) => p._id);
      setIsInpostlists(postlistsWithPost);
    }
  }, [postlists, postId]);

  const handleAddTopostlist = async (postlistId) => {
    if (loading) return;

    try {
      setLoading(true);

      // Check if already in postlist
      const isAlreadyInpostlist = isInpostlists.includes(postlistId);

      if (isAlreadyInpostlist) {
        // Remove from postlist
        await dispatch(removeFrompostlist({ postlistId, postId })).unwrap();
        setIsInpostlists((prev) => prev.filter((id) => id !== postlistId));
        toast.success("Removed from postlist");
      } else {
        // Add to postlist
        await dispatch(addTopostlist({ postlistId, postId })).unwrap();
        setIsInpostlists((prev) => [...prev, postlistId]);
        toast.success("Added to postlist");
      }
    } catch (error) {
      console.error("[postlistButton] Error:", error);
      toast.error(error || "Failed to update postlist");
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!user) {
      toast.error("Please login to save to postlists");
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      {/* postlist Button */}
      <button
        onClick={handleButtonClick}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg 
                   bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 
                   dark:hover:bg-gray-700 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        title="Add to postlist"
      >
        <FaList className="text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          postlist
        </span>
        {isInpostlists.length > 0 && (
          <span className="text-xs bg-blue-500 text-white rounded-full px-2 py-0.5">
            {isInpostlists.length}
          </span>
        )}
      </button>

      {/* postlist Modal */}
      {showModal && (
        <postlistModal
          postId={postId}
          post={post}
          postlists={postlists}
          isInpostlists={isInpostlists}
          onAddTopostlist={handleAddTopostlist}
          onClose={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </>
  );
};

export default postlistButton;
