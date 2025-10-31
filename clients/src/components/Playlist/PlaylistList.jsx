// clients/src/components/Playlist/PlaylistList.jsx

import { useEffect, useState, useMemo, useCallback, memo } from "react";
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
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
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
      
      .animate-fade-in {
        animation: fadeIn 0.4s ease-out backwards;
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
const PlaylistCard = memo(
  ({
    playlist,
    isOwnProfile,
    deletingId,
    onDelete,
    onClick,
    onEdit,
    index = 0,
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

    const handleCardClick = useCallback(() => {
      onClick(playlist._id);
    }, [onClick, playlist._id]);

    const handleEditClick = useCallback(
      (e) => {
        e.stopPropagation();
        onEdit(playlist._id);
      },
      [onEdit, playlist._id]
    );

    const handleDeleteClick = useCallback(
      (e) => {
        e.stopPropagation();
        onDelete(playlist._id, playlist.name);
      },
      [onDelete, playlist._id, playlist.name]
    );

    const isDeleting = deletingId === playlist._id;

    return (
      <div
        className="group relative playlist-card bg-gradient-to-br from-white to-gray-50 
                 dark:from-gray-800 dark:to-gray-900 rounded-2xl 
                 shadow-lg hover:shadow-2xl transition-all duration-300 
                 overflow-hidden border border-gray-100 dark:border-gray-700
                 hover:scale-[1.02] hover:-translate-y-1 animate-fade-in"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        {/* Animated Gradient Background */}
        <div
          onClick={handleCardClick}
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
                title="Only you can see this playlist"
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
                title="Everyone can see this playlist"
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
              title={`${postCount} ${
                postCount === 1 ? "post" : "posts"
              } in this playlist`}
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {postCount} {postCount === 1 ? "post" : "posts"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 bg-white dark:bg-gray-800">
          <h3
            onClick={handleCardClick}
            className="text-xl font-bold text-gray-900 dark:text-white 
                   mb-2 truncate cursor-pointer hover:text-blue-600 
                   dark:hover:text-blue-400 transition-colors
                   group-hover:translate-x-1 duration-300"
            title={playlist.name}
          >
            {playlist.name}
          </h3>

          {playlist.description && (
            <p
              className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed"
              title={playlist.description}
            >
              {playlist.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
            <span
              className="flex items-center gap-1"
              title={`Created on ${createdDate}`}
            >
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Created {createdDate}
            </span>
          </div>

          {/* Action Buttons */}
          {isOwnProfile && (
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleEditClick}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                       rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 
                       dark:from-blue-900/20 dark:to-indigo-900/20
                       hover:from-blue-100 hover:to-indigo-100
                       dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30
                       text-blue-700 dark:text-blue-400 transition-all
                       font-medium shadow-sm hover:shadow-md
                       hover:scale-105 duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed 
                       disabled:hover:scale-100"
                aria-label={`Edit ${playlist.name}`}
              >
                <FaEdit />
                Edit
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
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
                aria-label={`Delete ${playlist.name}`}
              >
                {isDeleting ? (
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
  }
);

PlaylistCard.displayName = "PlaylistCard";

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

  // Fetch playlists only when needed (avoid duplicate fetches)
  useEffect(() => {
    if (!userId) return;

    // Only fetch if we don't have data or if this is a new user
    if (status === "idle" || playlists.length === 0) {
      dispatch(fetchUserPlaylists(userId));
    }

    return () => {
      dispatch(clearPlaylists());
    };
  }, [userId, dispatch, status]);

  // Memoized handlers for better performance
  const handleDeletePlaylist = useCallback(
    async (playlistId, playlistName) => {
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
    },
    [dispatch]
  );

  const handlePlaylistClick = useCallback(
    (playlistId) => {
      navigate(`/playlist/${playlistId}`);
    },
    [navigate]
  );

  const handleCreateNew = useCallback(() => {
    navigate("/playlists/create");
  }, [navigate]);

  const handleEdit = useCallback(
    (playlistId) => {
      navigate(`/playlist/${playlistId}/edit`);
    },
    [navigate]
  );

  // Memoize retry handler
  const handleRetry = useCallback(() => {
    if (userId) {
      dispatch(fetchUserPlaylists(userId));
    }
  }, [dispatch, userId]);

  // Memoize rendered playlist cards
  const playlistCards = useMemo(() => {
    return playlists.map((playlist, index) => {
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
          index={index}
        />
      );
    });
  }, [
    playlists,
    isOwnProfile,
    deletingId,
    handleDeletePlaylist,
    handlePlaylistClick,
    handleEdit,
  ]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
        <p className="text-gray-600 dark:text-gray-400">Loading playlists...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">
          Failed to load playlists
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-all font-medium shadow-md
                   hover:shadow-lg hover:scale-105 duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <FaList className="text-4xl text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
          {isOwnProfile ? "No Playlists Yet" : "No Public Playlists"}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {isOwnProfile
            ? "Create your first playlist to organize your favorite posts and keep them accessible"
            : "This user hasn't created any public playlists yet"}
        </p>
        {isOwnProfile && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                     text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all 
                     font-medium shadow-lg hover:shadow-xl hover:scale-105 duration-200"
          >
            <FaPlus />
            Create Your First Playlist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 mx-10 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Playlists
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              {playlists.length}{" "}
              {playlists.length === 1 ? "playlist" : "playlists"}
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        {isOwnProfile && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600
                     text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all 
                     font-medium shadow-md hover:shadow-lg hover:scale-105 duration-200"
          >
            <FaPlus />
            New Playlist
          </button>
        )}
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {playlistCards}
      </div>
    </div>
  );
};

export default PlaylistList;
