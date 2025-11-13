// clients/src/components/Playlist/PlaylistButton.jsx

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { FaList, FaPlus, FaCheck } from "react-icons/fa";
import {
  fetchUserPlaylists,
  addToPlaylist,
  removeFromPlaylist,
} from "../../store/playlistSlice";
import { toast } from "react-hot-toast";
import PlaylistModal from "./PlaylistModal";

/**
 * Button component to add/remove posts from playlists
 * Shows on each post card
 */
const PlaylistButton = ({ postId, post, variant = "full", className = "" }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { playlists = [], status = "idle" } = useSelector(
    (state) => state.playlist || {}
  );
  const [showModal, setShowModal] = useState(false);
  const [isInPlaylists, setIsInPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user playlists on mount
  useEffect(() => {
    if (user?._id && status === "idle") {
      dispatch(fetchUserPlaylists(user._id));
    }
  }, [user, dispatch, status]);

  // Check which playlists contain this post
  useEffect(() => {
    if (playlists.length > 0 && postId) {
      const playlistsWithPost = playlists
        .filter((playlist) =>
          playlist.posts?.some((p) => p._id === postId || p === postId)
        )
        .map((p) => p._id);
      setIsInPlaylists(playlistsWithPost);
    }
  }, [playlists, postId]);

  const handleAddToPlaylist = async (playlistId) => {
    if (loading) return;

    try {
      setLoading(true);

      // Check if already in playlist
      const isAlreadyInPlaylist = isInPlaylists.includes(playlistId);

      if (isAlreadyInPlaylist) {
        // Remove from playlist
        await dispatch(removeFromPlaylist({ playlistId, postId })).unwrap();
        setIsInPlaylists((prev) => prev.filter((id) => id !== playlistId));
        toast.success("Removed from playlist");
      } else {
        // Add to playlist
        await dispatch(addToPlaylist({ playlistId, postId })).unwrap();
        setIsInPlaylists((prev) => [...prev, playlistId]);
        toast.success("Added to playlist");
      }
    } catch (error) {
      console.error("[PlaylistButton] Error:", error);
      toast.error(error || "Failed to update playlist");
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (e) => {
    // Prevent any parent click handlers
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save to playlists");
      return;
    }
    setShowModal(true);
  };

  const iconButtonClasses = `w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all duration-200 border border-gray-200 dark:border-slate-700 ${className}`;

  const fullButtonClasses =
    "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleButtonClick}
          disabled={loading}
          className={iconButtonClasses}
          title="Add to Postlist"
        >
          <FaPlus
            className={`w-4 h-4 transition-colors ${
              isInPlaylists.length > 0
                ? "text-green-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          />
          {isInPlaylists.length > 0 && (
            <FaCheck className="absolute -top-1 -right-1 w-3 h-3 text-green-500 bg-white rounded-full border-2 border-white dark:border-slate-900" />
          )}
        </button>

        {/* Playlist Modal - Using Portal for fullscreen */}
        {showModal &&
          createPortal(
            <PlaylistModal
              postId={postId}
              post={post}
              playlists={playlists}
              isInPlaylists={isInPlaylists}
              onAddToPlaylist={handleAddToPlaylist}
              onClose={() => setShowModal(false)}
              loading={loading}
            />,
            document.body
          )}
      </>
    );
  }

  // Default full button
  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={loading}
        className={fullButtonClasses}
        title="Add to Postlist"
      >
        <FaList className="text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Save to Postlist
        </span>
        {isInPlaylists.length > 0 && (
          <span className="text-xs bg-blue-500 text-white rounded-full px-2 py-0.5">
            {isInPlaylists.length}
          </span>
        )}
      </button>

      {/* Playlist Modal - Using Portal for fullscreen */}
      {showModal &&
        createPortal(
          <PlaylistModal
            postId={postId}
            post={post}
            playlists={playlists}
            isInPlaylists={isInPlaylists}
            onAddToPlaylist={handleAddToPlaylist}
            onClose={() => setShowModal(false)}
            loading={loading}
          />,
          document.body
        )}
    </>
  );
};

export default PlaylistButton;
