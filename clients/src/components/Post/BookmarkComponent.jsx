import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchBookmarkedPosts, togglePostBookmark } from '../../store/PostInteractions';

// Component for displaying and managing bookmarked posts
const BookmarkComponent = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { bookmarkedPosts, loading, error } = useSelector((state) => state.postInteraction);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('bookmarks');

  // Fetch bookmarked posts on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(fetchBookmarkedPosts());
    }
  }, [dispatch, isAuthenticated, user]);

  // Handle toggling bookmark for a post
  const handleBookmarkToggle = async (postId) => {
    try {
      await dispatch(togglePostBookmark(postId));
      dispatch(fetchBookmarkedPosts());
    } catch (err) {
      error.error('Error toggling bookmark:', err);
    }
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Return login prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4">
        <p className="text-red-500">Please log in to view your bookmarked posts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {/* Sidebar for navigation */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-background-light dark:bg-background-dark shadow-md transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out md:w-1/4 p-6 md:p-8 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Menu</h2>
          <button
            className="md:hidden text-text-main-light dark:text-text-main-dark"
            onClick={toggleSidebar}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-2">
          <button
            className={`w-full text-left px-4 py-2 rounded-lg ${
              activeSection === "bookmarks"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => setActiveSection("bookmarks")}
          >
            Bookmarked Posts
          </button>
        </nav>
      </div>

      {/* Main content area for bookmarked posts */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Bookmarked Posts</h2>
          <button
            className="md:hidden text-text-main-light dark:text-text-main-dark"
            onClick={toggleSidebar}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Display loading state */}
        {loading && <p>Loading bookmarks...</p>}
        {/* Display error if present */}
        {error && (
          <p className="text-red-500">
            {typeof error === 'object' ? error.message || 'Failed to load bookmarks' : error}
          </p>
        )}

        <div className="grid gap-4 max-h-[calc(100vh-200px)] px-10 overflow-y-auto">
          {bookmarkedPosts && bookmarkedPosts.length > 0 ? (
            bookmarkedPosts.map((post) => (
              <div
                key={post._id}
                className="p-4  rounded-sm shadow-2xl hover:shadow-xl transition-shadow bg-background-light dark:bg-background-dark"
              >
                {post.slug ? (
                  <Link to={`/post/${post.slug}`}>
                    <h3 className="text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400">
                      {post.title || 'Untitled Post'}
                    </h3>
                    <p className="text-text-main-light dark:text-text-main-dark">
                      {post.excerpt?.substring(0, 100) || 'No excerpt available'}...
                    </p>
                  </Link>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold">{post.title || 'Untitled Post'}</h3>
                    <p className="text-gray-500 dark:text-gray-400">Post unavailable</p>
                  </div>
                )}
                <button
                  onClick={() => handleBookmarkToggle(post._id)}
                  className="mt-3 px-4 py-2 text-sm bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition"
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
    </div>
  );
};

export default BookmarkComponent;