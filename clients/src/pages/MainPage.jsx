import React, { useEffect, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { toggleSidebar, setIsMobile } from "../store/Post/postMetaSlice";
import { fetchPublicPosts } from "../store/guestSlice";
import { getAllPosts } from "../store/postSlice";

import HeroSection from "../components/HeroSection";
import RightSideBox from "../components/RightSideBar/RightSideBox";
import TabbedPostSection from "../components/Tabs/TabbedPostSection";
import GuestPostView from "../components/GuestMainScreen/GuestPostView";
import Skeleton from "../components/Ui/Skeleton";

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

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        dispatch(getAllPosts({ page: 1, limit: 12 }));
      } else {
        dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
      }
    }
  }, [dispatch, isAuthenticated, authLoading]);

  useLayoutEffect(() => {
    const handleResize = () => dispatch(setIsMobile(window.innerWidth < 1024));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  useEffect(() => {
    document.body.style.overflow =
      isMobile && isSidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-text-main-dark">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Top Controls */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-dark hover:bg-indigo-500 hover:text-white transition-colors duration-300 shadow-sm"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left/Main Content */}
          <div className="flex-1 min-w-0">
            {authLoading || guestLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="h-56" />
                ))}
              </div>
            ) : isAuthenticated ? (
              <TabbedPostSection
                user={user}
                posts={authPosts}
                loading={authPostLoading}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <GuestPostView posts={guestPosts} loading={guestLoading} />
              </motion.div>
            )}
          </div>

          {/* Right Sidebar */}
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ duration: 0.3 }}
              className={`lg:w-96 w-full lg:static fixed top-0 right-0 h-full bg-white dark:bg-background-dark shadow-lg z-50 overflow-y-auto`}
            >
              <RightSideBox
                user={user}
                toggleSidebar={() => dispatch(toggleSidebar())}
              />
            </motion.aside>
          )}
        </div>

        {/* Error State */}
        {!isAuthenticated && !authLoading && guestError && (
          <div className="text-center text-red-500 py-4">
            <p>{guestError}</p>
            <button
              onClick={() => dispatch(fetchPublicPosts({ page: 1, limit: 12 }))}
              className="ml-2 text-blue-500 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Close Sidebar"
        />
      )}
    </div>
  );
};

export default MainPage;
