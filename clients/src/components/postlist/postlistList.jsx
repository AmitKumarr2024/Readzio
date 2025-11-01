// clients/src/components/postlist/postlistList.jsx

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
  FaClock,
  FaLayerGroup,
} from "react-icons/fa";
import {
  fetchUserpostlists,
  deletepostlist,
  clearpostlists,
} from "../../store/postlistSlice";
import { toast } from "react-hot-toast";

// Inject high-performance CSS animations
const injectAnimations = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;

    const styleSheet = document.createElement("style");
    styleSheet.setAttribute("data-postlist-animations", "true");
    styleSheet.textContent = `
      @keyframes gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes float-gentle {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(2deg); }
      }
      
      @keyframes float-reverse {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(20px) rotate(-2deg); }
      }
      
      @keyframes orbit {
        from { transform: rotate(0deg) translateX(40px) rotate(0deg); }
        to { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
      }
      
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); }
      }
      
      @keyframes shimmer-wave {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }
      
      @keyframes scale-pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
      }
      
      @keyframes rotate-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes slide-up {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes border-dance {
        0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        50% { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
        75% { border-radius: 60% 40% 50% 60% / 70% 30% 50% 60%; }
      }
      
      @keyframes text-glow {
        0%, 100% { text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
        50% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6); }
      }
      
      .postlist-card {
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
      
      .gradient-animated {
        background-size: 200% 200%;
        animation: gradient-shift 8s ease infinite;
      }
      
      .float-gentle {
        animation: float-gentle 6s ease-in-out infinite;
      }
      
      .float-reverse {
        animation: float-reverse 5s ease-in-out infinite;
      }
      
      .orbit-animation {
        animation: orbit 15s linear infinite;
      }
      
      .shimmer-overlay {
        animation: shimmer-wave 3s ease-in-out infinite;
      }
      
      .scale-pulse {
        animation: scale-pulse 3s ease-in-out infinite;
      }
      
      .rotate-slow {
        animation: rotate-slow 20s linear infinite;
      }
      
      .border-morph {
        animation: border-dance 10s ease-in-out infinite;
      }
      
      .glow-text {
        animation: text-glow 3s ease-in-out infinite;
      }
      
      .slide-up-enter {
        animation: slide-up 0.4s ease-out;
      }
    `;
    document.head.appendChild(styleSheet);
  };
})();

// Generate vibrant gradient based on postlist ID
const getpostlistGradient = (postlistId) => {
  const id = String(postlistId || "default");
  const hash = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const hue1 = (hash * 137) % 360;
  const hue2 = (hash * 197 + 120) % 360;
  const hue3 = (hash * 257 + 240) % 360;

  return `linear-gradient(135deg,
    hsl(${hue1}, 85%, 65%) 0%,
    hsl(${hue2}, 80%, 60%) 50%,
    hsl(${hue3}, 85%, 55%) 100%
  )`;
};

