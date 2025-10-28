// clients/src/components/Playlist/PlaylistModal.jsx
import React from "react";
import { FaTimes, FaPlus, FaCheck, FaMinus } from "react-icons/fa";
import { toast } from "react-hot-toast";

const PlaylistModal = ({
  postId,
  post,
  playlists,
  isInPlaylists,
  onAddToPlaylist,
  onClose,
  loading,
}) => {
  if (!playlists.length) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">No Playlists</h3>
          <p>Create a playlist to save posts.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add to Playlist</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>
        <div className="space-y-2">
          {playlists.map((playlist) => {
            const isInThisPlaylist = isInPlaylists.includes(playlist._id);
            return (
              <button
                key={playlist._id}
                onClick={() => onAddToPlaylist(playlist._id)}
                disabled={loading}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isInThisPlaylist
                    ? "bg-green-100 dark:bg-green-900 text-green-800"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                <span>{playlist.name}</span>
                {isInThisPlaylist ? (
                  <FaCheck className="text-green-600" />
                ) : (
                  <FaPlus className="text-gray-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
