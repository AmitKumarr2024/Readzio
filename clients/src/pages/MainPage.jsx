import React, { useEffect, useLayoutEffect } from "react";
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

  // Fetch posts on mount
  useEffect(() => {
    try {
      if (!authLoading) {
        if (isAuthenticated) {
          dispatch(getAllPosts({ page: 1, limit: 12 }));
        } else {
          dispatch(fetchPublicPosts({ page: 1, limit: 12 }));
        }
      }
    } catch (e) {
      console.error("[MainPage] Fetch error:", e);
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // Handle mobile resize
  useLayoutEffect(() => {
    const handleResize = () => {
      dispatch(setIsMobile(window.innerWidth < 1024));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // Disable scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow =
      isMobile && isSidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <HeroSection />

      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-6 py-4">
        <div className="flex justify-end py-2">
          {/* Floating Menu Button */}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className=" sidebar-toggle-btn fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg 
             bg-background-light dark:bg-background-dark 
             text-text-main-light dark:text-text-main-dark 
             hover:bg-indigo-500 hover:text-white 
             transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="flex flex-row gap-2">
          <div className="flex-2 w-full">
            {authLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="h-48" />
                ))}
              </div>
            ) : isAuthenticated ? (
              <TabbedPostSection
                user={user}
                posts={authPosts}
                loading={authPostLoading}
              />
            ) : guestLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="h-48" />
                ))}
              </div>
            ) : (
              <GuestPostView posts={guestPosts} loading={guestLoading} />
            )}
          </div>

          {isSidebarOpen && (
            <aside
              className={`fixed top-0 right-0 h-full min-w-[400px] md:w-96 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out
              ${isMobile ? "translate-x-0" : ""}
              lg:static lg:z-auto lg:shadow-none lg:w-96`}
            >
              <RightSideBox
                user={user}
                toggleSidebar={() => dispatch(toggleSidebar())}
              />
            </aside>
          )}
        </div>

        {!isAuthenticated && !authLoading && guestError && (
          <div className="text-center text-red-500 py-4">
            <p>{guestError}</p>
            <button
              onClick={() =>
                dispatch(
                  fetchPublicPosts({
                    page: 1,
                    limit: 12,
                  })
                )
              }
              className="ml-2 text-blue-500 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 transition-opacity duration-300"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Close Sidebar"
        />
      )}
      {/* <FloatAd /> */}
    </div>
  );
};

export default MainPage;
