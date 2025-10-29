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
} from "react-icons/fa";
import { fetchPlaylistById, deletePlaylist } from "../../store/playlistSlice";
import { toast } from "react-hot-toast";

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
      navigate("/user/playlists");
    } catch (error) {
      toast.error("Failed to delete playlist");
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          onClick={() => navigate("/user/playlists")}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const isOwner = user?._id === currentPlaylist.user?._id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <FaList className="text-2xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentPlaylist.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentPlaylist.description || "No description"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {currentPlaylist.isPrivate ? (
                <>
                  <FaLock className="text-red-500" />
                  Private
                </>
              ) : (
                <>
                  <FaGlobe className="text-green-500" />
                  Public
                </>
              )}
              {isConnected && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              <span>• {currentPlaylist.posts?.length || 0} posts</span>
              <span>
                • Created{" "}
                {new Date(currentPlaylist.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FaEdit />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaTrash />
                )}
                Delete
              </button>
            </>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <FaShare />
            Share
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      {currentPlaylist.posts && currentPlaylist.posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPlaylist.posts.map((post) => {
            const fullPost = postMap.get(post._id);
            const postSlug = fullPost?.slug || post._id;
            return (
              <div
                key={post._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <img
                  src={
                    post.coverImage ||
                    fullPost?.coverImage ||
                    "/default-cover.jpg"
                  }
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {post.excerpt || fullPost?.excerpt}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <Link
                      to={`/post/${postSlug}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Read →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <FaList className="mx-auto text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No posts in this playlist yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Add some posts to get started.
          </p>
          {isOwner && (
            <button
              onClick={() => navigate("/search")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaPlus />
              Find Posts
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;
