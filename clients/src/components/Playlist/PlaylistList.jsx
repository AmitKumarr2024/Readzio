// clients/src/components/Playlist/PlaylistList.jsx

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaList,
  FaLock,
  FaGlobe,
  FaTrash,
  FaEdit,
  FaSpinner,
  FaPlus,
} from "react-icons/fa";
import {
  fetchUserPlaylists,
  deletePlaylist,
  clearPlaylists,
} from "../../store/playlistSlice";
import { toast } from "react-hot-toast";

/**
 * Component to display list of user's playlists
 */
const PlaylistList = ({ userId, isOwnProfile = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    playlists = [],
    status = "idle",
    error = null,
  } = useSelector((state) => state.playlist || {});
  const { isConnected } = useSelector((state) => state.socket || {});
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserPlaylists(userId));
    }

    return () => {
      // Clear playlists when component unmounts
      dispatch(clearPlaylists());
    };
  }, [userId, dispatch]);

  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!window.confirm(`Delete "${playlistName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(playlistId);
      await dispatch(deletePlaylist(playlistId)).unwrap();
      toast.success("Playlist deleted successfully");
    } catch (error) {
      console.error("[PlaylistList] Delete error:", error);
      toast.error(error || "Failed to delete playlist");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  const handleCreateNew = () => {
    navigate("/playlists/create");
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-blue-500" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => dispatch(fetchUserPlaylists(userId))}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <FaList className="mx-auto text-6xl text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {isOwnProfile ? "No Playlists Yet" : "No Public Playlists"}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {isOwnProfile
            ? "Create your first playlist to organize your favorite posts"
            : "This user hasn't created any public playlists yet"}
        </p>
        {isOwnProfile && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 
                     text-white rounded-lg hover:bg-blue-700 transition-colors 
                     font-medium"
          >
            <FaPlus />
            Create Playlist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Playlists
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {playlists.length}{" "}
            {playlists.length === 1 ? "playlist" : "playlists"}
            {isConnected && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        {isOwnProfile && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                     rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <FaPlus />
            New Playlist
          </button>
        )}
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.map((playlist) => (
          <div
            key={playlist._id}
            className="group relative bg-white dark:bg-gray-800 rounded-xl 
                     shadow-md hover:shadow-lg transition-all duration-200 
                     overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Cover Image or Placeholder */}
            <div
              onClick={() => handlePlaylistClick(playlist._id)}
              className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 
                       cursor-pointer overflow-hidden"
            >
              {playlist.coverImage ? (
                <img
                  src={playlist.coverImage}
                  alt={playlist.name}
                  className="w-full h-full object-cover group-hover:scale-105 
                           transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FaList className="text-6xl text-white opacity-50" />
                </div>
              )}

              {/* Overlay on Hover */}
              <div
                className="absolute inset-0 bg-black bg-opacity-0 
                          group-hover:bg-opacity-30 transition-all duration-200 
                          flex items-center justify-center"
              >
                <span
                  className="text-white font-semibold opacity-0 
                           group-hover:opacity-100 transition-opacity"
                >
                  View Playlist
                </span>
              </div>

              {/* Privacy Badge */}
              <div className="absolute top-3 right-3">
                {playlist.isPrivate ? (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full 
                             bg-gray-900 bg-opacity-75 text-white text-xs"
                  >
                    <FaLock />
                    Private
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full 
                             bg-green-500 bg-opacity-75 text-white text-xs"
                  >
                    <FaGlobe />
                    Public
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3
                onClick={() => handlePlaylistClick(playlist._id)}
                className="text-lg font-semibold text-gray-900 dark:text-white 
                         mb-1 truncate cursor-pointer hover:text-blue-600 
                         dark:hover:text-blue-400 transition-colors"
              >
                {playlist.name}
              </h3>

              {playlist.description && (
                <p
                  className="text-sm text-gray-600 dark:text-gray-400 mb-3 
                            line-clamp-2"
                >
                  {playlist.description}
                </p>
              )}

              <div
                className="flex items-center justify-between text-sm 
                            text-gray-500 dark:text-gray-400"
              >
                <span>
                  {playlist.posts?.length || 0}{" "}
                  {playlist.posts?.length === 1 ? "post" : "posts"}
                </span>
                <span>{new Date(playlist.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Action Buttons (Only for Own Playlists) */}
              {isOwnProfile && (
                <div
                  className="flex gap-2 mt-4 pt-4 border-t border-gray-200 
                              dark:border-gray-700"
                >
                  <button
                    onClick={() => navigate(`/playlist/${playlist._id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                             rounded-lg bg-gray-100 dark:bg-gray-700 
                             hover:bg-gray-200 dark:hover:bg-gray-600 
                             text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <FaEdit />
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeletePlaylist(playlist._id, playlist.name)
                    }
                    disabled={deletingId === playlist._id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                             rounded-lg bg-red-100 dark:bg-red-900/30 
                             hover:bg-red-200 dark:hover:bg-red-900/50 
                             text-red-700 dark:text-red-400 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === playlist._id ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <>
                        <FaTrash />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistList;