// Memoized postlist Card Component
export const postlistCard = ({
  postlist,
  isOwnProfile,
  deletingId,
  onDelete,
  onClick,
  onEdit,
}) => {
  const gradient = useMemo(
    () => getpostlistGradient(postlist._id),
    [postlist._id]
  );

  const postCount = postlist.posts?.length || 0;

  const createdDate = useMemo(
    () =>
      new Date(postlist.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [postlist.createdAt]
  );

  return (
    <div
      className="group postlist-card relative bg-white dark:bg-gray-900 
                 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl 
                 transition-all duration-500 ease-out
                 hover:scale-[1.03] hover:-translate-y-2
                 border border-gray-200 dark:border-gray-700
                 slide-up-enter"
    >
      {/* Animated Background Header */}
      <div
        className="relative h-48 overflow-hidden cursor-pointer gradient-animated"
        style={{ background: gradient }}
        onClick={() => onClick(postlist._id)}
      >
        {/* Floating Orbs with Different Animations */}
        <div className="absolute inset-0">
          {/* Large floating orb */}
          <div
            className="absolute w-32 h-32 rounded-full blur-2xl opacity-30 float-gentle"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.9), transparent)",
              top: "10%",
              left: "15%",
            }}
          />

          {/* Medium reverse floating orb */}
          <div
            className="absolute w-24 h-24 rounded-full blur-xl opacity-25 float-reverse"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.8), transparent)",
              bottom: "20%",
              right: "10%",
            }}
          />

          {/* Small orbiting particles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-2 h-2">
              <div
                className="absolute w-3 h-3 bg-white rounded-full opacity-60 blur-sm orbit-animation"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="absolute w-2 h-2 bg-white rounded-full opacity-50 blur-sm orbit-animation"
                style={{ animationDelay: "2s" }}
              />
              <div
                className="absolute w-2.5 h-2.5 bg-white rounded-full opacity-55 blur-sm orbit-animation"
                style={{ animationDelay: "4s" }}
              />
            </div>
          </div>

          {/* Morphing blob */}
          <div
            className="absolute w-40 h-40 bg-white opacity-10 blur-3xl border-morph"
            style={{
              top: "30%",
              left: "40%",
            }}
          />
        </div>

        {/* Shimmer Effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{ overflow: "hidden" }}
        >
          <div
            className="absolute inset-0 shimmer-overlay"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              width: "200%",
              height: "200%",
            }}
          />
        </div>

        {/* Central Icon with Glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Rotating ring behind icon */}
            <div className="absolute inset-0 -m-8">
              <div className="w-full h-full border-4 border-white/20 rounded-full rotate-slow" />
            </div>

            {/* Pulsing glow */}
            <div className="absolute inset-0 -m-6">
              <div className="w-full h-full bg-white/30 rounded-full blur-2xl scale-pulse" />
            </div>

            {/* Main icon */}
            <FaLayerGroup className="relative text-6xl text-white drop-shadow-2xl" />
          </div>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-4 right-4 z-10">
          {postlist.isPrivate ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full 
                         bg-black/60 backdrop-blur-md text-white text-xs font-semibold
                         border border-white/20 shadow-lg
                         hover:scale-110 hover:bg-black/70 transition-all duration-300"
            >
              <FaLock className="text-yellow-400" />
              <span>Private</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full 
                         bg-emerald-500/90 backdrop-blur-md text-white text-xs font-semibold
                         border border-emerald-400/50 shadow-lg
                         hover:scale-110 hover:bg-emerald-600 transition-all duration-300"
            >
              <FaGlobe className="rotate-slow" />
              <span>Public</span>
            </div>
          )}
        </div>

        {/* Post Count Badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full 
                       bg-white/95 backdrop-blur-md text-gray-800 text-sm font-bold
                       shadow-lg hover:scale-110 transition-all duration-300
                       border border-gray-200"
          >
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping absolute" />
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full relative" />
            </div>
            <span>{postCount}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3
          onClick={() => onClick(postlist._id)}
          className="text-2xl font-bold text-gray-900 dark:text-white 
                     cursor-pointer hover:text-blue-600 dark:hover:text-blue-400
                     transition-all duration-300 line-clamp-2
                     group-hover:translate-x-1"
        >
          {postlist.name}
        </h3>

        {/* Description */}
        {postlist.description && (
          <p
            className="text-sm text-gray-600 dark:text-gray-400 
                      line-clamp-2 leading-relaxed"
          >
            {postlist.description}
          </p>
        )}

        {/* Created Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <FaClock className="text-blue-500" />
          <span>Created {createdDate}</span>
        </div>

        {/* Action Buttons */}
        {isOwnProfile && (
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onEdit(postlist._id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3
                       rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-600 hover:to-indigo-600
                       text-white shadow-md hover:shadow-xl
                       transform hover:scale-105 active:scale-95
                       transition-all duration-300"
            >
              <FaEdit className="text-base" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onDelete(postlist._id, postlist.name)}
              disabled={deletingId === postlist._id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3
                       rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-red-500 to-pink-500
                       hover:from-red-600 hover:to-pink-600
                       text-white shadow-md hover:shadow-xl
                       transform hover:scale-105 active:scale-95
                       transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       disabled:transform-none"
            >
              {deletingId === postlist._id ? (
                <FaSpinner className="animate-spin text-base" />
              ) : (
                <>
                  <FaTrash className="text-base" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Animated Border Glow on Hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 
                   transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))",
          filter: "blur(20px)",
          zIndex: -1,
        }}
      />
    </div>
  );
};

