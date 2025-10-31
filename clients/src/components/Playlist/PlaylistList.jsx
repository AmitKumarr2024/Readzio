// clients/src/components/Playlist/PlaylistList.jsx

import { useEffect, useState, useMemo } from "react";
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

// Inject CSS animations for performance - only once
const injectAnimations = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;

    const styleSheet = document.createElement("style");
    styleSheet.setAttribute("data-playlist-animations", "true");
    styleSheet.textContent = `
      @keyframes float {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        33% { transform: translate3d(30px, -30px, 0) scale(1.1); }
        66% { transform: translate3d(-20px, 20px, 0) scale(0.9); }
      }
      
      @keyframes float-delayed {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        33% { transform: translate3d(-25px, 25px, 0) scale(1.05); }
        66% { transform: translate3d(20px, -20px, 0) scale(0.95); }
      }
      
      @keyframes float-slow {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(15px, -15px, 0) scale(1.08); }
      }
      
      @keyframes wave {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-25%); }
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @keyframes pulse-slow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.05); }
      }
      
      @keyframes pulse-subtle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .animate-float {
        animation: float 8s ease-in-out infinite;
        will-change: transform;
      }
      
      .animate-float-delayed {
        animation: float-delayed 10s ease-in-out infinite;
        will-change: transform;
      }
      
      .animate-float-slow {
        animation: float-slow 12s ease-in-out infinite;
        will-change: transform;
      }
      
      .animate-wave {
        animation: wave 6s ease-in-out infinite;
      }
      
      .animate-shimmer {
        animation: shimmer 1.5s ease-in-out;
      }
      
      .animate-pulse-slow {
        animation: pulse-slow 3s ease-in-out infinite;
      }
      
      .animate-pulse-subtle {
        animation: pulse-subtle 2s ease-in-out infinite;
      }
      
      .animate-bounce-subtle {
        animation: bounce-subtle 3s ease-in-out infinite;
      }
      
      .animate-spin-slow {
        animation: spin-slow 8s linear infinite;
      }
      
      /* Performance optimizations */
      .playlist-card {
        will-change: transform, box-shadow;
        backface-visibility: hidden;
        transform: translateZ(0);
      }
      
      .playlist-gradient {
        will-change: opacity;
      }
    `;
    document.head.appendChild(styleSheet);
  };
})();

// Utility to generate stable gradient colors from playlist ID
const getPlaylistGradient = (playlistId) => {
  const id = String(playlistId || "fallback");
  const c0 = id.charCodeAt(0) || 65;
  const c1 = id.charCodeAt(1) || 66;
  const c2 = id.charCodeAt(2) || 67;

  return `linear-gradient(135deg,
    hsl(${(c0 * 137.5) % 360}, 70%, 60%),
    hsl(${(c1 * 137.5) % 360}, 65%, 55%),
    hsl(${(c2 * 137.5) % 360}, 75%, 50%)
  )`;
};

