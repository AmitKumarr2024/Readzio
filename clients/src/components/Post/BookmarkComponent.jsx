import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchBookmarkedPosts, togglePostBookmark } from '../../store/Post interactions';

const BookmarkComponent = () => {
  const dispatch = useDispatch();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { bookmarkedPosts, loading, error } = useSelector((state) => state.postInteraction);

  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(fetchBookmarkedPosts());
    }
  }, [dispatch, isAuthenticated, user]);

  const handleBookmarkToggle = async (postId) => {
    try {
      await dispatch(togglePostBookmark(postId));
      dispatch(fetchBookmarkedPosts());
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <p className="p-4 text-red-500">
        Please log in to view your bookmarked posts.
      </p>
    );
  }

  return (
    <div className="p-4 max-w-8xl h-screen mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <h2 className="text-2xl font-bold mb-4">Your Bookmarked Posts</h2>

      {loading && <p>Loading bookmarks...</p>}
      {error && (
        <p className="text-red-500">
          {typeof error === 'object' ? error.message || 'Failed to load bookmarks' : error}
        </p>
      )}

      <div className="grid gap-4">
        {bookmarkedPosts && bookmarkedPosts.length > 0 ? (
          bookmarkedPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 border rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {post.slug ? (
                <Link to={`/post/${post.slug}`}>
                  <h3 className="text-lg font-semibold hover:text-blue-600">
                    {post.title || 'Untitled Post'}
                  </h3>
                  <p className=" text-text-main-light dark:text-text-main-dark">
                    {post.excerpt?.substring(0, 100) || 'No excerpt available'}...
                  </p>
                </Link>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold">
                    {post.title || 'Untitled Post'}
                  </h3>
                  <p className="text-gray-500">Post unavailable</p>
                </div>
              )}
              <button
                onClick={() => handleBookmarkToggle(post._id)}
                className="mt-3 px-4 py-2 text-sm bg-blue-500  text-text-main-light dark:text-text-main-dark rounded hover:bg-blue-600"
              >
                Remove Bookmark
              </button>
            </div>
          ))
        ) : (
          <p>No bookmarked posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default BookmarkComponent;