/**
 * Component to display list of user's postlists
 */
const postlistList = ({ userId, isOwnProfile = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    postlists = [],
    status = "idle",
    error = null,
  } = useSelector((state) => state.postlist || {});

  const { isConnected } = useSelector((state) => state.socket || {});
  const [deletingId, setDeletingId] = useState(null);

  // Inject animations once on mount
  useEffect(() => {
    injectAnimations();
  }, []);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserpostlists(userId));
    }

    return () => {
      dispatch(clearpostlists());
    };
  }, [userId, dispatch]);

  const handleDeletepostlist = async (postlistId, postlistName) => {
    if (!window.confirm(`Delete "${postlistName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(postlistId);
      await dispatch(deletepostlist(postlistId)).unwrap();
      toast.success("postlist deleted successfully");
    } catch (error) {
      toast.error(error || "Failed to delete postlist");
    } finally {
      setDeletingId(null);
    }
  };

  const handlepostlistClick = (postlistId) => {
    navigate(`/postlist/${postlistId}`);
  };

  const handleCreateNew = () => {
    navigate("/postlists/create");
  };

  const handleEdit = (postlistId) => {
    navigate(`/postlist/${postlistId}/edit`);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <FaSpinner className="text-4xl text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Failed to Load postlists
          </h3>
          <p className="text-red-500 dark:text-red-400 mb-6">{error}</p>
          <button
            onClick={() => dispatch(fetchUserpostlists(userId))}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                     hover:from-blue-700 hover:to-indigo-700
                     text-white rounded-xl font-semibold
                     transform hover:scale-105 transition-all duration-300
                     shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (postlists.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-2xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
              <FaList className="text-6xl text-gray-400 dark:text-gray-600" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isOwnProfile ? "No postlists Yet" : "No Public postlists"}
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            {isOwnProfile
              ? "Create your first postlist to organize your favorite posts"
              : "This user hasn't created any public postlists yet"}
          </p>

          {isOwnProfile && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-3 px-8 py-4
                       bg-gradient-to-r from-blue-600 to-indigo-600
                       hover:from-blue-700 hover:to-indigo-700
                       text-white rounded-2xl font-bold text-lg
                       shadow-xl hover:shadow-2xl
                       transform hover:scale-105 active:scale-95
                       transition-all duration-300"
            >
              <FaPlus className="text-xl" />
              Create Your First postlist
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            postlists
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              {postlists.length}{" "}
              {postlists.length === 1 ? "postlist" : "postlists"}
            </span>
            {isConnected && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {isOwnProfile && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-6 py-3
                     bg-gradient-to-r from-blue-600 to-indigo-600
                     hover:from-blue-700 hover:to-indigo-700
                     text-white rounded-xl font-semibold
                     shadow-lg hover:shadow-xl
                     transform hover:scale-105 active:scale-95
                     transition-all duration-300"
          >
            <FaPlus />
            New postlist
          </button>
        )}
      </div>

      {/* postlists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {postlists.map((postlist) => {
          if (!postlist?._id) return null;

          return (
            <postlistCard
              key={postlist._id}
              postlist={postlist}
              isOwnProfile={isOwnProfile}
              deletingId={deletingId}
              onDelete={handleDeletepostlist}
              onClick={handlepostlistClick}
              onEdit={handleEdit}
            />
          );
        })}
      </div>
    </div>
  );
};

export default postlistList;
