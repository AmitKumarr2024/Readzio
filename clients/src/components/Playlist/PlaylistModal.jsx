// clients/src/components/Playlist/PlaylistModal.jsx
import React, { useEffect, useState } from "react";
import {
  FaTimes,
  FaPlus,
  FaCheck,
  FaList,
  FaLock,
  FaGlobe,
} from "react-icons/fa";

// Inject CSS animations for performance
const injectModalAnimations = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;

    const styleSheet = document.createElement("style");
    styleSheet.setAttribute("data-playlist-modal-animations", "true");
    styleSheet.textContent = `
      @keyframes modalFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes modalSlideUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes playlistItemSlideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes checkmarkPop {
        0% {
          transform: scale(0) rotate(-45deg);
        }
        50% {
          transform: scale(1.2) rotate(-45deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
        }
      }
      
      @keyframes ripple {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      @keyframes shimmerGlow {
        0%, 100% {
          opacity: 0.5;
          transform: translateX(-100%);
        }
        50% {
          opacity: 1;
          transform: translateX(100%);
        }
      }
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      .modal-backdrop {
        animation: modalFadeIn 0.3s ease-out;
      }
      
      .modal-content {
        animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform, opacity;
      }
      
      .playlist-item {
        animation: playlistItemSlideIn 0.3s ease-out backwards;
        will-change: transform, opacity;
      }
      
      .checkmark-icon {
        animation: checkmarkPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      }
      
      .shimmer-overlay {
        animation: shimmerGlow 3s ease-in-out infinite;
      }
      
      .float-animation {
        animation: float 3s ease-in-out infinite;
      }
      
      .spin-slow {
        animation: spin 3s linear infinite;
      }
    `;
    document.head.appendChild(styleSheet);
  };
})();

const PlaylistModal = ({
  postId,
  post,
  playlists,
  isInPlaylists,
  onAddToPlaylist,
  onClose,
  loading,
}) => {
  const [ripples, setRipples] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectModalAnimations();
    setMounted(true);
  }, []);

  const handleRipple = (e, playlistId) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onAddToPlaylist(playlistId);
  };

  if (!playlists.length) {
    return (
      <div
        className="modal-backdrop fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 
                      flex items-center justify-center z-50 backdrop-blur-md p-4"
      >
        <div
          className="modal-content bg-white dark:bg-gray-900
                       p-8 rounded-3xl shadow-2xl max-w-md w-full 
                       border border-gray-200 dark:border-gray-700 
                       relative overflow-hidden"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div
              className="absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl float-animation"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl float-animation"
              style={{ animationDelay: "1s" }}
            />
          </div>

          {/* Icon */}
          <div className="relative flex justify-center mb-6">
            <div
              className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full 
                          flex items-center justify-center shadow-xl"
            >
              <FaList className="text-3xl text-white float-animation" />
            </div>
          </div>

          {/* Content */}
          <div className="relative text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              No Playlists Yet
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-base">
              Create your first playlist to start organizing your favorite posts
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
                       text-white font-semibold rounded-xl shadow-lg
                       hover:from-blue-700 hover:to-purple-700 
                       transform hover:scale-105 transition-all duration-200
                       active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 
                 flex items-center justify-center z-50 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="modal-content bg-white dark:bg-gray-900 rounded-3xl shadow-2xl 
                   max-w-md w-full max-h-[85vh] overflow-hidden 
                   border border-gray-200 dark:border-gray-700 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl float-animation" />
            <div
              className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl float-animation"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          {/* Shimmer Effect */}
          <div className="absolute inset-0 shimmer-overlay">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="relative flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 drop-shadow-lg">
                <FaList className="text-xl" />
                Add to Postlist
              </h3>
              <p className="text-white/95 text-sm font-medium drop-shadow">
                Choose a playlist or multiple playlists
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md 
                       hover:bg-white/30 text-white transition-all duration-200
                       flex items-center justify-center hover:rotate-90 
                       transform hover:scale-110 active:scale-95 shadow-lg"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Playlists List */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar bg-gray-50 dark:bg-gray-800">
          <div className="space-y-3">
            {playlists.map((playlist, index) => {
              const isInThisPlaylist = isInPlaylists.includes(playlist._id);
              return (
                <button
                  key={playlist._id}
                  onClick={(e) => handleRipple(e, playlist._id)}
                  disabled={loading}
                  className={`playlist-item w-full relative overflow-hidden p-4 rounded-2xl 
                            transition-all duration-300 group
                            ${
                              isInThisPlaylist
                                ? "bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-900/50 dark:via-emerald-900/40 dark:to-green-900/50 shadow-lg scale-[1.02] border-2 border-green-400 dark:border-green-500"
                                : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 shadow-md hover:shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                            hover:scale-[1.02] active:scale-[0.98]`}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  {/* Ripple effects */}
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="ripple-effect"
                      style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 20,
                        height: 20,
                      }}
                    />
                  ))}

                  {/* Shimmer effect for selected playlists */}
                  {isInThisPlaylist && (
                    <div className="absolute inset-0 shimmer-overlay opacity-20">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />
                    </div>
                  )}

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Playlist Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center
                                  shadow-lg group-hover:shadow-xl transition-all
                                  ${
                                    isInThisPlaylist
                                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                      : "bg-gradient-to-br from-blue-500 to-purple-600"
                                  }`}
                      >
                        <FaList
                          className={`text-xl text-white transition-transform duration-300
                                    ${
                                      isInThisPlaylist
                                        ? "scale-110"
                                        : "group-hover:scale-110"
                                    }`}
                        />
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-bold text-gray-900 dark:text-gray-100 truncate mb-1 text-base">
                          {playlist.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            {playlist.isPrivate ? (
                              <>
                                <FaLock className="text-xs" />
                                Private
                              </>
                            ) : (
                              <>
                                <FaGlobe className="text-xs spin-slow" />
                                Public
                              </>
                            )}
                          </span>
                          <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full" />
                          <span>{playlist.posts?.length || 0} posts</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Icon */}
                    <div className="flex-shrink-0 ml-3">
                      {isInThisPlaylist ? (
                        <div
                          className="w-9 h-9 rounded-full bg-green-500 flex items-center 
                                   justify-center shadow-lg checkmark-icon"
                        >
                          <FaCheck className="text-white text-base font-bold" />
                        </div>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-600 
                                   flex items-center justify-center shadow-md
                                   group-hover:bg-blue-500 group-hover:text-white
                                   transition-all duration-200 group-hover:shadow-lg
                                   group-hover:scale-110 border-2 border-gray-300 dark:border-gray-500
                                   group-hover:border-blue-400"
                        >
                          <FaPlus className="text-gray-600 dark:text-gray-200 group-hover:text-white text-base font-bold" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div
          className="p-4 bg-white dark:bg-gray-850
                       border-t-2 border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm text-center text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 font-medium">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
            Click on Postlists to add or remove this post
          </p>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
};

export default PlaylistModal;
