import React, { useEffect, useLayoutEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X } from "lucide-react";
import { toggleSidebar, setIsMobile } from "../store/Post/postMetaSlice";
import { fetchPublicPosts } from "../store/guestSlice";
import { getAllPosts } from "../store/postSlice";

import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBar/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";
import GuestPostView from "../components/GuestMainScreen/GuestPostView";
import Skeleton from "../components/Ui/Skeleton";
// import FloatAd from "../Ads/FloatAd";

const MainPage = () => {
  const dispatch = useDispatch();

  const {
    isAuthenticated,
    user,
    loading: authLoading,
  } = useSelector((state) => state.auth);

  const {
    posts: guestPosts = [],
    loading: guestLoading,
    error: guestError,
  } = useSelector((state) => state.guest || {});

  const { posts: authPosts = [], loading: authPostLoading } = useSelector(
    (state) => state.post || {}
  );

  const { isSidebarOpen, isMobile } = useSelector((state) => state.postMeta);

  // Memoized callback for sidebar toggle
  const handleToggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  // Memoized callback for retry
  const handleRetry = useCallback(() => {
    dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
  }, [dispatch]);

  // Handle tab changes for TabbedPostSection
  const handleTabChange = useCallback((tab) => {
    // You can implement specific logic for different tabs here
    console.log(`Tab changed to: ${tab}`);
    // Example: fetch different data based on tab
    // if (tab === "Following") {
    //   dispatch(getFollowingPosts());
    // } else if (tab === "My Posts") {
    //   dispatch(getMyPosts());
    // }
  }, []);

  // Fetch posts on mount
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!authLoading) {
          if (isAuthenticated) {
            dispatch(getAllPosts({ page: 1, limit: 12 }));
          } else {
            dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
          }
        }
      } catch (error) {
        console.error("[MainPage] Fetch error:", error);
      }
    };

    fetchPosts();
  }, [dispatch, isAuthenticated, authLoading]);

  // Handle mobile resize with debounce
  useLayoutEffect(() => {
    let timeoutId;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dispatch(setIsMobile(window.innerWidth < 1024));
      }, 100);
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [dispatch]);

  // Disable scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = "hidden";
      // Prevent scrolling on mobile
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
    };
  }, [isMobile, isSidebarOpen]);

  // Loading skeleton component
  const LoadingSkeleton = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
        </div>
      ))}
    </div>
  );

  // Error component
  const ErrorMessage = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
        <div className="text-red-600 dark:text-red-400 text-lg font-medium mb-2">
          Something went wrong
        </div>
        <p className="text-red-500 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 text-text-main-light dark:text-text-main-dark transition-colors duration-300">
      {/* Hero Section */}
      <HeroSection />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Floating Menu Button */}
        <button
          onClick={handleToggleSidebar}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl
                   bg-white dark:bg-gray-800 
                   text-gray-700 dark:text-gray-200 
                   hover:bg-indigo-500 hover:text-white 
                   border border-gray-200 dark:border-gray-600
                   transition-all duration-300 transform hover:scale-105
                   focus:outline-none focus:ring-4 focus:ring-indigo-500/50
                   backdrop-blur-sm"
          aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
          <div className="relative">
            <Menu
              className={`w-6 h-6 transition-all duration-300 ${
                isSidebarOpen ? "rotate-180 opacity-0" : "rotate-0 opacity-100"
              }`}
            />
            <X
              className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${
                isSidebarOpen ? "rotate-0 opacity-100" : "rotate-180 opacity-0"
              }`}
            />
          </div>
        </button>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Loading State */}
            {authLoading && <LoadingSkeleton />}

            {/* Authenticated User Content */}
            {!authLoading && isAuthenticated && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TabbedPostSection
                  user={user}
                  posts={authPosts}
                  loading={authPostLoading}
                  onTabChange={handleTabChange}
                />
              </div>
            )}

            {/* Guest Content */}
            {!authLoading && !isAuthenticated && (
              <>
                {guestLoading && <LoadingSkeleton />}
                {!guestLoading && !guestError && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <GuestPostView posts={guestPosts} loading={guestLoading} />
                  </div>
                )}
                {guestError && (
                  <ErrorMessage error={guestError} onRetry={handleRetry} />
                )}
              </>
            )}
          </main>

          {/* Sidebar */}
          <aside
            className={`
              fixed top-0 right-0 h-full w-full max-w-md z-40
              bg-white dark:bg-gray-800 
              shadow-2xl border-l border-gray-200 dark:border-gray-700
              transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
              lg:static lg:transform-none lg:shadow-lg lg:rounded-xl
              lg:w-80 lg:max-h-[calc(100vh-2rem)]  lg:top-4
              overflow-y-auto
            `}
          >
            <div className="h-full">
              <RightSideBox user={user} toggleSidebar={handleToggleSidebar} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={handleToggleSidebar}
          aria-label="Close Sidebar"
        />
      )}

      {/* Optional Float Ad */}
      {/* <FloatAd /> */}
    </div>
  );
};

export default MainPage;
