// clients/src/components/Playlist/PlaylistDetail.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaList,
  FaEdit,
  FaTrash,
  FaShare,
  FaSpinner,
  FaGlobe,
  FaLock,
  FaPlus,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";
import {
  fetchPlaylistById,
  deletePlaylist,
  updatePlaylist,
} from "../../store/playlistSlice";
import { toast } from "react-hot-toast";
import CardOfPost from "../../components/Cards/CardOfPost";

/**
 * Component to display details of a single playlist
 * Used in PlaylistPage
 */
const PlaylistDetail = ({ playlistId }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentPlaylist, currentPlaylistStatus, currentPlaylistError } =
    useSelector((state) => state.playlist);
  const { user } = useSelector((state) => state.auth);
  const { isConnected } = useSelector((state) => state.socket || {});
  const {
    posts,
    publicPosts,
    followingPosts,
    latestPosts,
    trendingPosts,
    searchPosts,
  } = useSelector((state) => state.post);
  const [deleting, setDeleting] = useState(false);
  const [removingPostId, setRemovingPostId] = useState(null);

  const actualId = playlistId || id;

  const allPosts = useMemo(
    () => [
      ...posts,
      ...publicPosts,
      ...followingPosts,
      ...latestPosts,
      ...trendingPosts,
      ...searchPosts,
    ],
    [
      posts,
      publicPosts,
      followingPosts,
      latestPosts,
      trendingPosts,
      searchPosts,
    ]
  );

  const postMap = useMemo(
    () => new Map(allPosts.map((p) => [p._id, p])),
    [allPosts]
  );

  useEffect(() => {
    if (actualId) {
      dispatch(fetchPlaylistById(actualId));
    }
  }, [actualId, dispatch]);

  const handleRemovePost = async (postId) => {
    if (!window.confirm("Remove this post from the playlist?")) return;

    try {
      setRemovingPostId(postId);

      // Filter out the post to remove
      const updatedPosts = currentPlaylist.posts
        .filter((post) => post._id !== postId)
        .map((post) => post._id);

      // Update the playlist
      await dispatch(
        updatePlaylist({
          playlistId: actualId,
          updates: {
            name: currentPlaylist.name,
            description: currentPlaylist.description,
            isPrivate: currentPlaylist.isPrivate,
            posts: updatedPosts,
          },
        })
      ).unwrap();

      toast.success("Post removed from playlist");

      // Refresh the playlist
      dispatch(fetchPlaylistById(actualId));
    } catch (error) {
      toast.error("Failed to remove post");
      console.error("Remove post error:", error);
    } finally {
      setRemovingPostId(null);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete "${currentPlaylist?.name}"? This cannot be undone.`
      )
    )
      return;

    try {
      setDeleting(true);
      await dispatch(deletePlaylist(actualId)).unwrap();
      toast.success("Playlist deleted successfully");
      navigate("/profile/playlists");
    } catch (error) {
      toast.error("Failed to delete Playlist");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/playlist/${actualId}/edit`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/playlist/${actualId}`;
    navigator.clipboard.writeText(url);
    toast.success("Playlist link copied!");
  };

  if (currentPlaylistStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-blue-500" />
      </div>
    );
  }

  if (currentPlaylistStatus === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">
          {currentPlaylistError}
        </p>
        <button
          onClick={() => dispatch(fetchPlaylistById(actualId))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!currentPlaylist) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Playlist Not Found</h3>
        <button
          onClick={() => navigate("/profile/playlists")}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const isOwner = user?._id === currentPlaylist.user?._id;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div className="flex items-start gap-4 w-full lg:w-auto">
          <button
            onClick={() => navigate("/profile/playlists")}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:scale-110 transform duration-200"
            aria-label="Back to playlists"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <div className="relative h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <FaList className="text-2xl text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {currentPlaylist.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {currentPlaylist.description || "No description"}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              {currentPlaylist.isPrivate ? (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <FaLock className="text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Private
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                  <FaGlobe className="text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Public
                  </span>
                </span>
              )}
              {isConnected && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 dark:text-green-400">
                    Live
                  </span>
                </span>
              )}
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                {currentPlaylist.posts?.length || 0} posts
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                Created{" "}
                {new Date(currentPlaylist.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {isOwner && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105 flex-1 lg:flex-initial"
              >
                <FaEdit />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex-1 lg:flex-initial"
              >
                {deleting ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaTrash />
                )}
                <span>Delete</span>
              </button>
            </>
          )}
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-lg hover:scale-105 flex-1 lg:flex-initial"
          >
            <FaShare />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Posts Grid - Fixed Card Width */}
      {currentPlaylist.posts && currentPlaylist.posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentPlaylist.posts.map((post, index) => {
            const fullPost = postMap.get(post._id) || post;

            return (
              <div
                key={fullPost._id}
                className="w-full max-w-sm mx-auto animate-fadeIn relative group"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Remove Button - Only visible to owner */}
                {isOwner && (
                  <button
                    onClick={() => handleRemovePost(fullPost._id)}
                    disabled={removingPostId === fullPost._id}
                    className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from playlist"
                  >
                    {removingPostId === fullPost._id ? (
                      <FaSpinner className="animate-spin text-sm" />
                    ) : (
                      <FaTimes className="text-sm" />
                    )}
                  </button>
                )}

                <div className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <CardOfPost {...fullPost} loading={false} categoryMap={{}} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 animate-fadeIn">
          <div className="mb-4 transform hover:scale-110 transition-transform duration-300 inline-block">
            <FaList className="mx-auto text-6xl text-gray-300 dark:text-gray-700" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No posts in this Playlist yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Add some posts to get started.
          </p>
          {isOwner && (
            <button
              onClick={() => navigate("/search")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
            >
              <FaPlus />
              <span>Find Posts</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;