// Memoized playlist card component for better performance
const PlaylistCard = ({
  playlist,
  isOwnProfile,
  deletingId,
  onDelete,
  onClick,
  onEdit,
}) => {
  const gradient = useMemo(
    () => getPlaylistGradient(playlist._id),
    [playlist._id]
  );
  const postCount = playlist.posts?.length || 0;
  const createdDate = useMemo(
    () =>
      new Date(playlist.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [playlist.createdAt]
  );

  return (
    <div
      className="group relative playlist-card bg-gradient-to-br from-white to-gray-50 
                 dark:from-gray-800 dark:to-gray-900 rounded-2xl 
                 shadow-lg hover:shadow-2xl transition-all duration-300 
                 overflow-hidden border border-gray-100 dark:border-gray-700
                 hover:scale-[1.02] hover:-translate-y-1"
    >
      {/* Animated Gradient Background */}
      <div
        onClick={() => onClick(playlist._id)}
        className="relative h-56 cursor-pointer overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Animated Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl opacity-40 animate-float"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.8), transparent)",
              top: "-20%",
              left: "-10%",
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full blur-2xl opacity-30 animate-float-delayed"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.6), transparent)",
              bottom: "-15%",
              right: "-5%",
            }}
          />
          <div
            className="absolute w-56 h-56 rounded-full blur-3xl opacity-25 animate-float-slow"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.5), transparent)",
              top: "40%",
              right: "30%",
            }}
          />
        </div>

        {/* Animated Wave Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg
            className="w-full h-full animate-wave"
            viewBox="0 0 1200 600"
            preserveAspectRatio="none"
          >
            <path
              d="M0,300 Q300,200 600,300 T1200,300 L1200,600 L0,600 Z"
              fill="rgba(255,255,255,0.3)"
            />
          </svg>
        </div>

        {/* Playlist Icon with Pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-30 animate-pulse-slow" />
            <FaList className="relative text-7xl text-white opacity-90 drop-shadow-2xl animate-bounce-subtle" />
          </div>
        </div>

        {/* Shimmer Effect on Hover */}
        <div
          className="absolute inset-0 playlist-gradient bg-gradient-to-r from-transparent 
                    via-white to-transparent opacity-0 group-hover:opacity-20 
                    transition-opacity duration-500 pointer-events-none"
        />

        {/* Overlay on Hover */}
        <div
          className="absolute inset-0 bg-black bg-opacity-0 
                    group-hover:bg-opacity-40 transition-all duration-300 
                    flex items-center justify-center backdrop-blur-0
                    group-hover:backdrop-blur-sm"
        >
          <span
            className="text-white text-lg font-bold opacity-0 
                     group-hover:opacity-100 transition-all duration-300
                     transform translate-y-2 group-hover:translate-y-0
                     drop-shadow-lg"
          >
            View Playlist
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-3 right-3 z-10">
          {playlist.isPrivate ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                         bg-gray-900 bg-opacity-90 backdrop-blur-md text-white 
                         text-xs font-medium shadow-lg border border-gray-700
                         hover:scale-105 transition-transform"
            >
              <FaLock className="animate-pulse-subtle" />
              Private
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                         bg-green-500 bg-opacity-90 backdrop-blur-md text-white 
                         text-xs font-medium shadow-lg border border-green-400
                         hover:scale-105 transition-transform"
            >
              <FaGlobe className="animate-spin-slow" />
              Public
            </div>
          )}
        </div>

        {/* Post Count Badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full 
                     bg-white bg-opacity-90 backdrop-blur-md 
                     text-gray-800 text-xs font-semibold shadow-lg
                     hover:scale-105 transition-transform"
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {postCount} {postCount === 1 ? "post" : "posts"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 bg-white dark:bg-gray-800">
        <h3
          onClick={() => onClick(playlist._id)}
          className="text-xl font-bold text-gray-900 dark:text-white 
                   mb-2 truncate cursor-pointer hover:text-blue-600 
                   dark:hover:text-blue-400 transition-colors
                   group-hover:translate-x-1 duration-300"
        >
          {playlist.name}
        </h3>

        {playlist.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {playlist.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Created {createdDate}
          </span>
        </div>

        {/* Action Buttons */}
        {isOwnProfile && (
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => onEdit(playlist._id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                       rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 
                       dark:from-blue-900/20 dark:to-indigo-900/20
                       hover:from-blue-100 hover:to-indigo-100
                       dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30
                       text-blue-700 dark:text-blue-400 transition-all
                       font-medium shadow-sm hover:shadow-md
                       hover:scale-105 duration-200"
            >
              <FaEdit />
              Edit
            </button>
            <button
              onClick={() => onDelete(playlist._id, playlist.name)}
              disabled={deletingId === playlist._id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                       rounded-xl bg-gradient-to-r from-red-50 to-pink-50
                       dark:from-red-900/20 dark:to-pink-900/20
                       hover:from-red-100 hover:to-pink-100
                       dark:hover:from-red-900/30 dark:hover:to-pink-900/30
                       text-red-700 dark:text-red-400 transition-all
                       font-medium shadow-sm hover:shadow-md
                       hover:scale-105 duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed 
                       disabled:hover:scale-100"
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
  );
};

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

  // Inject animations once on mount
  useEffect(() => {
    injectAnimations();
  }, []);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserPlaylists(userId));
    }

    return () => {
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

  const handleEdit = (playlistId) => {
    navigate(`/playlist/${playlistId}/edit`);
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
    <div className="space-y-4 mx-10 pt-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {playlists.map((playlist) => {
          if (!playlist?._id) return null;

          return (
            <PlaylistCard
              key={playlist._id}
              playlist={playlist}
              isOwnProfile={isOwnProfile}
              deletingId={deletingId}
              onDelete={handleDeletePlaylist}
              onClick={handlePlaylistClick}
              onEdit={handleEdit}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlaylistList;
